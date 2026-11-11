import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaOrderDetail from "@/models/ExistSathyaOrderDetail";

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await ExistSathyaOrderDetail.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} order details deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.orderIds)
      ? body.orderIds
      : body.orderId
        ? [body.orderId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Order detail ID is required" }, { status: 400 });
    }

    const result = await ExistSathyaOrderDetail.deleteMany({ _id: { $in: validIds } });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Order detail not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Order detail deleted successfully"
        : `${result.deletedCount} order details deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist sathya order detail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
