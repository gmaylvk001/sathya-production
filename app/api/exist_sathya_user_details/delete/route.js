import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await ExistSathyaUserDetail.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} user details deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.detailIds)
      ? body.detailIds
      : body.detailId
        ? [body.detailId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "User detail ID is required" }, { status: 400 });
    }

    const result = await ExistSathyaUserDetail.deleteMany({ _id: { $in: validIds } });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "User detail not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "User detail deleted successfully"
        : `${result.deletedCount} user details deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist sathya user detail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
