import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaOrderDetail from "@/models/ExistSathyaOrderDetail";

export async function GET() {
  try {
    await dbConnect();
    const details = await ExistSathyaOrderDetail.find()
      .sort({ created_at: -1, exist_id: -1 })
      .lean();
    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("Error fetching exist sathya order details:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
