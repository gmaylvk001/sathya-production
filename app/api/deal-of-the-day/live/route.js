import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeDealOfTheDay from "@/models/homeDealOfTheDay";
import {
  buildStorefrontDealConfig,
  enrichDealProduct,
  isDealLive,
} from "@/lib/dealOfTheDay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/deal-of-the-day/live
 * Public: currently live home Deal of the Day (optional ?productId= for PDP).
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const productId = (searchParams.get("productId") || "").trim();
    const now = new Date();

    const candidates = await HomeDealOfTheDay.find({
      status: "active",
      startAt: { $lte: now },
      endAt: { $gte: now },
      productId: { $ne: null },
    })
      .sort({ endAt: 1, updatedAt: -1 })
      .limit(10)
      .lean();

    let live = null;
    for (const deal of candidates) {
      if (!isDealLive(deal, now)) continue;
      if (productId && String(deal.productId) !== String(productId)) continue;
      const product = await enrichDealProduct(deal);
      if (!product) continue;
      live = buildStorefrontDealConfig(deal, product, now);
      break;
    }

    return NextResponse.json(
      { success: true, data: live },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("Live deal-of-the-day error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load live deal" },
      { status: 500 }
    );
  }
}
