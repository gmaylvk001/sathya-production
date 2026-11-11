import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import User from "@/models/User";
import StoreListing from "@/models/store_listings";
import { getUserAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const SKIPPED = new Set(["payment initiated", "failure"]);
const PENDING = new Set(["ordered", "order placed", "order accepted"]);
const CATEGORY_SALES = new Set(["ordered", "order placed", "order accepted", "billed", "complete"]);
const SELLING = new Set(["complete", "billed"]);

async function authorize(req) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return false;
    const access = await getUserAccess(decoded.userId);
    return access.unrestricted || access.hasRole;
  } catch {
    return false;
  }
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function dayStart(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayEnd(value) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusOf(order) {
  return String(order.order_status || "").trim().toLowerCase();
}

function orderKey(order) {
  const number = String(order.order_number || "").trim();
  return number || String(order._id);
}

function cleanCode(value) {
  return String(value ?? "").trim().replace(/^ITEM/i, "");
}

function lineAmount(price, quantity, discount) {
  const qty = Number(quantity);
  const count = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const total = money(price) * count - money(discount);
  return total > 0 ? roundMoney(total) : 0;
}

function baseMatch() {
  return {
    order_owner: { $ne: "unilet" },
    archive: { $nin: [1, "1"] },
    order_status: { $exists: true, $nin: [null, ""] },
  };
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function monthsBetween(start, end) {
  const keys = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function buildSalesChart(orders, detailsByOrder, start, end) {
  const months = monthsBetween(start, end);
  const buckets = new Map(months.map((key) => [key, { pending: 0, sold: 0, cancelled: 0 }]));

  for (const order of orders) {
    const status = statusOf(order);
    if (!status || SKIPPED.has(status)) continue;
    let field = "";
    if (status === "pending" || PENDING.has(status)) field = "pending";
    else if (status === "billed" || status === "complete") field = "sold";
    else if (status === "cancelled" || status === "canceled") field = "cancelled";
    if (!field) continue;
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const bucket = buckets.get(monthKey(created));
    if (!bucket) continue;
    const lines = detailsByOrder.get(String(order._id)) || [];
    bucket[field] = roundMoney(bucket[field] + orderLineValue(order, lines));
  }

  const series = [...buckets.values()];
  return {
    labels: months.map(monthLabel),
    pending: series.map((row) => row.pending),
    sold: series.map((row) => row.sold),
    cancelled: series.map((row) => row.cancelled),
  };
}

function buildOrdersChart(orders, start, end) {
  const months = monthsBetween(start, end);
  const buckets = new Map(months.map((key) => [key, {
    pending: new Set(),
    billed: new Set(),
    complete: new Set(),
    cancelled: new Set(),
  }]));

  for (const order of orders) {
    const status = statusOf(order);
    if (!status || SKIPPED.has(status)) continue;
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const bucket = buckets.get(monthKey(created));
    if (!bucket) continue;
    const key = orderKey(order);
    if (status === "pending" || PENDING.has(status)) bucket.pending.add(key);
    else if (status === "billed") bucket.billed.add(key);
    else if (status === "complete") bucket.complete.add(key);
    else if (status === "cancelled" || status === "canceled") bucket.cancelled.add(key);
  }

  const series = [...buckets.values()];
  return {
    labels: months.map(monthLabel),
    pending: series.map((row) => row.pending.size),
    billed: series.map((row) => row.billed.size),
    complete: series.map((row) => row.complete.size),
    cancelled: series.map((row) => row.cancelled.size),
  };
}

function isMainParent(parentid) {
  const parent = String(parentid ?? "").trim().toLowerCase();
  return !parent || parent === "none" || parent === "null";
}

function mainCategory(startId, byId) {
  let current = byId.get(String(startId || ""));
  for (let guard = 0; current && guard < 6; guard += 1) {
    if (isMainParent(current.parentid)) {
      return { id: String(current._id), name: current.category_name || "" };
    }
    const next = byId.get(String(current.parentid));
    if (!next) {
      return { id: String(current._id), name: current.category_name || "" };
    }
    current = next;
  }
  return null;
}

function subCategoryName(product, byId) {
  const named = String(product.sub_category_new_name || "").trim();
  const subId = String(product.sub_category || product.sub_category_new || "").trim();
  const sub = byId.get(subId);
  if (sub?.category_name) return sub.category_name;
  if (named) return named;
  const cat = byId.get(String(product.category || product.category_new || "").trim());
  return cat?.category_name || "";
}

async function loadOrders(match) {
  return OrderNew.collection
    .find(match)
    .project({
      order_number: 1,
      order_amount: 1,
      order_status: 1,
      type: 1,
      sales_person_id: 1,
      order_item: 1,
      created_at: 1,
    })
    .toArray();
}

async function loadDetails(orders) {
  if (!orders.length) return [];
  return OrderDetailsNew.find(
    { order_id: { $in: orders.map((order) => order._id) } },
    {
      order_id: 1,
      product_id: 1,
      item_code: 1,
      product_price: 1,
      quantity: 1,
      checkout_offer_discount: 1,
    }
  ).lean();
}

function detailValue(row) {
  return lineAmount(row.product_price, row.quantity, row.checkout_offer_discount);
}

function itemValue(item) {
  return lineAmount(item?.price ?? item?.product_price, item?.quantity, item?.checkout_offer_discount ?? item?.discount);
}

function orderLineValue(order, details) {
  if (details.length) {
    const sum = details.reduce((total, row) => total + detailValue(row), 0);
    if (sum > 0) return roundMoney(sum);
  }
  const items = Array.isArray(order.order_item) ? order.order_item : [];
  const itemSum = items.reduce((total, item) => total + itemValue(item), 0);
  if (itemSum > 0) return roundMoney(itemSum);
  return roundMoney(money(order.order_amount));
}

async function categoryLookup(orders, detailsByOrder) {
  const productIds = [];
  const itemCodes = [];
  for (const order of orders) {
    const items = Array.isArray(order.order_item) ? order.order_item : [];
    for (const item of items) {
      const id = String(item?.productId || item?.product_id || item?.id || "").trim();
      if (mongoose.Types.ObjectId.isValid(id)) productIds.push(id);
      const code = cleanCode(item?.item_code);
      if (code) itemCodes.push(code);
    }
    for (const row of detailsByOrder.get(String(order._id)) || []) {
      const id = String(row.product_id || "").trim();
      if (mongoose.Types.ObjectId.isValid(id)) productIds.push(id);
      const code = cleanCode(row.item_code);
      if (code) itemCodes.push(code);
    }
  }

  const query = [];
  const ids = [...new Set(productIds)];
  const codes = [...new Set(itemCodes)];
  if (ids.length) query.push({ _id: { $in: ids } });
  if (codes.length) query.push({ item_code: { $in: codes } });
  const products = query.length
    ? await Product.find(
        { $or: query },
        { category: 1, sub_category: 1, category_new: 1, sub_category_new: 1, sub_category_new_name: 1, item_code: 1 }
      ).lean()
    : [];

  const categories = await Category.find({}, { category_name: 1, parentid: 1 }).lean();
  const byId = new Map(categories.map((row) => [String(row._id), row]));
  const byProductId = new Map();
  const byCode = new Map();
  for (const product of products) {
    byProductId.set(String(product._id), product);
    if (product.item_code) byCode.set(String(product.item_code), product);
  }
  return { byId, byProductId, byCode };
}

function productForRef(ref, lookup) {
  return lookup.byProductId.get(ref.productId) || lookup.byCode.get(ref.itemCode) || null;
}

function refsFor(order, details) {
  const refs = [];
  for (const row of details) {
    refs.push({
      productId: String(row.product_id || "").trim(),
      itemCode: cleanCode(row.item_code),
      value: detailValue(row),
    });
  }
  if (refs.length) return refs;
  const items = Array.isArray(order.order_item) ? order.order_item : [];
  for (const item of items) {
    refs.push({
      productId: String(item?.productId || item?.product_id || item?.id || "").trim(),
      itemCode: cleanCode(item?.item_code),
      value: itemValue(item),
    });
  }
  return refs;
}

export async function GET(req) {
  if (!(await authorize(req))) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const paymentMethod = String(searchParams.get("paymentMethod") || "").trim();
    const orderType = String(searchParams.get("orderType") || "").trim().toLowerCase();
    const storeId = String(searchParams.get("storeId") || "").trim();
    
    const start = startDate ? dayStart(startDate) : null;
    const end = endDate ? dayEnd(endDate) : null;
    
    if ((startDate && !start) || (endDate && !end)) {
      return NextResponse.json({ success: false, message: "Invalid date range" }, { status: 400 });
    }

    const stores = await StoreListing.find(
      {},
      { title: 1, organisation_name: 1, store_name: 1, name: 1, branch_code: 1, exist_id: 1 }
    ).lean();
    const storeOptions = stores
      .map((store) => ({
        id: String(store._id),
        name: store.title || store.organisation_name || store.store_name || store.name || "Store",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const match = {
      ...baseMatch(),
    };
    if (start && end) {
      match.created_at = { $gte: start, $lte: end };
    }
    if (paymentMethod) {
      match.payment_method = { $regex: `^${escapeRegex(paymentMethod)}$`, $options: "i" };
    }
    if (orderType === "online" || orderType === "offline") {
      match.type = orderType;
    }
    if (storeId) {
      const store = stores.find((row) => String(row._id) === storeId);
      const keys = [storeId, store?.branch_code, store?.exist_id, store?.title]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      match.$or = [
        { pickup_type: { $in: keys } },
        { pickup_store: { $in: keys } },
        { store_id: { $in: keys } },
      ];
    }

    const orders = await loadOrders(match);
    const details = await loadDetails(orders);
    const detailsByOrder = new Map();
    for (const row of details) {
      const key = String(row.order_id);
      const list = detailsByOrder.get(key) || [];
      list.push(row);
      detailsByOrder.set(key, list);
    }

    const seen = new Set();
    const stats = {
      total: 0,
      totalAmount: 0,
      complete: 0,
      pending: 0,
      billed: 0,
      rejected: 0,
    };

    for (const order of orders) {
      const status = statusOf(order);
      if (!status || seen.has(orderKey(order))) continue;
      seen.add(orderKey(order));
      if (SKIPPED.has(status)) continue;
      stats.total += 1;
      if (status !== "cancelled" && status !== "canceled") {
        const lines = detailsByOrder.get(String(order._id)) || [];
        stats.totalAmount = roundMoney(stats.totalAmount + orderLineValue(order, lines));
      }
      if (status === "complete") stats.complete += 1;
      else if (PENDING.has(status)) stats.pending += 1;
      else if (status === "billed") stats.billed += 1;
      else if (status === "cancelled" || status === "canceled") stats.rejected += 1;
    }

    const sellingOrders = orders.filter((order) => SELLING.has(statusOf(order)));
    const lookup = await categoryLookup(sellingOrders, detailsByOrder);
    const categoryTotals = new Map();

    for (const order of sellingOrders) {
      const lines = detailsByOrder.get(String(order._id)) || [];
      for (const ref of refsFor(order, lines)) {
        const product = productForRef(ref, lookup);
        const name = product ? subCategoryName(product, lookup.byId) : "";
        if (!name) continue;
        const current = categoryTotals.get(name) || { name, orders: 0, value: 0 };
        current.orders += 1;
        current.value = roundMoney(current.value + (ref.value || 0));
        categoryTotals.set(name, current);
      }
    }

    const personIds = [...new Set(
      sellingOrders
        .map((order) => String(order.sales_person_id ?? "").trim())
        .filter(Boolean)
    )];
    const personObjectIds = personIds.filter((id) => mongoose.Types.ObjectId.isValid(id) && id.length === 24);
    const people = personIds.length
      ? await User.find(
          {
            $or: [
              ...(personObjectIds.length ? [{ _id: { $in: personObjectIds } }] : []),
              { exist_id: { $in: personIds } },
            ],
          },
          { name: 1, last_name: 1, email: 1, exist_id: 1 }
        ).lean()
      : [];
    const personName = new Map();
    for (const person of people) {
      const name = [person.name, person.last_name].filter(Boolean).join(" ") || person.email || "Sales person";
      personName.set(String(person._id), { id: String(person._id), name });
      if (person.exist_id) personName.set(String(person.exist_id), { id: String(person._id), name });
    }

    const salesTotals = new Map();
    for (const order of sellingOrders) {
      const rawId = String(order.sales_person_id ?? "").trim();
      if (!rawId) continue;
      const person = personName.get(rawId) || { id: rawId, name: `Sales person ${rawId}` };
      const lines = detailsByOrder.get(String(order._id)) || [];
      const current = salesTotals.get(person.id) || { name: person.name, orders: 0, value: 0 };
      current.orders += 1;
      current.value = roundMoney(current.value + orderLineValue(order, lines));
      salesTotals.set(person.id, current);
    }

    const byCount = (a, b) => b.orders - a.orders || b.value - a.value;
    
    let chartStart = start;
    let chartEnd = end;
    if (!chartStart || !chartEnd) {
      if (orders.length > 0) {
        const dates = orders.map(o => o.created_at ? new Date(o.created_at).getTime() : null).filter(Boolean);
        chartStart = dates.length ? new Date(Math.min(...dates)) : new Date();
        chartEnd = dates.length ? new Date(Math.max(...dates)) : new Date();
      } else {
        chartStart = new Date();
        chartEnd = new Date();
      }
    }

    const [charts, paymentValues] = await Promise.all([
      buildCharts(orders, detailsByOrder, chartStart, chartEnd),
      OrderNew.collection.distinct("payment_method", {
        payment_method: { $nin: [null, ""] },
      }),
    ]);
    const paymentMethods = [...new Set(paymentValues.map((value) => String(value).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      paymentMethods,
      stores: storeOptions,
      stats,
      categories: [...categoryTotals.values()].sort(byCount).slice(0, 10),
      salesPersons: [...salesTotals.values()].sort(byCount).slice(0, 10),
      charts,
    });
  } catch (error) {
    console.error("Sales dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load sales dashboard" },
      { status: 500 }
    );
  }
}

async function buildCharts(filteredOrders, detailsByOrder, rangeStart, rangeEnd) {
  const ordersChart = buildOrdersChart(filteredOrders, rangeStart, rangeEnd);
  const salesChart = buildSalesChart(filteredOrders, detailsByOrder, rangeStart, rangeEnd);
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const lastMonthOrders = await loadOrders({
    ...baseMatch(),
    created_at: { $gte: previous, $lte: previousEnd },
    type: "online",
  });
  const lastMonthDetails = await loadDetails(lastMonthOrders);
  const lastMonthByOrder = new Map();
  for (const row of lastMonthDetails) {
    const key = String(row.order_id);
    const list = lastMonthByOrder.get(key) || [];
    list.push(row);
    lastMonthByOrder.set(key, list);
  }
  const lastLookup = await categoryLookup(lastMonthOrders, lastMonthByOrder);
  const mainTotals = new Map();
  for (const order of lastMonthOrders) {
    if (!CATEGORY_SALES.has(statusOf(order))) continue;
    const lines = lastMonthByOrder.get(String(order._id)) || [];
    for (const ref of refsFor(order, lines)) {
      const product = productForRef(ref, lastLookup);
      if (!product) continue;
      const startId = product.category || product.category_new || product.sub_category || product.sub_category_new;
      const category = mainCategory(startId, lastLookup.byId);
      if (!category?.id || !category.name) continue;
      const current = mainTotals.get(category.id) || { name: category.name, value: 0 };
      current.value = roundMoney(current.value + (ref.value || 0));
      mainTotals.set(category.id, current);
    }
  }
  const categoryRows = [...mainTotals.values()].sort((a, b) => b.value - a.value);
  const catDate = previous.toLocaleString("en-US", { month: "short", year: "numeric" }).replace(" ", "-");

  return {
    orders: ordersChart,
    sales: salesChart,
    categories: {
      title: `${catDate} Business Category Sales Report`,
      labels: categoryRows.map((row) => row.name),
      values: categoryRows.map((row) => row.value),
    },
  };
}
