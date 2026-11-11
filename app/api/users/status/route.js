import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const ids = Array.isArray(body.userIds)
      ? body.userIds
      : body.userId
        ? [body.userId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const status = body.status === "Inactive" ? "Inactive" : "Active";

    const result = await User.updateMany(
      { _id: { $in: validIds }, user_type: "user" },
      { status }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: status === "Inactive"
        ? "User set to inactive successfully"
        : "User set to active successfully",
      status,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
