import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/adminRequest";
import OrderNew from "@/models/orders_new";
import OwnerProduct from "@/models/OwnerProduct";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import StoreListing from "@/models/store_listings";

export const dynamic = "force-dynamic";

const STATUS_COLORS = {
  pending: "#fbbf24",
  cancelled: "#ef4444",
  canceled: "#ef4444",
  shipped: "#22c55e",
  ordered: "#d72828",
  "order placed": "#d72828",
  "order accepted": "#d72828",
  complete: "#16a34a",
  billed: "#0ea5e9",
  failure: "#9ca3af",
  "payment initiated": "#a78bfa",
};

const EXTRA_COLORS = ["#6366f1", "#f59e0b", "#14b8a6", "#64748b", "#ec4899"];

function labelStatus(status) {
  const text = String(status || "unknown").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();

    const uniletStores = await StoreListing.find({
      store_owner: { $regex: /^unilet$/i },
    })
      .select("_id branch_code")
      .lean();

    const storeKeys = [
      ...new Set(
        uniletStores
          .flatMap((store) => [String(store._id), String(store.branch_code || "").trim()])
          .filter((value) => value && value.toLowerCase() !== "null")
      ),
    ];

    const orderMatch = [{ order_owner: { $regex: /^unilet$/i } }];
    if (storeKeys.length) {
      orderMatch.push({ store_id: { $in: storeKeys } });
      orderMatch.push({ pickup_store: { $in: storeKeys } });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const amountExpr = {
      $convert: {
        input: {
          $trim: {
            input: {
              $replaceAll: {
                input: { $toString: { $ifNull: ["$order_amount", ""] } },
                find: ",",
                replacement: "",
              },
            },
          },
        },
        to: "double",
        onError: 0,
        onNull: 0,
      },
    };
    const createdExpr = {
      $convert: {
        input: { $ifNull: ["$created_at", "$createdAt"] },
        to: "date",
        onError: null,
        onNull: null,
      },
    };
    const statusExpr = {
      $let: {
        vars: {
          raw: {
            $toLower: {
              $trim: {
                input: { $toString: { $ifNull: ["$order_status", "unknown"] } },
              },
            },
          },
        },
        in: { $cond: [{ $eq: ["$$raw", ""] }, "unknown", "$$raw"] },
      },
    };
    const userExpr = {
      $trim: {
        input: { $toString: { $ifNull: ["$user_id", ""] } },
      },
    };

    const [orderStats, ownerRows, mainCategories] = await Promise.all([
      OrderNew.aggregate([
        { $match: { $or: orderMatch } },
        {
          $addFields: {
            _amount: amountExpr,
            _created: createdExpr,
            _status: statusExpr,
            _user: userExpr,
          },
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  revenue: { $sum: "$_amount" },
                  pending: {
                    $sum: { $cond: [{ $eq: ["$_status", "pending"] }, 1, 0] },
                  },
                },
              },
            ],
            customers: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: [{ $toLower: "$_user" }, ""] },
                      { $ne: [{ $toLower: "$_user" }, "null"] },
                    ],
                  },
                },
              },
              { $group: { _id: "$_user" } },
              { $count: "customerCount" },
            ],
            last30: [
              { $match: { _created: { $gte: since } } },
              {
                $group: {
                  _id: null,
                  last30Orders: { $sum: 1 },
                  last30Revenue: { $sum: "$_amount" },
                },
              },
            ],
            byDay: [
              { $match: { _created: { $type: "date" } } },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$_created",
                      timezone: "Asia/Kolkata",
                    },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            byStatus: [
              {
                $group: {
                  _id: "$_status",
                  count: { $sum: 1 },
                  latest: { $max: "$_created" },
                },
              },
              { $sort: { latest: -1, _id: 1 } },
            ],
            recent: [
              { $sort: { created_at: -1 } },
              { $limit: 5 },
              {
                $project: {
                  order_number: 1,
                  order_username: 1,
                  order_amount: 1,
                  order_status: 1,
                },
              },
            ],
          },
        },
      ]).allowDiskUse(true),
      OwnerProduct.find({
        owner_id: { $regex: /^unilet$/i },
        is_active: true,
      })
        .select("product_id")
        .lean(),
      Category.find({ status: "Active", parentid: "none" })
        .select("category_name")
        .lean(),
    ]);

    const facet = orderStats[0] || {};
    const totals = facet.totals?.[0] || { totalOrders: 0, revenue: 0, pending: 0 };
    const last30 = facet.last30?.[0] || { last30Orders: 0, last30Revenue: 0 };
    const customerCount = facet.customers?.[0]?.customerCount || 0;

    const productIds = [
      ...new Set(
        ownerRows
          .map((row) => String(row.product_id || ""))
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).select("category").lean()
      : [];

    const categoryName = new Map(
      mainCategories.map((category) => [String(category._id), category.category_name])
    );
    const categoryCounts = new Map();
    for (const product of products) {
      const name = categoryName.get(String(product.category || ""));
      if (!name) continue;
      categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1);
    }

    const dayRows = Array.isArray(facet.byDay) ? facet.byDay : [];
    const statusRows = Array.isArray(facet.byStatus) ? facet.byStatus : [];
    const recentRows = Array.isArray(facet.recent) ? facet.recent : [];

    return NextResponse.json({
      success: true,
      totalOrders: totals.totalOrders || 0,
      revenue: Math.round((totals.revenue || 0) * 100) / 100,
      last30Orders: last30.last30Orders || 0,
      last30Revenue: Math.round((last30.last30Revenue || 0) * 100) / 100,
      pending: totals.pending || 0,
      productCount: productIds.length,
      customerCount,
      line: {
        labels: dayRows.map((row) => row._id),
        data: dayRows.map((row) => row.count || 0),
      },
      categories: [...categoryCounts.entries()].map(([category, count]) => ({
        category,
        count,
      })),
      statuses: statusRows.map((row, index) => ({
        label: labelStatus(row._id),
        count: row.count || 0,
        color: STATUS_COLORS[row._id] || EXTRA_COLORS[index % EXTRA_COLORS.length],
      })),
      recentOrders: recentRows.map((order) => ({
        _id: String(order._id),
        order_number: order.order_number || "",
        order_username: order.order_username || "",
        order_amount: order.order_amount || 0,
        order_status: order.order_status || "",
      })),
    });
  } catch (error) {
    console.error("Unilet dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load Unilet dashboard" },
      { status: 500 }
    );
  }
}
