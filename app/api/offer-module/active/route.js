import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModule from "@/models/OfferModule";

export async function GET() {
  try {
    await dbConnect();

    const offers = await OfferModule.find({})
      .select("offerName slug")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, data: offers || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/offer-module/active:", error);
    return NextResponse.json({ success: false, data: [], error: error?.message }, { status: 500 });
  }
}
