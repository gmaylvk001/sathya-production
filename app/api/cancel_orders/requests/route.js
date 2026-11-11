import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { isUniletView } from "@/lib/storeView";
import CancelOrders from "@/models/cancel_orders_live";
import { ensureAppCancelsMoved } from "@/lib/cancelOrdersLive";
import OrderNew from "@/models/orders_new";
import User from "@/models/User";
import "@/models/Role";

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function splitIds(values) {
  const objectIds = [];
  const plain = [];
  for (const value of values) {
    const text = toText(value);
    if (!text) continue;
    plain.push(text);
    if (mongoose.Types.ObjectId.isValid(text)) objectIds.push(new mongoose.Types.ObjectId(text));
  }
  return { objectIds, plain: [...new Set(plain)] };
}

// Exist "Cancel Request Orders": cancel requests saved while the order was Billed.
// order_status here is the snapshot at request time, not the current order status.
export async function GET(req) {
  try {
    await dbConnect();

    const uniletOnly = await isUniletView(req);
    await ensureAppCancelsMoved();

    const requests = await CancelOrders.find({ order_status: { $regex: /^billed$/i } })
      .sort({ created_at: -1 })
      .lean();

    const orderRefs = splitIds(requests.map((r) => r.order_id));
    const orderNumbers = [...new Set(requests.map((r) => toText(r.order_number)).filter(Boolean))];
    const orderOr = [];
    if (orderRefs.objectIds.length) orderOr.push({ _id: { $in: orderRefs.objectIds } });
    if (orderRefs.plain.length) orderOr.push({ exist_id: { $in: orderRefs.plain } });
    if (orderNumbers.length) orderOr.push({ order_number: { $in: orderNumbers } });

    const orders = orderOr.length
      ? await OrderNew.find({ $or: orderOr })
          .select("_id exist_id order_number order_owner order_status order_username")
          .lean()
      : [];

    const orderById = new Map();
    const orderByNumber = new Map();
    for (const order of orders) {
      orderById.set(String(order._id), order);
      if (order.exist_id) orderById.set(toText(order.exist_id), order);
      if (order.order_number) orderByNumber.set(toText(order.order_number), order);
    }

    const customerRefs = splitIds(requests.map((r) => r.customer_id));
    const userOr = [];
    if (customerRefs.objectIds.length) userOr.push({ _id: { $in: customerRefs.objectIds } });
    if (customerRefs.plain.length) userOr.push({ exist_id: { $in: customerRefs.plain } });

    const users = userOr.length
      ? await User.find({ $or: userOr }).select("_id exist_id name last_name").lean()
      : [];

    const userById = new Map();
    for (const user of users) {
      userById.set(String(user._id), user);
      if (user.exist_id) userById.set(toText(user.exist_id), user);
    }

    const rows = [];
    for (const request of requests) {
      const order =
        orderById.get(toText(request.order_id)) ||
        orderByNumber.get(toText(request.order_number)) ||
        null;

      const owner = toText(order?.order_owner).toLowerCase();
      const isUnilet = owner === "unilet";
      if (uniletOnly ? !isUnilet : isUnilet) continue;

      const user = userById.get(toText(request.customer_id));
      const customerName = user
        ? [toText(user.name), toText(user.last_name)].filter(Boolean).join(" ")
        : "";

      rows.push({
        _id: String(request._id),
        order_number: toText(request.order_number),
        order_ref_id: order ? String(order._id) : null,
        customer_id: toText(request.customer_id),
        customer_name: customerName || toText(order?.order_username),
        order_status: toText(request.order_status),
        current_order_status: toText(order?.order_status),
        reason: toText(request.reason),
        comments: toText(request.comments),
        created_at: request.created_at || null,
      });
    }

    return NextResponse.json({ success: true, unilet_only: uniletOnly, requests: rows });
  } catch (error) {
    console.error("cancel request orders error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load cancel requests" },
      { status: 500 }
    );
  }
}
