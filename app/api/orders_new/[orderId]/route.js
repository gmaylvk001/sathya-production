import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import OrderHistoryNew from "@/models/order_history_new";
import Product from "@/models/product";
import OwnerProduct from "@/models/OwnerProduct";
import StoreListing from "@/models/store_listings";
import { requireAdmin } from "@/lib/adminRequest";
import { ownerFieldFilter } from "@/lib/storeView";
import { attachRefundMeta } from "@/lib/orderRefund";
import { attachCustomerCurrentPhone } from "@/lib/orderCustomerPhone";

const ORDER_STATUSES = [
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

async function attachDetails(order) {
  const details = await OrderDetailsNew.find({ order_id: order._id }).lean();
  const productItemCodes = details.map((item) => {
    if (item.item_code && item.item_code.startsWith("ITEM")) {
      return item.item_code.substring(4);
    }
    return item.item_code;
  }).filter(Boolean);

  const products = productItemCodes.length
    ? await Product.find({ item_code: { $in: productItemCodes } }).select("slug item_code").lean()
    : [];

  const isUniletOrder = String(order.order_owner || "").trim().toLowerCase() === "unilet";
  const vendorCodeByItemCode = new Map();
  if (isUniletOrder && productItemCodes.length) {
    const ownerProducts = await OwnerProduct.find({
      owner_id: "unilet",
      product_item_code: { $in: productItemCodes },
    })
      .select("product_item_code vendor_item_code is_active")
      .sort({ is_active: -1, updatedAt: -1 })
      .lean();
    for (const op of ownerProducts) {
      const key = String(op.product_item_code || "").trim();
      if (key && op.vendor_item_code && !vendorCodeByItemCode.has(key)) {
        vendorCodeByItemCode.set(key, String(op.vendor_item_code).trim());
      }
    }
  }

  order.order_details = details.map((item) => {
    const product = products.find((p) => item.item_code && item.item_code.endsWith(p.item_code));
    const row = { ...item, slug: product?.slug || null };
    if (isUniletOrder) {
      const code = String(item.item_code || "").replace(/^ITEM/, "").trim();
      row.vendor_item_code = vendorCodeByItemCode.get(code) || null;
    }
    return row;
  });
  order.order_item = Array.isArray(order.order_item) ? order.order_item : [];
  return order;
}

async function attachOrderHistory(order) {
  const orderIdStr = String(order._id);
  const orderNumber = order.order_number ? String(order.order_number).trim() : "";

  const historyQuery = orderNumber
    ? { $or: [{ order_id: orderIdStr }, { order_number: orderNumber }] }
    : { order_id: orderIdStr };

  const rows = await OrderHistoryNew.find(historyQuery)
    .sort({ created_at: 1 })
    .lean();

  order.order_history = rows.map((row) => ({
    _id: row._id,
    exist_id: row.exist_id,
    order_id: row.order_id,
    order_number: row.order_number,
    date: row.created_at,
    created_at: row.created_at,
    comment: row.comment || "",
    status: row.order_status || "",
    order_status: row.order_status || "",
    notify: row.notify != null ? Number(row.notify) : 0,
    customer_notified: row.notify != null ? Number(row.notify) : 0,
  }));

  return order;
}

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { orderId } = await params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const order = await OrderNew.findById(orderId).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await attachDetails(order);
    await attachOrderHistory(order);
    await attachRefundMeta(order);
    await attachCustomerCurrentPhone(order);
    const rawSales = await OrderNew.collection.findOne(
      { _id: order._id },
      { projection: { sales_person_id: 1, sales_person_role: 1 } }
    );
    if (rawSales) {
      order.sales_person_id = rawSales.sales_person_id ?? order.sales_person_id;
      order.sales_person_role = rawSales.sales_person_role ?? order.sales_person_role;
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    await dbConnect();
    const { orderId } = await params;

    const { status, delivery_date } = await req.json();

    if (!status || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid order status is required" },
        { status: 400 }
      );
    }

    const updateData = { order_status: status };
    if (delivery_date) {
      updateData.delivery_date = delivery_date;
    }

    const updatedOrder = await OrderNew.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

function toSalesPersonValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n)) return n;
  }
  return raw;
}

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    await dbConnect();
    const { orderId } = await params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const body = await req.json();

    if (body.pickup_type !== undefined && body.sales_person_id === undefined) {
      const pickup_type = String(body.pickup_type || "").trim();
      if (!pickup_type) {
        return NextResponse.json(
          { success: false, message: "Please select a store with branch code" },
          { status: 400 }
        );
      }

      const existingOrder = await OrderNew.findById(orderId).select("order_owner").lean();
      if (!existingOrder) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }
      const uniletOrder = String(existingOrder.order_owner || "").trim().toLowerCase() === "unilet";
      const branchPattern = pickup_type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingStore = await StoreListing.findOne({
        branch_code: { $regex: new RegExp(`^${branchPattern}$`, "i") },
        ...ownerFieldFilter("store_owner", uniletOrder),
      }).select("_id").lean();
      if (!matchingStore) {
        return NextResponse.json(
          { success: false, message: uniletOrder ? "Select a Unilet store" : "Select a Sathya store" },
          { status: 400 }
        );
      }

      const pickupResult = await OrderNew.updateOne(
        { _id: orderId },
        { $set: { pickup_type, pickup_store: pickup_type } }
      );
      if (!pickupResult.matchedCount) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      const pickupOrder = await OrderNew.findById(orderId).lean();
      return NextResponse.json({ success: true, order: pickupOrder }, { status: 200 });
    }

    const sales_person_role = toSalesPersonValue(body.sales_person_role);
    const sales_person_id = toSalesPersonValue(body.sales_person_id);

    if (sales_person_role == null || sales_person_id == null) {
      return NextResponse.json(
        { success: false, message: "Please select a role and user" },
        { status: 400 }
      );
    }

    const result = await OrderNew.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      {
        $set: {
          sales_person_role,
          sales_person_id,
        },
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const order = await OrderNew.findById(orderId).lean();
    const rawSales = await OrderNew.collection.findOne(
      { _id: new mongoose.Types.ObjectId(orderId) },
      { projection: { sales_person_id: 1, sales_person_role: 1 } }
    );
    if (order && rawSales) {
      order.sales_person_id = rawSales.sales_person_id;
      order.sales_person_role = rawSales.sales_person_role;
    }

    return NextResponse.json({ success: true, order }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

