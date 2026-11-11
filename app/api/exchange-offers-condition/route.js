import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";

export async function GET() {
  try {
    await dbConnect();
    const data = await ExchangeOfferCondition.find().sort({ id: -1 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching Exchange Offer Conditions:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
