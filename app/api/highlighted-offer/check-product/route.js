import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";
import HighlightedProductSettings from "@/models/HighlightedProductSettings";
import Product from "@/models/product";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Normalizes state or region strings into canonical keys.
 * Returns null if the value is missing or does not match a recognized region.
 */
function normalizeRegionKey(val) {
  if (!val || typeof val !== "string") return null;
  const s = val.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (s === "all") return "all";
  if (s.includes("tamil") || s === "tn") return "tamilnadu";
  if (s.includes("telangana") || s === "tg") return "telangana";
  if (s.includes("karnataka") || s === "ka") return "karnataka";
  if (s.includes("andhra") || s === "ap") return "andhra";
  if (s.includes("kerala") || s === "kl") return "kerala";
  return null;
}

/**
 * Normalizes date strings (YYYY-MM-DD or DD-MM-YYYY) to YYYY-MM-DD for reliable comparison.
 */
function toStandardDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return dateStr.trim();
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  } else if (parts[2].length === 4) {
    // DD-MM-YYYY -> YYYY-MM-DD
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr.trim();
}

/**
 * Public API: Check if a product has an active highlighted offer matching customer's current state.
 * GET /api/highlighted-offer/check-product?productId=...&state=...
 *
 * Requirements:
 * - Queries by productId (NOT product name).
 * - Matches against existing source of truth (HighlightedProductOffer.products).
 * - Validates status = Active and start/end dates in Asia/Kolkata timezone.
 * - Enforces mandatory customer current state match (state mismatch / missing state -> ribbon hidden).
 * - Resolves dynamic label text & color from HighlightedProductSettings.
 * - Sets strict no-cache headers to prevent stale/wrong state responses.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const rawState = searchParams.get("state");

    const customerStateKey = normalizeRegionKey(rawState);

    // 1. Mandatory state check: Missing or unrecognized state -> ribbon hidden
    if (!customerStateKey) {
      return NextResponse.json(
        { hasOffer: false, offerName: null, labelText: null, labelColor: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Validate product identifier
    if (
      !productId ||
      typeof productId !== "string" ||
      !productId.trim() ||
      !mongoose.Types.ObjectId.isValid(productId.trim())
    ) {
      return NextResponse.json(
        { hasOffer: false, offerName: null, labelText: null, labelColor: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    await dbConnect();

    const cleanProductId = productId.trim();

    // 3. Resolve product identifiers for existing source of truth
    const product = await Product.findById(cleanProductId)
      .select("_id name slug")
      .lean();

    if (!product) {
      return NextResponse.json(
        { hasOffer: false, offerName: null, labelText: null, labelColor: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    const identifiers = [
      product._id.toString(),
      cleanProductId,
      ...(product.name ? [product.name.trim()] : []),
      ...(product.slug ? [product.slug.trim()] : []),
    ];

    // 4. Query active offers matching any resolved identifier
    const offers = await HighlightedProductOffer.find({
      status: "Active",
      products: { $in: identifiers },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!offers || offers.length === 0) {
      return NextResponse.json(
        { hasOffer: false, offerName: null, labelText: null, labelColor: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    // 5. Date validation in Asia/Kolkata timezone
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 6. Find first active offer matching BOTH dates and customer state
    const activeOffer = offers.find((offer) => {
      // Validate state match: 'all' matches all customer states; otherwise must match exact state
      const offerStateKey = normalizeRegionKey(offer.state);
      if (!offerStateKey || (offerStateKey !== "all" && offerStateKey !== customerStateKey)) {
        return false;
      }

      // Validate date range
      const start = toStandardDateStr(offer.startDate);
      const end = toStandardDateStr(offer.endDate);
      if (!start || !end) return false;

      return start <= todayStr && todayStr <= end;
    });

    if (!activeOffer) {
      return NextResponse.json(
        { hasOffer: false, offerName: null, labelText: null, labelColor: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    // 7. Resolve dynamic label settings saved in admin
    const settings = await HighlightedProductSettings.findOne().lean();
    const dynamicLabelText =
      settings?.labelText && settings.labelText.trim()
        ? settings.labelText.trim()
        : activeOffer.offerName;
    const dynamicLabelColor =
      settings?.labelColor && settings.labelColor.trim()
        ? settings.labelColor.trim()
        : "#d72828";

    return NextResponse.json(
      {
        hasOffer: true,
        offerName: activeOffer.offerName,
        labelText: dynamicLabelText,
        labelColor: dynamicLabelColor,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error checking highlighted offer for product:", error);
    return NextResponse.json(
      { hasOffer: false, offerName: null, labelText: null, labelColor: null },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
