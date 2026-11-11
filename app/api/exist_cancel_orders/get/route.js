import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CancelOrders from "@/models/cancel_orders";
import CancelOrdersLive from "@/models/cancel_orders_live";

export const dynamic = "force-dynamic";

// Imported exist cancel_orders rows; live_linked = copied to cancel_orders_live by Fetch
export async function GET() {
  try {
    await dbConnect();
    const rows = await CancelOrders.find({ exist_id: { $type: "string" } })
      .sort({ created_at: -1, _id: -1 })
      .lean();

    const linked = rows.length
      ? await CancelOrdersLive.find(
        { exist_id: { $in: rows.map((row) => row.exist_id) } },
        { exist_id: 1, order_id: 1 }
      ).lean()
      : [];
    const liveByExistId = new Map(linked.map((row) => [String(row.exist_id), String(row.order_id || "")]));

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        live_linked: liveByExistId.has(String(row.exist_id)),
        live_order_id: liveByExistId.get(String(row.exist_id)) || null,
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching exist cancel orders:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
