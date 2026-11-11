import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";

export async function GET() {
  try {
    await dbConnect();
    const offers = await HighlightedProductOffer.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: offers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching highlighted offers:", error);
    return NextResponse.json({ success: false, error: "Error fetching data" }, { status: 500 });
  }
}
