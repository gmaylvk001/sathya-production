import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreListing from "@/models/store_listings";

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await StoreListing.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} listings deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Listing ID is required" }, { status: 400 });
    }

    const result = await StoreListing.deleteMany({ _id: { $in: validIds } });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message:
        result.deletedCount === 1
          ? "Listing deleted successfully"
          : `${result.deletedCount} listings deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting store listing:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
