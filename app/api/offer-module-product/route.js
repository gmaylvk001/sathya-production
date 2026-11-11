import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModuleProduct from "@/models/OfferModuleProduct";

export async function GET(req) {
  try {
    await dbConnect();
    const products = await OfferModuleProduct.find()
      .populate("offerId", "offerName slug")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: products || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/offer-module-product:", error);
    return NextResponse.json({ success: false, error: "Error fetching offer products", message: error?.message }, { status: 500 });
  }
}
