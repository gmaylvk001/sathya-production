import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { isUniletView, orderOwnerFilter } from "@/lib/storeView";
import { getAdminUserId } from "@/lib/adminRequest";

export async function GET(req) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { message: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    await dbConnect();
    const uniletView = await isUniletView(req);
    const orders = await OrderNew.find({ type: { $ne: "offline" }, ...orderOwnerFilter(uniletView) }).sort({ created_at: -1 }).lean();
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching orders", error: error.message }, { status: 500 });
  }
}

