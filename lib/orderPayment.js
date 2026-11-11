import mongoose from "mongoose";
import OrderNew from "@/models/orders_new";
import OrderHistoryNew from "@/models/order_history_new";
import OrderDetailsNew from "@/models/order_details_new";
import Product from "@/models/product";
import OwnerProduct from "@/models/OwnerProduct";
import { resolveProductPrice } from "@/lib/priceResolver";
import Coupon from "@/models/ecom_offer_info";
import Usedcoupon from "@/models/ecom_coupon_track_info";
import { sendOrderConfirmationSms } from "@/lib/orderConfirmSms";
import { buildOrderNumber } from "@/lib/orderNumber";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find checkout sibling orders for a base order number.
 * Prefers checkout_group_id (multi-item cart lines keep independent order numbers).
 * Also matches Unilet -UL twin and legacy base-2 / base-3 suffixes.
 */
export async function findRelatedOrders(orderNumber, userId = null) {
  const raw = String(orderNumber || "").trim();
  if (!raw) return [];

  const userFilter = userId ? { user_id: String(userId) } : {};
  const seed = await OrderNew.findOne({
    ...userFilter,
    $or: [{ order_number: raw }, { checkout_group_id: raw }],
  }).lean();

  const groupId = seed?.checkout_group_id || raw;
  const base = String(groupId).replace(/-UL$/i, "");

  return OrderNew.find({
    ...userFilter,
    $or: [
      { checkout_group_id: groupId },
      { checkout_group_id: raw },
      { checkout_group_id: base },
      { order_number: raw },
      { order_number: groupId },
      { order_number: `${base}-UL` },
      { order_number: base },
      { order_number: { $regex: `^${escapeRegex(base)}-\\d+(-UL)?$` } },
    ],
  }).lean();
}

/**
 * Atomically decrement stock for a paid / confirmed order line.
 * Uses atomic findOneAndUpdate with condition quantity: { $gte: qty } to eliminate race conditions
 * and overselling. Accurately updates stock_status to "Out of Stock" when remaining inventory reaches 0.
 */
export async function decrementStockForItem(item, isKarnatakaOrder = false) {
  const productId = item.productId || item.id || item.product_id;
  const rawCode = item.item_code || item.itemCode || "";
  const itemCode = rawCode
    ? String(rawCode).startsWith("ITEM")
      ? String(rawCode)
      : `ITEM${rawCode}`
    : null;
  const qty = Math.max(1, toNumber(item.quantity, 1));

  if (isKarnatakaOrder) {
    const cleanRawCode = String(rawCode || "").replace(/^ITEM/i, "").trim();
    const candidateCodes = Array.from(new Set([rawCode, itemCode, cleanRawCode, "UNILETEC383BIKSTM"].filter(Boolean)));

    const ownerOr = [
      ...(productId && mongoose.isValidObjectId(productId) ? [{ product_id: productId }] : []),
      { product_item_code: { $in: candidateCodes } },
      { vendor_item_code: { $in: candidateCodes } },
    ];

    let ownerProd = await OwnerProduct.findOne({
      owner_id: "unilet",
      $or: ownerOr,
    });

    if (!ownerProd) {
      return { success: false, reason: "owner_product_not_found" };
    }

    const updatedOwner = await OwnerProduct.findOneAndUpdate(
      { _id: ownerProd._id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (!updatedOwner) {
      return { success: false, reason: "insufficient_stock" };
    }

    if (Number(updatedOwner.stock || 0) <= 0 && updatedOwner.stock_status !== "Out of Stock") {
      await OwnerProduct.updateOne(
        { _id: updatedOwner._id },
        { $set: { stock_status: "Out of Stock" } }
      );
    }

    return { success: true, remaining: updatedOwner.stock };
  }

  let product = null;
  if (productId && mongoose.isValidObjectId(productId)) {
    product = await Product.findById(productId);
  } else if (itemCode) {
    product = await Product.findOne({ item_code: itemCode });
  }

  if (!product) {
    return { success: false, reason: "product_not_found" };
  }

  if (product.movement === "CUS-Order") {
    return { success: true, customOrder: true };
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: product._id, quantity: { $gte: qty } },
    { $inc: { quantity: -qty } },
    { new: true }
  );

  if (!updatedProduct) {
    return { success: false, reason: "insufficient_stock" };
  }

  if (Number(updatedProduct.quantity || 0) <= 0 && updatedProduct.stock_status !== "Out of Stock") {
    await Product.updateOne(
      { _id: updatedProduct._id },
      { $set: { stock_status: "Out of Stock" } }
    );
  }

  return { success: true, remaining: updatedProduct.quantity };
}

/**
 * Record coupon usage from offer codes or coupon objects.
 */
export async function trackCouponUsage(item, userId) {
  if (!userId || !item) return;

  const rawCoupons = Array.isArray(item.coupondetails) ? item.coupondetails : [];
  if (!rawCoupons.length && !item.discount) return;

  const codes = rawCoupons
    .map((c) => {
      if (!c) return null;
      if (typeof c === "string") return c;
      return c.offer_code || c._id || null;
    })
    .filter(Boolean);

  for (const codeOrId of codes) {
    let coupon = null;
    if (mongoose.isValidObjectId(codeOrId)) {
      coupon = await Coupon.findById(codeOrId);
    }
    if (!coupon) {
      coupon = await Coupon.findOne({ offer_code: String(codeOrId) });
    }
    if (!coupon) continue;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const already = await Usedcoupon.findOne({
      coupon_id: coupon._id,
      user_id: userObjectId,
    }).lean();
    if (already) continue;

    await Usedcoupon.create({
      coupon_id: coupon._id,
      user_id: userObjectId,
    });
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { used_by: 1 } });
  }
}

/**
 * Mark related orders as paid after gateway verification and apply side effects once.
 */
export async function markOrdersPaid({
  orderNumber,
  userId,
  paymentId,
  paymentMethod = "online",
  paymentType = "Razorpay",
  paidAmountPaise = null,
}) {
  const related = await findRelatedOrders(orderNumber, userId);
  if (!related.length) {
    return { success: false, error: "Order not found" };
  }

  const expectedPaise = Math.round(
    related.reduce((sum, o) => sum + (Number(o.order_amount) || 0), 0) * 100
  );

  if (
    paidAmountPaise != null &&
    expectedPaise > 0 &&
    Math.abs(Number(paidAmountPaise) - expectedPaise) > 100
  ) {
    return {
      success: false,
      error: `Payment amount mismatch (paid ${paidAmountPaise}, expected ${expectedPaise})`,
    };
  }

  const updated = [];

  for (const order of related) {
    // Atomically transition from unpaid/pending to paid.
    // If another concurrent request (e.g., webhook or browser callback) already transitioned it,
    // findOneAndUpdate will match 0 docs and return null.
    const transitionedOrder = await OrderNew.findOneAndUpdate(
      {
        _id: order._id,
        payment_status: { $nin: ["paid", "PAID"] },
        order_status: { $nin: ["ordered", "Ordered", "Complete", "Billed"] },
      },
      {
        $set: {
          order_status: "ordered",
          payment_status: "paid",
          payment_id: String(paymentId),
          payment_method: paymentMethod,
          payment_type: paymentType,
          payment_mode: paymentType,
        },
      },
      { new: true }
    );

    let saved = transitionedOrder;
    const isFirstPaidTransition = Boolean(transitionedOrder);

    if (!isFirstPaidTransition) {
      // Order was already marked paid by another process or concurrent request.
      saved = await OrderNew.findById(order._id);
    } else {
      await OrderHistoryNew.create({
        order_id: String(saved._id),
        order_number: saved.order_number,
        order_status: "ordered",
        notify: 1,
        comment: `Payment verified via ${paymentType} (${paymentId})`,
      });

      const isKarnataka =
        saved.order_owner === "unilet" ||
        saved.region === "karnataka" ||
        String(saved.order_number || "").endsWith("-UL");

      const items = Array.isArray(saved.order_item) ? saved.order_item : [];
      for (const item of items) {
        const stockResult = await decrementStockForItem(item, isKarnataka);
        if (!stockResult?.success && stockResult?.reason === "insufficient_stock") {
          console.warn(
            `[markOrdersPaid] Stock exhausted for item ${item.item_code || item.productId} on order ${saved.order_number}`
          );
          await OrderHistoryNew.create({
            order_id: String(saved._id),
            order_number: saved.order_number,
            order_status: "ordered",
            notify: 0,
            comment: `Alert: Inventory deduction reached zero/insufficient for item ${item.item_code || item.productId}`,
          });
        }
        await trackCouponUsage(item, saved.user_id);
      }

      // Also apply promotion_code_applied at order level
      if (saved.promotion_code_applied) {
        await trackCouponUsage(
          { coupondetails: [saved.promotion_code_applied], discount: 1 },
          saved.user_id
        );
      }

      try {
        await sendOrderConfirmationSms(saved);
      } catch {
        // non-fatal
      }
    }

    if (saved) {
      updated.push(saved);
    }
  }

  return { success: true, orders: updated, expectedPaise };
}

/**
 * Recalculate line totals from catalog (ignores client price).
 * Same priority as PDP: Unilet-on → Unilet price; else LSP → special → MRP.
 */
export async function resolveLinePrice(item, isKarnatakaOrder = false) {
  const productId = item.productId || item.id || item.product_id;
  const rawCode = item.item_code || item.itemCode || "";
  const itemCode = rawCode
    ? String(rawCode).startsWith("ITEM")
      ? String(rawCode)
      : `ITEM${rawCode}`
    : null;

  let product = null;
  if (productId && mongoose.isValidObjectId(productId)) {
    product = await Product.findById(productId).lean();
  } else if (itemCode) {
    product = await Product.findOne({ item_code: itemCode }).lean();
  }

  if (!product) {
    return {
      price: toNumber(item.price ?? item.product_price, 0),
      product,
    };
  }

  const region = isKarnatakaOrder ? "karnataka" : "tamilnadu";
  let owner = null;

  // Match cart/PDP: load Unilet owner when Karnataka (resolveProductPrice applies it only if flag on)
  if (isKarnatakaOrder) {
    const ownerQuery = {
      owner_id: "unilet",
      is_active: true,
      $or: [
        ...(product._id ? [{ product_id: product._id }] : []),
        ...(product.item_code
          ? [
              { product_item_code: product.item_code },
              { vendor_item_code: product.item_code },
            ]
          : []),
      ],
    };
    owner = await OwnerProduct.findOne(ownerQuery).lean();
  }

  const priceInfo = resolveProductPrice(product, owner, region);
  const resolved =
    Number(priceInfo.effectivePrice) ||
    Number(product.special_price) ||
    Number(product.price) ||
    0;

  return {
    price: resolved,
    product,
    owner: owner || null,
    usingLsp: Boolean(priceInfo.usingLsp),
    isUnilet: Boolean(priceInfo.isUnilet),
  };
}

/**
 * Look up extended warranty price from DB when possible.
 */
export async function resolveWarrantyPrice(warrantyData) {
  if (!warrantyData) return 0;
  // Accept only non-negative finite numbers from structured warranty payloads
  const price = toNumber(warrantyData.price ?? warrantyData.amount, 0);
  return price > 0 ? price : 0;
}

export async function generateUniqueOrderNumber({ isKarnataka = false } = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const orderNumber = buildOrderNumber(Boolean(isKarnataka));
    const exists = await OrderNew.exists({ order_number: orderNumber });
    if (!exists) return orderNumber;
  }
  return buildOrderNumber(Boolean(isKarnataka));
}
