import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { isUniletView, orderOwnerFilter } from "@/lib/storeView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Header badge counts for admin Orders / Cancelled icons.
 * Uses orders_new (same collection as /admin/Allorder), not legacy ecom_order_info.
 */
export async function GET(req) {
  try {
    await dbConnect();
    const uniletView = await isUniletView(req);
    const baseMatch = {
      type: { $ne: "offline" },
      ...orderOwnerFilter(uniletView),
    };

    const result = await OrderNew.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          total: [{ $count: "count" }],
          cancelled: [
            { $match: { order_status: { $regex: /^cancelled$/i } } },
            { $count: "count" },
          ],
          shipped: [
            { $match: { order_status: { $regex: /^shipped$/i } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const stats = {
      total: result[0]?.total?.[0]?.count || 0,
      cancelled: result[0]?.cancelled?.[0]?.count || 0,
      shipped: result[0]?.shipped?.[0]?.count || 0,
    };

    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Order stats aggregation error:", error);
    return NextResponse.json(
      { message: "Error fetching order stats", error: error.message },
      { status: 500 }
    );
  }
}
