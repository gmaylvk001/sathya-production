import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaOrder from "@/models/ExistSathyaOrder";

const FILTER_FIELDS = ["order_status", "delivery_type", "type", "api_status"];

function buildFilter(body) {
  const filter = {};
  for (const field of FILTER_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      filter[field] = String(value).trim();
    }
  }
  return filter;
}

export async function DELETE(req) {
  await dbConnect();

  try {
    const body = await req.json();

    if (body.deleteAll === true) {
      const result = await ExistSathyaOrder.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} orders deleted successfully`,
        deletedCount: result.deletedCount,
      });
    }

    const filter = buildFilter(body);
    if (Object.keys(filter).length > 0 && !body.orderId && !body.orderIds) {
      const result = await ExistSathyaOrder.deleteMany(filter);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} orders deleted successfully`,
        deletedCount: result.deletedCount,
        filter,
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
      return NextResponse.json({ error: "Order ID or delete filter is required" }, { status: 400 });
    }

    const result = await ExistSathyaOrder.deleteMany({ _id: { $in: validIds } });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const message =
      result.deletedCount === 1
        ? "Order deleted successfully"
        : `${result.deletedCount} orders deleted successfully`;

    return NextResponse.json({
      success: true,
      message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting exist sathya order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
