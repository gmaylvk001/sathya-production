import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { mapUserDetailsToLiveUser } from "@/lib/existUserDetailsMap";

export async function POST(req) {
  try {
    await dbConnect();
    const { userId } = await req.json();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existId = String(user.exist_id || "").trim();
    if (!existId) {
      return NextResponse.json({ error: "This user has no Exist ID" }, { status: 400 });
    }

    const { matchedCount, modifiedCount } = await mapUserDetailsToLiveUser(existId, user._id);

    if (!matchedCount) {
      return NextResponse.json({
        error: "No user details found for this Exist ID",
        fetched: false,
        matchedCount: 0,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fetched: true,
      matchedCount,
      modifiedCount,
      message: `User details fetched successfully (${matchedCount} row${matchedCount === 1 ? "" : "s"})`,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json({ error: "Failed to fetch user details", message: error.message }, { status: 500 });
  }
}
