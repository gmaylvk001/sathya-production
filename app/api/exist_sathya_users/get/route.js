import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaUser, { ensureExistSathyaUserIndexes } from "@/models/ExistSathyaUser";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toKey(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeExistId(value) {
  const text = toKey(value);
  if (!text) return "";
  if (/^\d+(\.0+)?$/.test(text)) {
    return String(Math.trunc(Number(text)));
  }
  return text;
}

function normalizePhone(value) {
  const text = toKey(value);
  return text;
}

export async function GET() {
  try {
    await dbConnect();
    await ensureExistSathyaUserIndexes();
    const users = await ExistSathyaUser.find()
      .select("-remember_token -confirmation_code")
      .sort({ created_at: -1 })
      .lean();

    const liveUsers = await User.find({}, { exist_id: 1, email: 1, mobile: 1 }).lean();
    const movedExistIds = new Set();
    const movedEmails = new Set();
    const movedMobiles = new Set();

    for (const live of liveUsers) {
      const existId = normalizeExistId(live.exist_id);
      if (existId) movedExistIds.add(existId);
      const email = toKey(live.email).toLowerCase();
      if (email) movedEmails.add(email);
      const mobile = normalizePhone(live.mobile);
      if (mobile) movedMobiles.add(mobile);
    }

    const data = users.map(({ password, ...user }) => {
      const existId = normalizeExistId(user.exist_id);
      const email = toKey(user.email).toLowerCase();
      const phone = normalizePhone(user.phone);
      const is_moved = existId
        ? movedExistIds.has(existId)
        : (email ? movedEmails.has(email) : false) || (phone ? movedMobiles.has(phone) : false);

      return {
        ...user,
        has_password: Boolean(password && String(password).trim()),
        is_moved,
      };
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching exist sathya users:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
