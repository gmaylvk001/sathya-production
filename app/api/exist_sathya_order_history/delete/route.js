import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderHistoryNew from "@/models/order_history_new";

const IMPORTED = { exist_id: { $type: "string" } };

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await OrderHistoryNew.deleteMany(IMPORTED);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} history rows deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.historyIds)
      ? body.historyIds
      : body.historyId
        ? [body.historyId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "History ID is required" }, { status: 400 });
    }

    const result = await OrderHistoryNew.deleteMany({
      _id: { $in: validIds },
      ...IMPORTED,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "History row not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "History row deleted successfully"
        : `${result.deletedCount} history rows deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist order history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
