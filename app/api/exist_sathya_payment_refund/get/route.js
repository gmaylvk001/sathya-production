import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistPaymentRefund from "@/models/exist_payment_refund";

export async function GET() {
  try {
    await dbConnect();
    const rows = await ExistPaymentRefund.find({ exist_id: { $type: "string" } })
      .sort({ created_at: -1, exist_id: -1 })
      .lean();
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist payment refunds:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
