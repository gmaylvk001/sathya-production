import { NextResponse } from "next/server";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import StoreListing from "@/models/store_listings";
import StoreZone from "@/models/store_zones";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";
import { getAdminUserId } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const EXPORT_LIMIT = 10000;
const ORDER_STATUSES = new Set([
  "Billed",
  "Cancelled",
  "Complete",
  "failure",
  "Order Accepted",
  "Order Placed",
  "ordered",
  "Payment Initiated",
  "pending",
]);
const PAYMENT_MATCH = {
  online: { $regex: "^online$", $options: "i" },
  "Cash on Delivery": { $regex: "^cash on delivery$", $options: "i" },
};

const ORDER_FIELDS =
  "order_number order_username order_phonenumber order_amount order_status payment_method payment_status delivery_type created_at";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dayStart(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayEnd(value) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function zoneNumber(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) ? number : null;
}

function storeKeys(store) {
  return [store?._id, store?.branch_code, store?.exist_id, store?.title]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function storeClause(keys) {
  return {
    $or: [
      { pickup_type: { $in: keys } },
      { pickup_store: { $in: keys } },
      { store_id: { $in: keys } },
    ],
  };
}

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function amountSumStage() {
  return {
    $sum: {
      $convert: {
        input: {
          $cond: [
            { $eq: [{ $type: "$order_amount" }, "string"] },
            { $replaceAll: { input: "$order_amount", find: ",", replacement: "" } },
            { $ifNull: ["$order_amount", 0] },
          ],
        },
        to: "double",
        onError: 0,
        onNull: 0,
      },
    },
  };
}

async function orderIdsForCategory(categoryId) {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) return [];

  const [category, allCategories] = await Promise.all([
    Category.findById(categoryId).select("_id md5_cat_name").lean(),
    Category.find({}).select("_id parentid parentid_new").lean(),
  ]);
  if (!category) return [];

  const md5 = String(category.md5_cat_name || "").trim();
  const childrenByParent = new Map();
  for (const row of allCategories) {
    const parent = String(row.parentid ?? "").trim();
    const parentMd5 = String(row.parentid_new ?? "").trim();
    if (parent && parent.toLowerCase() !== "none") {
      const list = childrenByParent.get(parent) || [];
      list.push(String(row._id));
      childrenByParent.set(parent, list);
    }
    if (parentMd5 && parentMd5.toLowerCase() !== "none") {
      const list = childrenByParent.get(parentMd5) || [];
      list.push(String(row._id));
      childrenByParent.set(parentMd5, list);
    }
  }

  const categoryIds = [];
  const pending = [String(category._id), ...(md5 ? [md5] : [])];
  const seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (mongoose.Types.ObjectId.isValid(current)) categoryIds.push(current);
    const children = childrenByParent.get(current) || [];
    pending.push(...children);
  }
  const productOr = [
    { category: { $in: categoryIds } },
    { sub_category: { $in: categoryIds } },
  ];
  if (md5) {
    const md5Pattern = `^${escapeRegex(md5)}(##|$)`;
    productOr.push({ category_new: md5 });
    productOr.push({ sub_category_new: { $regex: md5Pattern } });
  }

  const products = await Product.find({ $or: productOr }).select("_id item_code").lean();
  if (!products.length) return [];

  const productIds = products.map((product) => String(product._id));
  const itemCodes = new Set();
  for (const product of products) {
    const code = String(product.item_code || "").trim();
    if (!code) continue;
    itemCodes.add(code);
    itemCodes.add(code.startsWith("ITEM") ? code.slice(4) : `ITEM${code}`);
  }
  const codes = [...itemCodes];

  const detailMatch = {
    $or: [
      { product_id: { $in: productIds } },
      ...(codes.length ? [{ item_code: { $in: codes } }] : []),
    ],
  };
  const [detailOrderIds, embeddedOrderIds] = await Promise.all([
    OrderDetailsNew.distinct("order_id", detailMatch),
    OrderNew.distinct("_id", {
      order_owner: "sathya",
      $or: [
        { "order_item.productId": { $in: productIds } },
        { "order_item.product_id": { $in: productIds } },
        { "order_item.id": { $in: productIds } },
        ...(codes.length ? [{ "order_item.item_code": { $in: codes } }] : []),
      ],
    }),
  ]);

  return [...new Set([...detailOrderIds, ...embeddedOrderIds].map((id) => String(id)).filter(Boolean))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

async function buildFilter(searchParams) {
  const startDate = String(searchParams.get("startDate") || "").trim();
  const endDate = String(searchParams.get("endDate") || "").trim();
  const zone = String(searchParams.get("zone") || "").trim();
  const orderStatus = String(searchParams.get("orderStatus") || "").trim();
  const storeId = String(searchParams.get("store") || "").trim();
  const paymentMethod = String(searchParams.get("paymentMethod") || "").trim();
  const categoryId = String(searchParams.get("category") || "").trim();
  const mobile = String(searchParams.get("mobile") || "").trim();

  const start = startDate ? dayStart(startDate) : null;
  const end = endDate ? dayEnd(endDate) : null;
  if ((startDate && !start) || (endDate && !end)) {
    return { error: "Invalid date range" };
  }
  if (start && end && start > end) {
    return { error: "Start date must be on or before the end date" };
  }

  const filter = { order_owner: "sathya" };
  if (start || end) {
    filter.created_at = {};
    if (start) filter.created_at.$gte = start;
    if (end) filter.created_at.$lte = end;
  }
  if (orderStatus) {
    if (!ORDER_STATUSES.has(orderStatus)) return { empty: true };
    filter.order_status = orderStatus;
  }
  if (paymentMethod) {
    const payment = PAYMENT_MATCH[paymentMethod];
    if (!payment) return { empty: true };
    filter.payment_method = payment;
  }
  if (mobile) {
    const digits = mobile.replace(/\D/g, "");
    filter.order_phonenumber = { $regex: escapeRegex(digits || mobile) };
  }

  const clauses = [];

  if (zone || storeId) {
    let keys = [];

    if (storeId) {
      if (!mongoose.Types.ObjectId.isValid(storeId)) return { empty: true };
      const store = await StoreListing.findOne({
        _id: storeId,
        store_owner: "sathya",
      })
        .select("title branch_code exist_id zone_code")
        .lean();
      if (!store) return { empty: true };

      if (zone) {
        const zoneDoc = await StoreZone.findOne({
          $or: [
            { exist_id: zone },
            ...(mongoose.Types.ObjectId.isValid(zone) ? [{ _id: zone }] : []),
          ],
        })
          .select("exist_id")
          .lean();
        const code = zoneNumber(zoneDoc?.exist_id || zone);
        if (code == null || Number(store.zone_code) !== code) return { empty: true };
      }

      keys = storeKeys(store);
    } else {
      const zoneDoc = await StoreZone.findOne({
        $or: [
          { exist_id: zone },
          ...(mongoose.Types.ObjectId.isValid(zone) ? [{ _id: zone }] : []),
        ],
      })
        .select("exist_id")
        .lean();
      const code = zoneNumber(zoneDoc?.exist_id || zone);
      if (code == null) return { empty: true };

      const stores = await StoreListing.find({
        store_owner: "sathya",
        zone_code: code,
      })
        .select("title branch_code exist_id")
        .lean();
      keys = [...new Set(stores.flatMap(storeKeys))];
    }

    if (!keys.length) return { empty: true };
    clauses.push(storeClause(keys));
  }

  if (categoryId) {
    const orderIds = await orderIdsForCategory(categoryId);
    if (!orderIds.length) return { empty: true };
    clauses.push({ _id: { $in: orderIds } });
  }

  if (clauses.length) filter.$and = clauses;
  return { filter };
}

function emptyPayload(page) {
  return {
    success: true,
    orders: [],
    page,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    totalAmount: 0,
  };
}

function excelResponse(orders) {
  const rows = orders.map((order) => ({
    "Order No": order.order_number || "",
    Customer: order.order_username || "",
    Mobile: order.order_phonenumber || "",
    Amount: order.order_amount || "",
    Status: order.order_status || "",
    Payment: order.payment_method || "",
    "Payment Status": order.payment_status || "",
    Delivery: order.delivery_type || "",
    Date: formatWhen(order.created_at),
  }));
  const sheet = XLSX.utils.json_to_sheet(
    rows.length
      ? rows
      : [{
          "Order No": "",
          Customer: "",
          Mobile: "",
          Amount: "",
          Status: "",
          Payment: "",
          "Payment Status": "",
          Delivery: "",
          Date: "",
        }]
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sales");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sathya-sales-report.xlsx"',
    },
  });
}

export async function GET(req) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const isExport = searchParams.get("export") === "1";
    const built = await buildFilter(searchParams);

    if (built.error) {
      return NextResponse.json({ success: false, message: built.error }, { status: 400 });
    }
    if (built.empty) {
      return isExport ? excelResponse([]) : NextResponse.json(emptyPayload(page));
    }

    if (isExport) {
      const orders = await OrderNew.find(built.filter)
        .select(ORDER_FIELDS)
        .sort({ created_at: -1 })
        .limit(EXPORT_LIMIT)
        .lean();
      return excelResponse(orders);
    }

    const [orders, total, amountRows] = await Promise.all([
      OrderNew.find(built.filter)
        .select(ORDER_FIELDS)
        .sort({ created_at: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      OrderNew.countDocuments(built.filter),
      OrderNew.aggregate([
        { $match: built.filter },
        { $group: { _id: null, totalAmount: amountSumStage() } },
      ]),
    ]);

    const totalAmount = Number(amountRows?.[0]?.totalAmount) || 0;

    return NextResponse.json({
      success: true,
      orders,
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      totalAmount,
    });
  } catch (error) {
    console.error("Sales recent orders error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load recent orders" },
      { status: 500 }
    );
  }
}
