import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderHistoryNew from "@/models/order_history_new";

const ORDER_ID_FILLED = {
  order_id: { $exists: true, $nin: [null, ""], $not: /^\s+$/ },
};
const ORDER_ID_EMPTY = {
  $or: [
    { order_id: null },
    { order_id: "" },
    { order_id: { $exists: false } },
    { order_id: /^\s+$/ },
  ],
};

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const filter =
      searchParams.get("order_id") === "filled" ? ORDER_ID_FILLED : ORDER_ID_EMPTY;
    const rows = await OrderHistoryNew.find(filter)
      .sort({ created_at: -1, exist_id: -1 })
      .lean();
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist order history:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
