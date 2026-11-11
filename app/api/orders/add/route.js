import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import OrderHistoryNew from "@/models/order_history_new";
import PaymentNewLive from "@/models/payment_new_live";
import Product from "@/models/product";
import OwnerProduct from "@/models/OwnerProduct";
import mongoose from "mongoose";
import Notification from "@/models/Notification.js";
import { sendOrderData } from "@/lib/sendOrderData";
import { sendOrderConfirmationSms } from "@/lib/orderConfirmSms";
import { isKarnatakaPincode } from "@/lib/regionHelper";
import { getAuthUserId } from "@/lib/authRequest";
import { isInvenzoServiceEnabled } from "@/lib/invenzo";
import { orderPlacedToStoreInvenzo } from "@/lib/invenzoOrderPlace";
import {
  generateUniqueOrderNumber,
  resolveLinePrice,
  resolveWarrantyPrice,
  trackCouponUsage,
  decrementStockForItem,
} from "@/lib/orderPayment";

const ORDER_STATUS_ENUM = [
  "Billed",
  "Cancelled",
  "Complete",
  "failure",
  "Order Accepted",
  "Order Placed",
  "ordered",
  "Payment Initiated",
  "pending",
];

function mapDeliveryType(value) {
  if (value === "store_pickup" || value === "store") return "store";
  return "home";
}

function mapOrderStatus(value, payment_status) {
  const paymentKey = String(payment_status || "").toLowerCase().replace(/[_-]+/g, " ").trim();
  if (paymentKey === "payment initialized" || paymentKey === "payment initiated") {
    return "Payment Initiated";
  }
  if (value && ORDER_STATUS_ENUM.includes(value)) return value;
  if (String(value || "").toLowerCase().replace(/[_-]+/g, " ").trim() === "payment initialized") {
    return "Payment Initiated";
  }
  return "pending";
}

function toObjectId(value) {
  if (!value) return null;
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function stringify(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveItemWarrantyAmount(item) {
  const fromData =
    toNumber(item?.warrantyData?.price, 0) ||
    toNumber(item?.warrantyData?.amount, 0) ||
    0;
  if (fromData > 0) return fromData;
  const extended = toNumber(item?.extendedWarranty, 0) || 0;
  if (extended > 0) return extended;
  // Align with cart: warranty > 10 is a price; smaller values are years, not ₹
  const legacy = toNumber(item?.warranty, 0) || 0;
  return legacy > 10 ? legacy : 0;
}

function resolveExchangeAmount(item) {
  return (
    toNumber(item?.exchangeOffer?.price, 0) ||
    toNumber(item?.exchange_off_amount, 0) ||
    toNumber(item?.eo_amount, 0) ||
    0
  );
}

function lineAmount(item) {
  const price = toNumber(item.price ?? item.product_price, 0) || 0;
  const qty = toNumber(item.quantity, 1) || 1;
  const discount = toNumber(item.discount, 0) || 0;
  const warranty = resolveItemWarrantyAmount(item);
  const exchange = resolveExchangeAmount(item) * qty;
  const total = price * qty - discount + warranty - exchange;
  return Number.isFinite(total) && total > 0 ? total : Math.max(0, price * qty - exchange);
}

function buildOrderDetailRows(order_item, order_details, savedOrder, userId) {
  const items = Array.isArray(order_item) ? order_item : [];
  const details = Array.isArray(order_details) && order_details.length ? order_details : null;
  const source = details || items;

  return source.map((row, index) => {
    // Client order_details is often sparse — pull warranty/variants from full cart line
    const fromItem = items[index] || items[0] || {};
    const rawCode = row.item_code || row.itemCode || fromItem.item_code || fromItem.itemCode || "";
    const itemCode = rawCode
      ? (String(rawCode).startsWith("ITEM") ? String(rawCode) : `ITEM${rawCode}`)
      : null;
    const productId =
      row.product_id ?? row.productId ?? row.id ??
      fromItem.product_id ?? fromItem.productId ?? fromItem.id ?? null;
    const price = row.product_price ?? row.price ?? fromItem.product_price ?? fromItem.price ?? null;
    const warrantyData = row.warrantyData || fromItem.warrantyData || null;
    const variantValues =
      row.variantValues ||
      fromItem.variantValues ||
      row.selectedVariant ||
      fromItem.selectedVariant ||
      null;
    const color = row.color || fromItem.color || null;

    return {
      order_id: savedOrder._id,
      user_id: toObjectId(userId),
      item_code: itemCode,
      product_id: productId != null ? String(productId) : null,
      product_name: stringify(row.product_name || row.name || fromItem.name || fromItem.product_name),
      product_price: price != null ? String(price) : null,
      model: stringify(row.model || fromItem.model),
      quantity: toNumber(row.quantity ?? fromItem.quantity, 1),
      store_id: stringify(row.store_id || fromItem.store_id),
      orderNumber: stringify(savedOrder.order_number),
      coupon_discount: toNumber(row.coupon_discount ?? row.coupondiscount, 0),
      image: stringify(row.image || fromItem.image),
      discount: toNumber(row.discount ?? fromItem.discount),
      warrantyData,
      extendedWarranty:
        toNumber(row.extendedWarranty ?? fromItem.extendedWarranty, 0) ||
        toNumber(warrantyData?.price ?? warrantyData?.amount, 0) ||
        null,
      variantValues,
      selectedVariant: row.selectedVariant || fromItem.selectedVariant || variantValues || null,
      color: color != null ? String(color) : null,
      attributes: row.attributes || fromItem.attributes || null,
      coupondetails: row.coupondetails ?? fromItem.coupondetails ?? null,
      type: stringify(row.type || fromItem.type) || "online",
      is_exchange_offer: toNumber(
        row.is_exchange_offer ??
          fromItem.is_exchange_offer ??
          (fromItem.exchangeOffer?.price || row.exchangeOffer?.price ? 1 : 0),
        0
      ),
      eo_amount: toNumber(
        row.eo_amount ??
          fromItem.eo_amount ??
          row.exchange_off_amount ??
          fromItem.exchange_off_amount ??
          row.exchangeOffer?.price ??
          fromItem.exchangeOffer?.price,
        0
      ),
      exchange_off_type: stringify(
        row.exchange_off_type ||
          fromItem.exchange_off_type ||
          row.exchangeOffer?.type ||
          fromItem.exchangeOffer?.type
      ),
      exchange_off_brand: stringify(
        row.exchange_off_brand ||
          fromItem.exchange_off_brand ||
          row.exchangeOffer?.brand ||
          fromItem.exchangeOffer?.brand
      ),
      exchange_off_cond: stringify(
        row.exchange_off_cond ||
          fromItem.exchange_off_cond ||
          row.exchangeOffer?.condition ||
          fromItem.exchangeOffer?.condition
      ),
      exchange_off_pin: toNumber(
        row.exchange_off_pin ??
          fromItem.exchange_off_pin ??
          row.exchangeOffer?.zone ??
          fromItem.exchangeOffer?.zone,
        null
      ),
      exchange_off_amount: toNumber(
        row.exchange_off_amount ??
          fromItem.exchange_off_amount ??
          row.exchangeOffer?.price ??
          fromItem.exchangeOffer?.price,
        0
      ),
    };
  }).filter((row) => row.product_name || row.item_code || row.product_id);
}

/**
 * Side effects for confirmed (COD / pay-at-store) orders only.
 * Online gateway orders reduce stock after payment verification.
 */
async function applyItemSideEffects(item, user_id, isKarnatakaOrder = false) {
  await trackCouponUsage(item, user_id);
  await decrementStockForItem(item, isKarnatakaOrder);
}

async function saveOrderHistory(savedOrder) {
  const existingHistory = await OrderHistoryNew.countDocuments({
    $or: [
      { order_id: String(savedOrder._id) },
      { order_number: savedOrder.order_number },
    ],
  });
  if (existingHistory > 0) return;

  await OrderHistoryNew.create({
    order_id: String(savedOrder._id),
    order_number: stringify(savedOrder.order_number),
    order_status: stringify(savedOrder.order_status) || "pending",
    notify: 0,
    comment: "Order placed",
  });
}

export async function POST(req) {
  await dbConnect();

  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      user_id: bodyUserId,
      order_username,
      order_phonenumber,
      order_item,
      order_amount,
      order_deliveryaddress,
      customer_comments,
      payment_method,
      payment_type,
      order_status,
      delivery_type,
      payment_id,
      order_number,
      payment_status: clientPaymentStatus,
      user_adddeliveryid,
      email_address,
      loyalty_points_redeemed,
      loyalty_discount,
      loyalty_redemption_token,
      promotion_code_applied,
      promotion_discount_applied,
      pickup_store,
      store_id,
      gst_number,
      order_billingaddress,
      user_addbillingid,
      order_details,
      pickup_type,
      applied_payment_offer,
      appliedPaymentOffer,
    } = body;

    // Always bind order to the authenticated user
    const user_id = String(authUserId);
    if (bodyUserId && String(bodyUserId) !== user_id) {
      return Response.json(
        { success: false, message: "User mismatch" },
        { status: 403 }
      );
    }

    if (
      !email_address ||
      !order_phonenumber ||
      !order_item?.length
    ) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const mappedDeliveryEarly = mapDeliveryType(delivery_type);
    const pmKey = String(payment_method || payment_type || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();
    const isCod = pmKey === "cash on delivery" || pmKey === "cod";
    const isPayAtStore = pmKey === "pay at store" || pmKey === "pay_at_store";
    const isOfflineCheckout = isCod || isPayAtStore;
    const isEmi = pmKey === "emi";

    // COD is store-pickup only (server enforcement)
    if (isCod && mappedDeliveryEarly !== "store") {
      return Response.json(
        {
          success: false,
          message: "Cash on Delivery is only available for store pickup.",
        },
        { status: 400 }
      );
    }

    // Never trust browser "paid" for online payments
    let payment_status = clientPaymentStatus;
    if (!isOfflineCheckout) {
      const claimPaid =
        String(clientPaymentStatus || "").toLowerCase() === "paid" ||
        String(order_status || "").toLowerCase() === "ordered";
      if (claimPaid && String(payment_id || "").startsWith("pay_")) {
        // Razorpay verify/webhook already marks paid; allow sync of payment_id only
        payment_status = "paid";
      } else if (
        String(clientPaymentStatus || "").toLowerCase().includes("payment")
      ) {
        payment_status = "payment_initialized";
      } else {
        payment_status = "payment_initialized";
      }
    } else {
      payment_status = "pending";
    }

    const pinMatch = String(order_deliveryaddress || "").match(/\b\d{6}\b/);
    const hasKarnatakaPin = pinMatch
      ? isKarnatakaPincode(pinMatch[0])
      : body.pincode
      ? isKarnatakaPincode(body.pincode)
      : false;

    const isKarnatakaOrder =
      hasKarnatakaPin ||
      String(order_number || "").endsWith("-UL") ||
      /_UL_/i.test(String(order_number || "")) ||
      body.order_owner === "unilet" ||
      body.region === "karnataka" ||
      isKarnatakaPincode(body.pincode) ||
      /karnataka/i.test(order_deliveryaddress || "") ||
      /karnataka/i.test(body.region || "") ||
      /karnataka/i.test(body.pickup_store || "") ||
      (order_item &&
        order_item.some((item) => item.store_id === "unilet" || item.isUnilet)) ||
      store_id === "unilet";

    const resolvedRegion = isKarnatakaOrder
      ? "karnataka"
      : body.region || "tamilnadu";
    const resolvedStoreId = isKarnatakaOrder ? "unilet" : store_id || null;

    const mappedDelivery = mappedDeliveryEarly;
    let mappedStatus = mapOrderStatus(order_status, payment_status);
    if (!isOfflineCheckout && payment_status === "payment_initialized") {
      mappedStatus = "Payment Initiated";
    }
    if (isCod) {
      mappedStatus = "ordered";
    } else if (isPayAtStore) {
      mappedStatus = "pending";
    }
    // If Razorpay already verified, keep ordered/paid
    if (payment_status === "paid" && String(payment_id || "").startsWith("pay_")) {
      mappedStatus = "ordered";
    }

    let baseOrderNumber = stringify(order_number);
    // Prefer client number only when updating an existing initiated order
    const existingByClientNumber = baseOrderNumber
      ? await OrderNew.findOne({
          order_number: baseOrderNumber,
          user_id: String(user_id),
        }).lean()
      : null;

    if (!existingByClientNumber) {
      baseOrderNumber = await generateUniqueOrderNumber({
        isKarnataka: isKarnatakaOrder,
      });
    } else if (
      isKarnatakaOrder &&
      !baseOrderNumber.endsWith("-UL") &&
      !/_UL_/i.test(baseOrderNumber)
    ) {
      baseOrderNumber = `${baseOrderNumber}-UL`;
    }
    const detailsList = Array.isArray(order_details) ? order_details : [];

    // Recalculate line amounts from catalog (ignore client prices)
    const pricedItems = [];
    let serverTotal = 0;
    for (const item of order_item) {
      const qty = Math.max(1, Math.floor(toNumber(item.quantity, 1) || 1));
      const { price } = await resolveLinePrice(item, isKarnatakaOrder);
      const warrantyFromData = await resolveWarrantyPrice(item.warrantyData);
      const warranty =
        warrantyFromData || resolveItemWarrantyAmount(item);
      const discount = Math.max(0, toNumber(item.discount, 0) || 0);
      const exchange = resolveExchangeAmount(item) * qty;
      const lineTotal = price * qty - discount + warranty - exchange;
      serverTotal += lineTotal > 0 ? lineTotal : Math.max(0, price * qty - exchange);
      pricedItems.push({
        ...item,
        quantity: qty,
        price,
        product_price: price,
        extendedWarranty: warranty,
      });
    }

    if (isEmi && serverTotal < 3000) {
      return Response.json(
        {
          success: false,
          message: "EMI is available for orders of ₹3,000 and above.",
        },
        { status: 400 }
      );
    }

    const checkoutGroupId =
      stringify(existingByClientNumber?.checkout_group_id) || baseOrderNumber;

    const sharedFields = {
      user_id: String(user_id),
      order_username,
      order_phonenumber,
      order_deliveryaddress,
      customer_comments,
      payment_method,
      payment_type,
      payment_mode: payment_type || payment_method || null,
      delivery_type: mappedDelivery,
      payment_id: payment_id || null,
      user_adddeliveryid: user_adddeliveryid || null,
      email_address,
      order_status: mappedStatus,
      payment_status: payment_status || "unpaid",
      loyalty_redemption_token: loyalty_redemption_token || null,
      pickup_store: pickup_store || null,
      store_id: resolvedStoreId,
      region: resolvedRegion,
      gst_number: gst_number || null,
      order_billingaddress: order_billingaddress || null,
      user_addbillingid: user_addbillingid || null,
      order_owner: isKarnatakaOrder ? "unilet" : "sathya",
      pickup_type: pickup_type || null,
      applied_payment_offer: applied_payment_offer || appliedPaymentOffer || null,
      appliedPaymentOffer: appliedPaymentOffer || applied_payment_offer || null,
      checkout_group_id: checkoutGroupId,
    };

    // Reuse existing line orders in this checkout group (order numbers stay as-is).
    const existingOrders = await OrderNew.find({
      user_id: String(user_id),
      $or: [
        { checkout_group_id: checkoutGroupId },
        { order_number: checkoutGroupId },
        { order_number: baseOrderNumber },
      ],
    }).sort({ created_at: 1 });

    const siblingNumbers = [];
    for (let index = 0; index < pricedItems.length; index++) {
      if (existingOrders[index]?.order_number) {
        siblingNumbers.push(String(existingOrders[index].order_number));
      } else if (index === 0) {
        siblingNumbers.push(baseOrderNumber);
      } else {
        siblingNumbers.push(
          await generateUniqueOrderNumber({ isKarnataka: isKarnatakaOrder })
        );
      }
    }

    const existingByNumber = new Map(
      existingOrders.map((order) => [String(order.order_number), order])
    );

    // Pre-order stock re-validation to prevent overselling on initial order placement
    if (existingOrders.length === 0) {
      for (const item of pricedItems) {
        const requiredQty = toNumber(item.quantity, 1) || 1;
        const productId = item.productId || item.id || item.product_id;
        const rawCode = item.item_code || item.itemCode || "";
        const itemCode = rawCode
          ? (String(rawCode).startsWith("ITEM") ? String(rawCode) : `ITEM${rawCode}`)
          : null;

        if (isKarnatakaOrder) {
          const ownerQuery = { owner_id: "unilet", is_active: true };
          if (productId && mongoose.isValidObjectId(productId)) {
            ownerQuery.product_id = productId;
          } else if (itemCode) {
            ownerQuery.product_item_code = itemCode;
          }

          let ownerProd = await OwnerProduct.findOne(ownerQuery);
          if (!ownerProd && itemCode) {
            ownerProd = await OwnerProduct.findOne({
              owner_id: "unilet",
              $or: [{ product_item_code: itemCode }, { vendor_item_code: itemCode }],
              is_active: true,
            });
          }

          if (ownerProd) {
            if (Number(ownerProd.stock || 0) < requiredQty || ownerProd.stock_status === "Out of Stock") {
              return Response.json(
                {
                  success: false,
                  message: `Item "${item.name || item.product_name || itemCode}" is out of stock in Karnataka (${ownerProd.stock || 0} available).`,
                },
                { status: 400 }
              );
            }
          } else {
            return Response.json(
              {
                success: false,
                message: `Item "${item.name || item.product_name || itemCode}" is currently unavailable for delivery in Karnataka.`,
              },
              { status: 400 }
            );
          }
        } else {
          let prod = null;
          if (productId && mongoose.isValidObjectId(productId)) {
            prod = await Product.findById(productId);
          } else if (itemCode) {
            prod = await Product.findOne({ item_code: itemCode });
          }

          if (prod) {
            const isCustomOrder = prod.movement === "CUS-Order";
            if (!isCustomOrder && (Number(prod.quantity || 0) < requiredQty || prod.stock_status === "Out of Stock")) {
              return Response.json(
                {
                  success: false,
                  message: `Item "${prod.name || item.product_name || itemCode}" is out of stock (${prod.quantity || 0} available).`,
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    const savedOrders = [];
    let createdAny = false;

    for (let index = 0; index < pricedItems.length; index++) {
      const item = pricedItems[index];
      const thisOrderNumber = siblingNumbers[index];
      const existing = existingByNumber.get(thisOrderNumber);
      const thisAmount = lineAmount(item);

      const perOrderFields = {
        ...sharedFields,
        order_item: [item],
        order_amount: String(thisAmount || serverTotal || order_amount || 0),
        order_number: thisOrderNumber,
        checkout_group_id: checkoutGroupId,
        loyalty_points_redeemed: index === 0 ? (loyalty_points_redeemed || 0) : 0,
        loyalty_discount: index === 0 ? (loyalty_discount || 0) : 0,
        promotion_code_applied: index === 0 ? (promotion_code_applied || null) : null,
        promotion_discount_applied: index === 0 ? (promotion_discount_applied || 0) : 0,
      };

      let savedOrder;
      let isNew = false;

      if (existing) {
        const oldStatus = existing.order_status;
        const alreadyPaid =
          String(existing.payment_status || "").toLowerCase() === "paid";

        // Never downgrade a verified paid order; never invent paid from client alone
        existing.payment_id = payment_id || existing.payment_id;
        if (alreadyPaid) {
          existing.payment_status = "paid";
          existing.order_status =
            existing.order_status === "Payment Initiated" ? "ordered" : existing.order_status;
        } else if (payment_status === "paid" && String(payment_id || "").startsWith("pay_")) {
          // Trust only after verify-payment / webhook already ran, or Razorpay pay_ id present
          // verify-payment sets paid first; this path is a sync fallback
          existing.payment_status = existing.payment_status;
          existing.order_status = existing.order_status;
        } else if (isCod) {
          existing.payment_status = "pending";
          existing.order_status = "ordered";
        } else if (isPayAtStore) {
          existing.payment_status = "pending";
          existing.order_status = "pending";
        } else {
          existing.payment_status = existing.payment_status || "payment_initialized";
        }
        existing.payment_method = payment_method || existing.payment_method;
        existing.payment_type = payment_type || existing.payment_type;
        existing.payment_mode = payment_type || payment_method || existing.payment_mode;
        if (!existing.checkout_group_id) {
          existing.checkout_group_id = checkoutGroupId;
        }
        savedOrder = await existing.save();

        if (oldStatus !== savedOrder.order_status) {
          await OrderHistoryNew.create({
            order_id: String(savedOrder._id),
            order_number: stringify(savedOrder.order_number),
            order_status: savedOrder.order_status,
            notify: 0,
            comment: "Order updated via payment completion",
          });
        }
      } else {
        savedOrder = await new OrderNew(perOrderFields).save();
        isNew = true;
        createdAny = true;
      }

      const existingDetailCount = await OrderDetailsNew.countDocuments({
        order_id: savedOrder._id,
      });
      if (existingDetailCount === 0) {
        const matchedDetail = detailsList[index] ? [detailsList[index]] : [item];
        const detailRows = buildOrderDetailRows([item], matchedDetail, savedOrder, user_id);
        if (detailRows.length) {
          await OrderDetailsNew.insertMany(detailRows);
        }
      }

      // Stock + coupon: applied only upon verified successful payment (verify-payment, PayU status, or Razorpay webhook).
      // Never prematurely deduct stock while payment is pending, initialized, or unconfirmed.
      if (isNew) {
        await saveOrderHistory(savedOrder);

        try {
          const notification = new Notification({
            userId: user_id,
            message: `Order #${savedOrder.order_number || savedOrder._id} placed successfully!`,
            orderId: savedOrder._id,
          });
          await notification.save();
        } catch (notifErr) {
          console.error("Notification creation failed:", notifErr);
        }
      }

      savedOrders.push(savedOrder);
    }

    const primaryOrder = savedOrders[0];

    if (payment_id && primaryOrder) {
      const gatewayPaymentId = String(payment_id);
      let paymentDoc = await PaymentNewLive.findOneAndUpdate(
        { payment_id: gatewayPaymentId },
        {
          $set: {
            orderId: primaryOrder._id,
            order_number: primaryOrder.order_number || null,
            userId: toObjectId(user_id),
          },
        },
        { new: true }
      );

      if (!paymentDoc && mongoose.isValidObjectId(gatewayPaymentId)) {
        paymentDoc = await PaymentNewLive.findByIdAndUpdate(
          gatewayPaymentId,
          {
            $set: {
              orderId: primaryOrder._id,
              order_number: primaryOrder.order_number || null,
              userId: toObjectId(user_id),
            },
          },
          { new: true }
        );
      }

      if (paymentDoc?._id) {
        const paymentObjectId = String(paymentDoc._id);
        await OrderNew.updateMany(
          { _id: { $in: savedOrders.map((order) => order._id) } },
          { $set: { payment_id: paymentObjectId } }
        );
        savedOrders.forEach((order) => {
          order.payment_id = paymentObjectId;
        });
      }
    }

    // Auto CreateSalesOrder for Store Pickup + order confirmation SMS (exist storeOrders rules)
    const pm = String(sharedFields.payment_method || sharedFields.payment_type || "")
      .toLowerCase()
      .trim();
    const ps = String(sharedFields.payment_status || "").toLowerCase().trim();

    const isOfflinePayment =
      pm === "cash on delivery" ||
      pm === "cod" ||
      pm === "pay_at_store" ||
      pm === "pay at store" ||
      pm === "emi" ||
      pm === "bajaj finance" ||
      pm === "bajajemioffline";

    const isOnlinePaid =
      (pm === "online" || pm === "emi") && (ps === "paid" || ps === "success");

    const isPaymentInitiated =
      ps === "payment_initialized" ||
      ps === "payment initialized" ||
      ps === "payment initiated" ||
      mappedStatus === "Payment Initiated";

    // Exist: no confirmation SMS while Payment Initiated (online not completed)
    const canSendConfirmSms = !isPaymentInitiated && (isOfflinePayment || isOnlinePaid);

    if (primaryOrder && sharedFields.delivery_type === "store") {
      if (isOfflinePayment || isOnlinePaid) {
        try {
          const wondersoftResult = await sendOrderData(
            primaryOrder._id,
            "Auto CreateSalesOrder for store checkout"
          );
          // Exist store path: SMS only if CreateSalesOrder SUCCESS
          if (wondersoftResult?.api_status === "SUCCESS" && canSendConfirmSms) {
            const fresh = {
              ...primaryOrder.toObject?.() ? primaryOrder.toObject() : primaryOrder,
              order_username: sharedFields.order_username,
              order_phonenumber: sharedFields.order_phonenumber,
              order_number: primaryOrder.order_number || sharedFields.order_number,
            };
            await sendOrderConfirmationSms(fresh).catch((err) =>
              console.error("Order confirm SMS error:", err)
            );
          }
        } catch (err) {
          console.error("Auto sendOrderData error:", err);
        }
      }
    } else if (primaryOrder && sharedFields.delivery_type === "home" && canSendConfirmSms) {
      // Exist home: COD/EMI after create; online after payment success
      try {
        const fresh = {
          ...(primaryOrder.toObject?.() ? primaryOrder.toObject() : primaryOrder),
          order_username: sharedFields.order_username,
          order_phonenumber: sharedFields.order_phonenumber,
          order_number: primaryOrder.order_number,
        };
        await sendOrderConfirmationSms(fresh);
      } catch (err) {
        console.error("Order confirm SMS error:", err);
      }
    }

    // Exist storeOrders only: foreach orderNumbersArray → Invenso (not Unilet, not admin PlaceOrder)
    let invenzoResults = [];
    if (
      isInvenzoServiceEnabled() &&
      !isKarnatakaOrder &&
      Array.isArray(savedOrders) &&
      savedOrders.length > 0
    ) {
      // Header / checkout pincode → Invenzo store_create body.pincode (required)
      const pickPin = (v) => {
        const m = String(v ?? "").match(/\b(\d{6})\b/);
        if (m) return m[1];
        const d = String(v ?? "").replace(/\D/g, "");
        return d.length >= 6 ? d.slice(0, 6) : "";
      };
      let headerPincode = "";
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const rawLoc = cookieStore.get("sathya_location")?.value;
        if (rawLoc) {
          const decoded = decodeURIComponent(rawLoc);
          const parsed = JSON.parse(decoded);
          headerPincode = pickPin(parsed?.pincode);
        }
      } catch {
        headerPincode = "";
      }
      const checkoutPincode =
        pickPin(body.pincode) ||
        pickPin(body.postCode) ||
        pickPin(body.postal_code) ||
        pickPin(body.delivery_pincode) ||
        headerPincode ||
        pickPin(order_deliveryaddress) ||
        pickPin(body.order_billingaddress) ||
        (pinMatch ? pinMatch[0] : "");

      for (const saved of savedOrders) {
        try {
          const inv = await orderPlacedToStoreInvenzo({
            orderId: String(saved._id),
            orderNumber: saved.order_number,
            storeCode: saved.pickup_type || sharedFields.pickup_type || "",
            pincode: checkoutPincode,
          });
          invenzoResults.push({
            order_number: saved.order_number,
            ...inv,
          });
        } catch (invErr) {
          console.error("Invenzo checkout push error:", invErr);
          invenzoResults.push({
            order_number: saved.order_number,
            ok: false,
            error: invErr.message || "Invenzo place failed",
          });
        }
      }
    }

    const checkoutTotal =
      serverTotal > 0
        ? serverTotal
        : savedOrders.reduce((sum, o) => sum + (Number(o.order_amount) || 0), 0);

    return Response.json(
      {
        success: true,
        message: createdAny
          ? "Order created successfully"
          : "Order updated successfully",
        order: primaryOrder,
        orders: savedOrders,
        // Full multi-item checkout total (sum of sibling line orders)
        total_amount: checkoutTotal,
        order_amount: checkoutTotal,
        ...(invenzoResults.length ? { invenzo: invenzoResults } : {}),
      },
      { status: createdAny ? 201 : 200 }
    );
  } catch (error) {
    console.error("ORDER ERROR:", error.message, error.stack);
    return Response.json(
      {
        success: false,
        message: "Server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
