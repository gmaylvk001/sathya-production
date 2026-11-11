// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Order from "@/models/ecom_order_info";
// import jwt from "jsonwebtoken";


// export async function GET(req) {
//   await dbConnect();

//   try {
//     const { searchParams } = new URL(req.url);
//     const authHeader = req.headers.get('authorization');
//      const token = authHeader && authHeader.split(' ')[1];
        
//         if (!token) {
//           return NextResponse.json(
//             { error: "Authorization token required" },
//             { status: 401 }
//           );
//         }
    
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const userId = decoded.userId;
//     const status = searchParams.get("status");
//     let query = {};

//     if (status && status !== "all") {
//       query.order_status = status;
//     }

//     if(userId){
//       query.user_id = userId;
//     }

//     const orders = await Order.find(query);
//     return NextResponse.json({ success: true, orders }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import PaymentNewLive from "@/models/payment_new_live";
import CancelOrders from "@/models/cancel_orders_live";
import { ensureAppCancelsMoved } from "@/lib/cancelOrdersLive";
import product from "@/models/product";
import Review from "@/models/Review";
import ShipmentsInvenzo from "@/models/shipments_invenzo";
import ShipmentTrackingInvenzo from "@/models/shipment_tracking_invenzo";
import { isInvenzoServiceEnabled } from "@/lib/invenzo";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const status = searchParams.get("status");
    const order_number = searchParams.get("order_number");
    
    let query = {};

    if (status && status !== "all") {
      query.order_status = status;
    }

    if (order_number) {
      query.order_number = order_number;
    }
    if(userId){
      query.user_id = userId;
    }

    // Offline orders are now included in user order history ONLY if they have an invoice 
    // (This ensures we only show simple orders from apis/offlineorders, and hide the detailed ones)
    query.$or = [
      { type: { $ne: "offline" } },
      { type: "offline", invoice: { $exists: true, $ne: null, $ne: "" } }
    ];

    // Unpaid online attempts are not shown to the customer.
    query.$and = [{ order_status: { $not: /^payment[\s_-]*initi(ated|alized)$/i } }];

    const orders = await OrderNew.find(query).sort({ created_at: -1 });

    const paymentObjectIds = [];
    const paymentStringIds = [];
    for (const order of orders) {
      if (!order.payment_id) continue;
      const pid = String(order.payment_id);
      paymentStringIds.push(pid);
      if (mongoose.isValidObjectId(pid)) {
        paymentObjectIds.push(new mongoose.Types.ObjectId(pid));
      }
    }

    const paymentQuery = [];
    if (paymentObjectIds.length) paymentQuery.push({ _id: { $in: paymentObjectIds } });
    if (paymentStringIds.length) {
      paymentQuery.push({ payment_id: { $in: paymentStringIds } });
      paymentQuery.push({ exist_id: { $in: paymentStringIds } });
    }
    if (orders.length) paymentQuery.push({ orderId: { $in: orders.map((order) => order._id) } });
    const orderNumbers = orders.map((order) => order.order_number).filter(Boolean);
    if (orderNumbers.length) paymentQuery.push({ order_number: { $in: orderNumbers } });

    const payments = paymentQuery.length
      ? await PaymentNewLive.find({ $or: paymentQuery }).lean()
      : [];

    // Index payments by each match key, keeping the first position so the
    // earliest matching payment wins (same result as a linear find)
    const firstIndexBy = (keyFn) => {
      const map = new Map();
      payments.forEach((payment, idx) => {
        const key = keyFn(payment);
        if (key !== undefined && !map.has(key)) map.set(key, idx);
      });
      return map;
    };
    const paymentsById = firstIndexBy((p) => String(p._id));
    const paymentsByPaymentId = firstIndexBy((p) => String(p.payment_id));
    const paymentsByExistId = firstIndexBy((p) => String(p.exist_id));
    const paymentsByOrderId = firstIndexBy((p) => String(p.orderId));
    const paymentsByOrderNumber = firstIndexBy((p) => p.order_number);

    const findPaymentForOrder = (order) => {
      const pid = order.payment_id ? String(order.payment_id) : "";
      const candidates = [paymentsByOrderId.get(String(order._id))];
      if (pid) {
        candidates.push(paymentsById.get(pid), paymentsByPaymentId.get(pid), paymentsByExistId.get(pid));
      }
      if (order.order_number) {
        candidates.push(paymentsByOrderNumber.get(order.order_number));
      }
      const found = candidates.filter((idx) => idx !== undefined);
      return found.length ? payments[Math.min(...found)] : null;
    };

    // Exist cancel_exists: any cancel_orders row for this order
    const cancelOrderIds = orders.map((o) => String(o._id));
    const cancelOrderNumbers = orders.map((o) => o.order_number).filter(Boolean);
    const cancelQuery = [];
    if (cancelOrderIds.length) cancelQuery.push({ order_id: { $in: cancelOrderIds } });
    if (cancelOrderNumbers.length) cancelQuery.push({ order_number: { $in: cancelOrderNumbers } });
    if (cancelQuery.length) await ensureAppCancelsMoved();
    const cancelRows = cancelQuery.length
      ? await CancelOrders.find({ $or: cancelQuery }).select("order_id order_number").lean()
      : [];
    const cancelExistsByOrderId = new Set(cancelRows.map((r) => String(r.order_id || "")));
    const cancelExistsByOrderNumber = new Set(
      cancelRows.map((r) => String(r.order_number || "").trim()).filter(Boolean)
    );

    // Line items from order_details_new for all orders in one query
    // (matched by order_id, or orderNumber as the fallback for imported orders)
    const detailOrQuery = [];
    if (orders.length) detailOrQuery.push({ order_id: { $in: orders.map((o) => o._id) } });
    if (orderNumbers.length) detailOrQuery.push({ orderNumber: { $in: orderNumbers } });
    if (orders.some((o) => !o.order_number)) detailOrQuery.push({ orderNumber: null });
    const allDetails = detailOrQuery.length
      ? await OrderDetailsNew.find({ $or: detailOrQuery })
      : [];

    const detailsForOrder = (order) =>
      allDetails.filter(
        (d) =>
          String(d.order_id) === String(order._id) ||
          (order.order_number ? d.orderNumber === order.order_number : d.orderNumber == null)
      );

    const lineItemsByOrder = new Map();
    for (const order of orders) {
      const details = detailsForOrder(order);
      // If the new table doesn't have details, fallback to order.order_item array if it exists
      lineItemsByOrder.set(String(order._id), details.length > 0 ? details : (order.order_item || []));
    }

    // Product slugs and IDs for all item codes in one query; first product per code wins
    const itemCodes = [
      ...new Set(
        [...lineItemsByOrder.values()].flat().map((item) => item.item_code).filter(Boolean)
      ),
    ];
    const productInfoByItemCode = new Map();
    if (itemCodes.length) {
      const productDocs = await product
        .find({ item_code: { $in: itemCodes } }, "slug item_code _id")
        .sort({ _id: 1 })
        .lean();
      for (const p of productDocs) {
        if (!productInfoByItemCode.has(p.item_code)) {
          productInfoByItemCode.set(p.item_code, {
            slug: p.slug,
            id: String(p._id),
          });
        }
      }
    }

    // Check products already reviewed by the current user
    let userReviewedProductIds = new Set();
    if (userId) {
      try {
        const userReviews = await Review.find({
          $or: [
            { user_id: String(userId) },
            ...(mongoose.isValidObjectId(userId)
              ? [{ user_id: new mongoose.Types.ObjectId(userId) }]
              : []),
          ],
        })
          .select("product_id")
          .lean();
        userReviewedProductIds = new Set(
          userReviews.map((r) => String(r.product_id)).filter(Boolean)
        );
      } catch (e) {
        console.error("Error fetching user reviews for orders:", e);
      }
    }

    // Invenso tracking (Exist my_orders) — only when invenso_service_on=on
    const invensoServiceOn = isInvenzoServiceEnabled();
    const shipmentByOrderNumber = new Map();
    const trackingByShipmentNo = new Map();
    if (invensoServiceOn && orderNumbers.length) {
      try {
        const shipments = await ShipmentsInvenzo.find({
          order_number: { $in: orderNumbers.map((n) => String(n)) },
        }).lean();
        for (const s of shipments) {
          const key = String(s.order_number || "").trim();
          if (key && !shipmentByOrderNumber.has(key)) {
            shipmentByOrderNumber.set(key, s);
          }
        }
        const shipmentNos = [
          ...new Set(
            shipments.map((s) => String(s.shipment_no || "").trim()).filter(Boolean)
          ),
        ];
        if (shipmentNos.length) {
          const trackings = await ShipmentTrackingInvenzo.find({
            shipment_id: { $in: shipmentNos },
          }).lean();
          for (const t of trackings) {
            const sid = String(t.shipment_id || "").trim();
            if (sid && !trackingByShipmentNo.has(sid)) {
              trackingByShipmentNo.set(sid, t);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching Invenso tracking for orders:", e);
      }
    }

    const updatedOrders = [];
    for (let order of orders) {
      const itemsWithSlug = [];
      const lineItems = lineItemsByOrder.get(String(order._id)) || [];

      const savedOrderItems = Array.isArray(order.order_item) ? order.order_item : [];

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const itemCode = item.item_code;
        const matchedProduct = itemCode ? productInfoByItemCode.get(itemCode) : null;
        const slug = matchedProduct?.slug || null;
        const resolvedId = matchedProduct?.id || null;

        const itemObj = item.toObject ? item.toObject() : item;
        const finalProductId = itemObj.product_id || resolvedId || itemObj.productId || null;

        // order_details rows are often sparse — backfill warranty/variants from order.order_item
        const fromOrderItem =
          savedOrderItems.find((oi) => {
            const oiCode = oi?.item_code || oi?.itemCode || "";
            const normalized = oiCode
              ? String(oiCode).startsWith("ITEM")
                ? String(oiCode)
                : `ITEM${oiCode}`
              : "";
            return (
              (itemCode && normalized && normalized === String(itemCode)) ||
              String(oi?.productId || oi?.product_id || "") === String(finalProductId || "")
            );
          }) ||
          savedOrderItems[i] ||
          {};

        const exchangeAmount =
          Number(
            itemObj.exchange_off_amount ??
              itemObj.eo_amount ??
              fromOrderItem.exchange_off_amount ??
              fromOrderItem.eo_amount ??
              fromOrderItem.exchangeOffer?.price ??
              0
          ) || 0;

        itemsWithSlug.push({
          ...itemObj,
          product_id: finalProductId,
          name: itemObj.product_name || itemObj.name,
          price: itemObj.product_price || itemObj.price,
          slug: slug || null,
          warrantyData: itemObj.warrantyData || fromOrderItem.warrantyData || null,
          extendedWarranty:
            itemObj.extendedWarranty ?? fromOrderItem.extendedWarranty ?? null,
          variantValues:
            itemObj.variantValues ||
            fromOrderItem.variantValues ||
            itemObj.selectedVariant ||
            fromOrderItem.selectedVariant ||
            null,
          selectedVariant:
            itemObj.selectedVariant ||
            fromOrderItem.selectedVariant ||
            itemObj.variantValues ||
            fromOrderItem.variantValues ||
            null,
          color: itemObj.color || fromOrderItem.color || null,
          attributes: itemObj.attributes || fromOrderItem.attributes || null,
          exchange_off_amount: exchangeAmount,
          eo_amount: exchangeAmount,
          exchange_off_type:
            itemObj.exchange_off_type ||
            fromOrderItem.exchange_off_type ||
            fromOrderItem.exchangeOffer?.type ||
            null,
          exchange_off_brand:
            itemObj.exchange_off_brand ||
            fromOrderItem.exchange_off_brand ||
            fromOrderItem.exchangeOffer?.brand ||
            null,
          exchange_off_cond:
            itemObj.exchange_off_cond ||
            fromOrderItem.exchange_off_cond ||
            fromOrderItem.exchangeOffer?.condition ||
            null,
          exchangeOffer:
            fromOrderItem.exchangeOffer ||
            (exchangeAmount > 0
              ? {
                  price: exchangeAmount,
                  brand:
                    itemObj.exchange_off_brand ||
                    fromOrderItem.exchange_off_brand ||
                    null,
                  type:
                    itemObj.exchange_off_type ||
                    fromOrderItem.exchange_off_type ||
                    null,
                  condition:
                    itemObj.exchange_off_cond ||
                    fromOrderItem.exchange_off_cond ||
                    null,
                }
              : null),
          is_reviewed: Boolean(
            finalProductId && userReviewedProductIds.has(String(finalProductId))
          ),
        });
      }

      const orderObj = order.toObject();
      const payment = findPaymentForOrder(order);
      const cancel_exists =
        cancelExistsByOrderId.has(String(order._id)) ||
        (order.order_number
          ? cancelExistsByOrderNumber.has(String(order.order_number).trim())
          : false);

      let invenzo_shipment = null;
      let invenzo_tracking = null;
      if (invensoServiceOn && order.order_number) {
        const ship = shipmentByOrderNumber.get(String(order.order_number).trim()) || null;
        invenzo_shipment = ship
          ? {
              shipment_no: ship.shipment_no || null,
              status: ship.status || null,
              tracking_number: ship.tracking_number || null,
              shipped_at: ship.shipped_at || null,
              delivered_at: ship.delivered_at || null,
              cancelled_at: ship.cancelled_at || null,
            }
          : null;
        if (ship?.shipment_no) {
          const track = trackingByShipmentNo.get(String(ship.shipment_no).trim()) || null;
          if (track) {
            const updates = Array.isArray(track.tracking_updates)
              ? track.tracking_updates
              : [];
            invenzo_tracking = {
              shipment_id: track.shipment_id || null,
              location: track.location || null,
              status: track.status || null,
              message: track.message || null,
              tracking_updates: updates,
            };
          }
        }
      }

      updatedOrders.push({
        ...orderObj,
        order_item: itemsWithSlug,
        payment_status: payment?.status || orderObj.payment_status || null,
        payment_type: payment?.PaymentMode || payment?.ModeType || orderObj.payment_type || orderObj.payment_method || null,
        payment_mode: payment?.PaymentMode || orderObj.payment_mode || null,
        createdAt: orderObj.created_at || orderObj.createdAt,
        updatedAt: orderObj.updated_at || orderObj.updatedAt,
        cancel_exists: Boolean(cancel_exists),
        invenso_service_on: invensoServiceOn,
        invenzo_shipment,
        invenzo_tracking,
      });
    }
    
    if (order_number && updatedOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, orders: updatedOrders }, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}