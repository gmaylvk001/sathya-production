import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { verifyToken } from "@/lib/verifyToken";
import CancelOrders from "@/models/cancel_orders";

// Only imported rows; live cancel requests (cancel_orders_live) are never deleted here
const IMPORTED = { exist_id: { $type: "string" } };

export async function DELETE(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let decoded = null;
  try {
    decoded = token ? verifyToken(token) : null;
  } catch {
    decoded = null;
  }
  if (!decoded) {
    return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await CancelOrders.deleteMany(IMPORTED);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} cancel order rows deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const ids = Array.isArray(body.cancelIds)
      ? body.cancelIds
      : body.cancelId
        ? [body.cancelId]
        : [];

    const validIds = [...new Set(ids.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return NextResponse.json({ error: "Cancel order ID is required" }, { status: 400 });
    }

    const result = await CancelOrders.deleteMany({
      _id: { $in: validIds },
      ...IMPORTED,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Cancel order row not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Cancel order row deleted successfully"
        : `${result.deletedCount} cancel order rows deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist cancel orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
