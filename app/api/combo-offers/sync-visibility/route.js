import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { syncComboCategoryVisibility } from "@/lib/comboOffers";

/**
 * POST /api/combo-offers/sync-visibility
 * Cron / manual: expire combos + show/hide Combo Offers category.
 */
export async function POST() {
  try {
    await dbConnect();
    const result = await syncComboCategoryVisibility();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
