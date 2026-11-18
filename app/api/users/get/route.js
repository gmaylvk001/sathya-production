import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getMappedLiveUserIdSet } from "@/lib/existUserDetailsMap";
import { getAdminUserId } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

const LIST_FIELDS =
  "_id name last_name email mobile user_type role status store_id exist_id notify_status notify_pincode orders_fetched avatar createdAt updatedAt";

let listIndexReady = null;
let existCountCache = { at: 0, value: null, promise: null };

async function getExistOrderCounts() {
  if (existCountCache.value && Date.now() - existCountCache.at < 60000) {
    return existCountCache.value;
  }
  if (!existCountCache.promise) {
    const existIdText = {
      $convert: { input: { $ifNull: ["$exist_id", ""] }, to: "string", onError: "", onNull: "" },
    };
    const hasExistId = { $gt: [{ $strLenCP: existIdText }, 0] };
    existCountCache.promise = User.aggregate([
      { $match: { user_type: "user" } },
      {
        $group: {
          _id: null,
          existUsersCount: { $sum: { $cond: [hasExistId, 1, 0] } },
          alreadyFetchedOrdersCount: {
            $sum: {
              $cond: [{ $and: [hasExistId, { $in: ["$orders_fetched", [1, "1"]] }] }, 1, 0],
            },
          },
        },
      },
    ])
      .then((rows) => {
        const row = rows[0] || {};
        const value = {
          existUsersCount: row.existUsersCount || 0,
          alreadyFetchedOrdersCount: row.alreadyFetchedOrdersCount || 0,
        };
        existCountCache = { at: Date.now(), value, promise: null };
        return value;
      })
      .catch((error) => {
        existCountCache.promise = null;
        throw error;
      });
  }
  return existCountCache.promise;
}

function ensureUserListIndex() {
  if (!listIndexReady) {
    listIndexReady = User.collection
      .createIndex({ user_type: 1, createdAt: -1 }, { name: "user_type_1_createdAt_-1" })
      .catch((error) => {
        listIndexReady = null;
        console.error("User list index:", error?.message);
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

export async function GET(req) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { message: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    await dbConnect();
    await ensureUserListIndex();

    const { searchParams } = new URL(req.url);
    if (!searchParams.has("page")) {
      const users = await User.find({ user_type: "user" })
        .select("_id name")
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .lean();
      return NextResponse.json(users, { status: 200 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status") || "";
    const q = (searchParams.get("q") || "").trim().slice(0, 80);
    const startDate = parseDate(searchParams.get("start"));
    const endDate = parseDate(searchParams.get("end"));

    const filter = { user_type: "user" };
    if (status === "Active" || status === "Inactive") filter.status = status;
    if (startDate && endDate) filter.createdAt = { $gte: startDate, $lte: endDate };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { last_name: rx }, { email: rx }, { mobile: rx }];
    }

    const [counts, total, users] = await Promise.all([
      getExistOrderCounts(),
      User.countDocuments(filter),
      User.find(filter)
        .select(LIST_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const mapped = await getMappedLiveUserIdSet(users.map((user) => user._id));
    const data = users.map((user) => {
      const { password, confirmation_code, remember_token, ...safeUser } = user;
      return {
        ...safeUser,
        details_fetched: mapped.has(String(user._id)),
      };
    });

    const existUsersCount = counts.existUsersCount || 0;
    const alreadyFetchedOrdersCount = counts.alreadyFetchedOrdersCount || 0;

    return NextResponse.json(
      {
        data,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        existUsersCount,
        pendingOrdersFetchCount: Math.max(0, existUsersCount - alreadyFetchedOrdersCount),
        alreadyFetchedOrdersCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

