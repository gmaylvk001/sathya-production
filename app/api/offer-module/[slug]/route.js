import { NextResponse } from "next/server";
import { getOfferBySlug } from "@/lib/offersHelper";

export async function GET(req, { params }) {
  try {
    const awaitedParams = await params;
    const { slug } = awaitedParams;

    const result = await getOfferBySlug(slug);

    if (!result || !result.offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        offer: result.offer,
        products: result.products || [],
        brandMap: result.brandMap || {},
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/offer-module/[slug]:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching offer", message: error?.message },
      { status: 500 }
    );
  }
}
