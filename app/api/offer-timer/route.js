import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";

const LIST_FIELDS =
  "timerId custom_id offerTitle offer_title offerHeading startDate endDate offer_start offer_end " +
  "timerDisplayStatus status offerViewStates states state topBanner top_banner_url createdAt updatedAt";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    // ?view=list → admin table: skip heavy card_offers array
    let query = OfferTimer.find().sort({ timerId: -1 });
    if (searchParams.get("view") === "list") {
      query = query.select(LIST_FIELDS);
    }

    const timers = await query.lean();
    return NextResponse.json({ success: true, data: timers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching offer timers:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch offer timers" }, { status: 500 });
  }
}
