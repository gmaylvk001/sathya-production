import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaOrder from "@/models/ExistSathyaOrder";

export async function GET() {
  try {
    await dbConnect();
    const orders = await ExistSathyaOrder.find().sort({ created_at: -1, exist_id: -1 }).lean();
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist sathya orders:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
