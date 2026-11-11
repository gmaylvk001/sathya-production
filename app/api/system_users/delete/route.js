import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";
import { requireAdmin } from "@/lib/adminRequest";

export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

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

    const result = await User.deleteMany({
      _id: { $in: validIds },
      user_type: "admin",
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await ExistSathyaUserDetail.updateMany(
      { live_user_id: { $in: validIds } },
      { $set: { live_user_id: null } }
    );

    const message =
      result.deletedCount === 1
        ? "User deleted successfully"
        : `${result.deletedCount} users deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting system user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
