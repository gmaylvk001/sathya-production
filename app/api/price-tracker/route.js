import { NextResponse } from "next/server";
import {
  getLastVerifiedSlot,
  getLastVerifiedSlotDetailed,
  getNextSyncCountdown,
  getCompetitorDeals,
} from "@/lib/priceTrackerService";
import { isLspPdpEnabled } from "@/lib/lspPriceCron";

export const dynamic = "force-dynamic";

/**
 * Live Market Price Comparison API (product details page).
 * Gate: lsp_pdp_live_comparison=on (separate from cron_lsp_price_run_dev)
 * Route: GET /api/price-tracker?sku=[code]&price=[sathyaPrice]&title=[title]
 */
export async function GET(request) {
  // Feature approval pending from management — strictly block all external HTTP calls and PDP price comparisons
  return NextResponse.json(
    {
      success: true,
      disabled: true,
      matched: false,
      deals: [],
      message: "PDP Live Market Comparison is disabled pending management approval.",
    },
    { status: 200 }
  );
  try {
    if (!isLspPdpEnabled()) {
      return NextResponse.json(
        {
          success: true,
          disabled: true,
          matched: false,
          deals: [],
          message:
            "PDP Live Market Comparison is off. Set lsp_pdp_live_comparison=on to enable.",
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productCode =
      searchParams.get("product_code") ||
      searchParams.get("item_code") ||
      searchParams.get("sku") ||
      "";
    const modelNumber = searchParams.get("model_number") || "";
    const ean = searchParams.get("ean") || searchParams.get("barcode") || "";
    const rawPrice = searchParams.get("price") || "0";
    const sathyaPrice = parseFloat(rawPrice) || 0;

    const now = new Date();
    const lastVerifiedSlot = getLastVerifiedSlot(now);
    const slotDetails = getLastVerifiedSlotDetailed(now);
    const countdown = getNextSyncCountdown(now);

    if (sathyaPrice <= 0 || (!productCode && !modelNumber && !ean)) {
      return NextResponse.json({
        success: true,
        matched: false,
        product_code: productCode,
        model_number: modelNumber,
        ean,
        sathyaPrice: Math.max(0, sathyaPrice),
        lastVerifiedSlot,
        lastVerifiedSlotFormatted: slotDetails.label,
        nextSyncInSeconds: countdown,
        deals: [],
      });
    }

    const deals = await getCompetitorDeals({
      product_code: productCode,
      model_number: modelNumber,
      ean,
      sathyaPrice,
      currentDate: now,
    });

    const maxAge = Math.min(3600, Math.max(60, countdown));

    return NextResponse.json(
      {
        success: true,
        matched: Array.isArray(deals) && deals.length > 0,
        product_code: productCode,
        model_number: modelNumber,
        ean,
        sathyaPrice,
        lastVerifiedSlot,
        lastVerifiedSlotFormatted: slotDetails.label,
        nextSyncInSeconds: countdown,
        deals: Array.isArray(deals) ? deals : [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=300`,
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/price-tracker:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", deals: [] },
      { status: 500 }
    );
  }
}
