import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaUserSkipped from "@/models/ExistSathyaUserSkipped";

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await ExistSathyaUserSkipped.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} skipped users deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.userIds)
      ? body.userIds
      : body.userId
        ? [body.userId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Skipped user ID is required" }, { status: 400 });
    }

    const result = await ExistSathyaUserSkipped.deleteMany({ _id: { $in: validIds } });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Skipped user not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Skipped user deleted successfully"
        : `${result.deletedCount} skipped users deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting skipped exist sathya user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
