import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentsNew from "@/models/payments_new";

export async function GET() {
  try {
    await dbConnect();
    const payments = await PaymentsNew.find({ exist_id: { $type: "string" } })
      .sort({ created_at: -1, exist_id: -1 })
      .lean();
    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist payments:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
