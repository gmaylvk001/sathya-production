import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaOrder from "@/models/ExistSathyaOrder";
import { withMovedFlag } from "@/lib/existOrderMoved";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const SORT = { created_at: -1, exist_id: -1 };
const FIELD_FILTERS = ["order_status", "delivery_type", "type", "api_status"];

let listIndexReady = null;
let optionsCache = { at: 0, value: null, promise: null };

function ensureListIndex() {
  if (!listIndexReady) {
    listIndexReady = ExistSathyaOrder.collection
      .createIndex({ created_at: -1, exist_id: -1 }, { name: "created_at_-1_exist_id_-1" })
      .catch((error) => {
        listIndexReady = null;
        console.error("Exist order list index:", error?.message);
      });
  }
  return listIndexReady;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanList(values) {
  return [...new Set((values || []).map((value) => (value == null ? "" : String(value).trim())).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function getFilterOptions() {
  if (optionsCache.value && Date.now() - optionsCache.at < 60000) {
    return optionsCache.value;
  }
  if (!optionsCache.promise) {
    optionsCache.promise = ExistSathyaOrder.aggregate([
      {
        $group: {
          _id: null,
          order_status: { $addToSet: "$order_status" },
          delivery_type: { $addToSet: "$delivery_type" },
          type: { $addToSet: "$type" },
          api_status: { $addToSet: "$api_status" },
        },
      },
    ])
      .then((rows) => {
        const row = rows[0] || {};
        const value = {
          order_status: cleanList(row.order_status),
          delivery_type: cleanList(row.delivery_type),
          type: cleanList(row.type),
          api_status: cleanList(row.api_status),
        };
        optionsCache = { at: Date.now(), value, promise: null };
        return value;
      })
      .catch((error) => {
        optionsCache.promise = null;
        console.error("Exist order filter options:", error?.message);
        return {
          order_status: [],
          delivery_type: [],
          type: [],
          api_status: [],
        };
      });
  }
  return optionsCache.promise;
}

function buildFieldFilter(searchParams) {
  const filter = {};
  for (const field of FIELD_FILTERS) {
    const value = String(searchParams.get(field) || "").trim();
    if (value) filter[field] = value;
  }
  return filter;
}

function buildViewFilter(searchParams) {
  const filter = buildFieldFilter(searchParams);
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));
  if (start || end) {
    filter.created_at = {};
    if (start) filter.created_at.$gte = start;
    if (end) filter.created_at.$lte = end;
  }

  const q = String(searchParams.get("q") || "").trim().slice(0, 80);
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { exist_id: pattern },
      { order_number: pattern },
      { order_username: pattern },
      { order_phonenumber: pattern },
      { user_id: pattern },
      { pickup_type: pattern },
    ];
  }
  return filter;
}

async function scanMoved({ filter, moveStatus, skip, limit }) {
  const cursor = ExistSathyaOrder.find(filter)
    .select("_id order_number exist_id")
    .sort(SORT)
    .lean()
    .cursor({ batchSize: 1000 });

  let total = 0;
  const pageIds = [];
  let batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch;
    batch = [];
    const marked = await withMovedFlag(chunk);
    for (const row of marked) {
      const keep = moveStatus === "moved" ? Boolean(row.is_moved) : !row.is_moved;
      if (!keep) continue;
      if (limit > 0 && total >= skip && pageIds.length < limit) pageIds.push(row._id);
      total += 1;
    }
  };

  try {
    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= 1000) await flush();
    }
    await flush();
  } finally {
    await cursor.close();
  }

  return { total, pageIds };
}

async function loadPage(pageIds) {
  if (!pageIds.length) return [];
  const docs = await ExistSathyaOrder.find({ _id: { $in: pageIds } }).lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const ordered = pageIds.map((id) => byId.get(String(id))).filter(Boolean);
  return withMovedFlag(ordered);
}

export async function GET(req) {
  try {
    await dbConnect();
    await ensureListIndex();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;
    const move = String(searchParams.get("move") || "").trim();
    const hasMove = move === "moved" || move === "unmoved";
    const viewFilter = buildViewFilter(searchParams);
    const deleteFilter = buildFieldFilter(searchParams);
    const hasDeleteFilter = Object.keys(deleteFilter).length > 0 || hasMove;

    const optionsPromise = getFilterOptions();
    const collectionTotalPromise = ExistSathyaOrder.countDocuments({});

    let rows = [];
    let total = 0;
    let filterDeleteCount = 0;

    if (!hasMove) {
      const [found, viewTotal, deleteTotal] = await Promise.all([
        ExistSathyaOrder.find(viewFilter).sort(SORT).skip(skip).limit(limit).lean(),
        ExistSathyaOrder.countDocuments(viewFilter),
        hasDeleteFilter ? ExistSathyaOrder.countDocuments(deleteFilter) : Promise.resolve(0),
      ]);
      rows = await withMovedFlag(found);
      total = viewTotal;
      filterDeleteCount = deleteTotal;
    } else {
      const sameFilter = JSON.stringify(viewFilter) === JSON.stringify(deleteFilter);
      if (sameFilter) {
        const scanned = await scanMoved({ filter: viewFilter, moveStatus: move, skip, limit });
        total = scanned.total;
        filterDeleteCount = scanned.total;
        rows = await loadPage(scanned.pageIds);
      } else {
        const [scanned, deleteScanned] = await Promise.all([
          scanMoved({ filter: viewFilter, moveStatus: move, skip, limit }),
          scanMoved({ filter: deleteFilter, moveStatus: move, skip: 0, limit: 0 }),
        ]);
        total = scanned.total;
        filterDeleteCount = hasDeleteFilter ? deleteScanned.total : 0;
        rows = await loadPage(scanned.pageIds);
      }
    }

    const [options, collectionTotal] = await Promise.all([optionsPromise, collectionTotalPromise]);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      totalPages,
      collectionTotal,
      filterDeleteCount,
      options,
    });
  } catch (error) {
    console.error("Error fetching exist sathya orders:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
