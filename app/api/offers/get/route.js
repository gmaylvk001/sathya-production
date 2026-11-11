import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Offer from "@/models/ecom_offer_info";

const g = globalThis;
if (!g.__sathyaOffersCache) {
  g.__sathyaOffersCache = { data: null, at: 0 };
}
const OFFERS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 mins

export async function GET() {
  try {
    const now = Date.now();
    const cacheStore = g.__sathyaOffersCache;
    if (cacheStore.data && now - cacheStore.at < OFFERS_CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cacheStore.data });
    }

    await connectDB();

    const offers = await Offer.find({}).lean();
    const currentDate = new Date();
    const expiredIds = [];

    const processedOffers = (offers || []).map((offer) => {
      const toDate = new Date(offer.to_date);
      if (
        toDate instanceof Date &&
        !isNaN(toDate) &&
        toDate < currentDate &&
        offer.fest_offer_status !== "inactive"
      ) {
        expiredIds.push(offer._id);
        return { ...offer, fest_offer_status: "inactive" };
      }
      return offer;
    });

    if (expiredIds.length > 0) {
      Offer.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { fest_offer_status: "inactive" } }
      ).catch((err) => console.error("Error bulk updating expired offers:", err));
    }

    cacheStore.data = processedOffers;
    cacheStore.at = now;

    return NextResponse.json({ success: true, data: processedOffers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}