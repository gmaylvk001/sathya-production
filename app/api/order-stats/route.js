import { NextResponse } from 'next/server';
import dbConnect from "@/lib/db";
import Order from '@/models/ecom_order_info';

export const revalidate = 120; // 2-minute caching

export async function GET() {
  try {
    await dbConnect();

    const result = await Order.aggregate([
      {
        $match: {
          payment_status: { $ne: "payment_initialized" }
        }
      },
      {
        $facet: {
          total: [
            { $count: "count" }
          ],
          cancelled: [
            { $match: { order_status: { $regex: /^cancelled$/i } } },
            { $count: "count" }
          ],
          shipped: [
            { $match: { order_status: { $regex: /^shipped$/i } } },
            { $count: "count" }
          ]
        }
      }
    ]);

    const stats = {
      total: result[0].total[0]?.count || 0,
      cancelled: result[0].cancelled[0]?.count || 0,
      shipped: result[0].shipped[0]?.count || 0
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Order stats aggregation error:", error);
    return NextResponse.json({ message: 'Error fetching order stats', error: error.message }, { status: 500 });
  }
}
