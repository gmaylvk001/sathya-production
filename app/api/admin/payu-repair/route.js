import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderHistoryNew from "@/models/order_history_new";
import OrderDetailsNew from "@/models/order_details_new";
import OwnerProduct from "@/models/OwnerProduct";
import Product from "@/models/product";

// Temporary: undoes the 05/10/2026 PayU empty-callback that failed every order. Delete after use.
export const dynamic = "force-dynamic";

const FAKE_COMMENT = "PayU payment failed: Signature verification failed";
const WINDOW_START = new Date("2026-10-05T12:57:00.000Z");
const WINDOW_END = new Date("2026-10-05T12:58:30.000Z");

function authorized(req) {
  const token = req.headers.get("x-repair-token") || "";
  return Boolean(process.env.MY_SECRET_TOKEN) && token === process.env.MY_SECRET_TOKEN;
}

const PAYMENT_STATUS_BY_PREV = {
  "Payment Initiated": "payment_initialized",
  payment_initialized: "payment_initialized",
  pending: "pending",
};

async function findStockTarget(order, detail) {
  const isUnilet =
    String(order.order_owner || "").toLowerCase() === "unilet" ||
    String(order.region || "").toLowerCase() === "karnataka";
  const rawCode = detail.item_code || detail.product_id;
  const itemCode = rawCode ? (String(rawCode).startsWith("ITEM") ? String(rawCode) : `ITEM${rawCode}`) : null;

  if (isUnilet) {
    const ownerQuery = { owner_id: "unilet" };
    if (detail.product_id && mongoose.isValidObjectId(detail.product_id)) ownerQuery.product_id = detail.product_id;
    else if (itemCode) ownerQuery.product_item_code = itemCode;
    let doc = await OwnerProduct.findOne(ownerQuery);
    if (!doc && itemCode) {
      doc = await OwnerProduct.findOne({ owner_id: "unilet", $or: [{ product_item_code: itemCode }, { vendor_item_code: itemCode }] });
    }
    return doc ? { kind: "unilet", doc, field: "stock" } : null;
  }

  let doc = null;
  if (detail.product_id && mongoose.isValidObjectId(detail.product_id)) doc = await Product.findById(detail.product_id);
  else if (itemCode) doc = await Product.findOne({ item_code: itemCode });
  return doc ? { kind: "sathya", doc, field: "quantity" } : null;
}

async function buildPlan() {
  const fakeEntries = await OrderHistoryNew.find({
    comment: FAKE_COMMENT,
    created_at: { $gte: WINDOW_START, $lte: WINDOW_END },
  }).lean();

  const plan = [];
  for (const fake of fakeEntries) {
    if (!mongoose.isValidObjectId(fake.order_id)) continue;
    const order = await OrderNew.findById(fake.order_id);
    if (!order) continue;

    const previous = await OrderHistoryNew.findOne({
      order_id: String(order._id),
      _id: { $ne: fake._id },
      created_at: { $lt: fake.created_at },
    }).sort({ created_at: -1 }).lean();

    const details = await OrderDetailsNew.find({
      $or: [{ order_id: order._id }, ...(order.order_number ? [{ orderNumber: order.order_number }] : [])],
    }).lean();

    const stock = [];
    for (const detail of details) {
      const target = await findStockTarget(order, detail);
      stock.push({
        item_code: detail.item_code,
        qty: Number(detail.quantity) || 1,
        target: target ? `${target.kind}:${target.doc._id}` : null,
        current: target ? Number(target.doc[target.field]) || 0 : null,
        _target: target,
      });
    }

    plan.push({ fake, order, previousStatus: previous?.order_status || null, stock });
  }
  return plan;
}

function summarize(plan) {
  return plan.map(({ order, previousStatus, stock }) => ({
    order_id: String(order._id),
    order_number: order.order_number,
    type: order.type || null,
    owner: order.order_owner || null,
    status_now: order.order_status,
    status_restore_to: previousStatus,
    payment_status_now: order.payment_status,
    payment_status_restore_to: previousStatus ? PAYMENT_STATUS_BY_PREV[previousStatus] || null : null,
    stock: stock.map(({ item_code, qty, target, current }) => ({
      item_code, qty, target, current, after: current === null ? null : Math.max(0, current - qty),
    })),
  }));
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const plan = await buildPlan();
  return NextResponse.json({ count: plan.length, orders: summarize(plan) });
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const plan = await buildPlan();
  const result = [];

  for (const { fake, order, previousStatus, stock } of plan) {
    // Unknown previous state: leave the order and its history entry untouched.
    if (!previousStatus) {
      result.push({ order_number: order.order_number, skipped: "previous status unknown" });
      continue;
    }

    const update = { order_status: previousStatus };
    const payStatus = PAYMENT_STATUS_BY_PREV[previousStatus];
    if (payStatus) {
      update.payment_status = payStatus;
      update.online_pay_ref_status = null;
    }
    await OrderNew.updateOne({ _id: order._id }, { $set: update });

    for (const { qty, _target } of stock) {
      if (!_target) continue;
      const { doc, field } = _target;
      const Model = doc.constructor;
      await Model.updateOne({ _id: doc._id }, { $inc: { [field]: -qty } });
      await Model.updateOne({ _id: doc._id, [field]: { $lt: 0 } }, { $set: { [field]: 0 } });
      await Model.updateOne({ _id: doc._id, [field]: { $lte: 0 } }, { $set: { stock_status: "Out of Stock" } });
    }

    await OrderHistoryNew.deleteOne({ _id: fake._id });
    result.push({ order_number: order.order_number, restored_status: previousStatus });
  }

  return NextResponse.json({ success: true, count: result.length, result });
}
