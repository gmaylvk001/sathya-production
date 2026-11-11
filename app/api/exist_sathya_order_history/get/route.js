import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderHistoryNew from "@/models/order_history_new";

export async function GET() {
  try {
    await dbConnect();
    const rows = await OrderHistoryNew.find({ exist_id: { $type: "string" } })
      .sort({ created_at: -1, exist_id: -1 })
      .lean();
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist order history:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
