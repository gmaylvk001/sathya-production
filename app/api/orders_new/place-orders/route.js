import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { isUniletView, orderOwnerFilter } from "@/lib/storeView";

function parseDay(value, endOfDay) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const archived = String(searchParams.get("archive") || "0") === "1";

    let start = parseDay(searchParams.get("startDate"), false);
    let end = parseDay(searchParams.get("endDate"), true);
    if (!start || !end) {
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    const filter = {
      type: { $regex: /^online$/i },
      order_status: { $regex: /^order placed$/i },
      archive: archived ? { $in: [1, "1"] } : { $in: [0, "0", null] },
      created_at: { $gte: start, $lte: end },
      ...orderOwnerFilter(await isUniletView(req)),
    };

    const orders = await OrderNew.find(filter)
      .select("order_number order_status order_username order_amount payment_method archive type created_at")
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("place-orders list error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load place orders" },
      { status: 500 }
    );
  }
}
