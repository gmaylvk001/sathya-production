import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const details = await ExistSathyaUserDetail.find()
      .sort({ created_at: -1, exist_id: -1 })
      .lean();

    const liveIds = [...new Set(
      details
        .map((row) => String(row.live_user_id || "").trim())
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    )];

    const liveUsers = liveIds.length
      ? await User.find({ _id: { $in: liveIds } }, { _id: 1 }).lean()
      : [];
    const liveSet = new Set(liveUsers.map((user) => String(user._id)));

    const data = details.map((row) => {
      const liveUserId = String(row.live_user_id || "").trim();
      const is_mapped = Boolean(liveUserId && liveSet.has(liveUserId));
      return {
        ...row,
        is_mapped,
      };
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching exist sathya user details:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
