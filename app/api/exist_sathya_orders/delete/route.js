import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaOrder from "@/models/ExistSathyaOrder";
import { withMovedFlag } from "@/lib/existOrderMoved";

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

    const moveStatus = String(body.move_status || "").trim();
    const hasMoveFilter = moveStatus === "moved" || moveStatus === "unmoved";
    const filter = buildFilter(body);
    if ((Object.keys(filter).length > 0 || hasMoveFilter) && !body.orderId && !body.orderIds) {
      let targets = await ExistSathyaOrder.find(filter).select("_id order_number exist_id").lean();
      if (hasMoveFilter) {
        const marked = await withMovedFlag(targets);
        targets = marked.filter((order) => (moveStatus === "moved" ? order.is_moved : !order.is_moved));
      }

      let deletedCount = 0;
      const ids = targets.map((order) => order._id);
      const chunkSize = 2000;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const result = await ExistSathyaOrder.deleteMany({ _id: { $in: ids.slice(i, i + chunkSize) } });
        deletedCount += result.deletedCount || 0;
      }

      return NextResponse.json({
        success: true,
        message: `${deletedCount} orders deleted successfully`,
        deletedCount,
        filter: hasMoveFilter ? { ...filter, move_status: moveStatus } : filter,
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
