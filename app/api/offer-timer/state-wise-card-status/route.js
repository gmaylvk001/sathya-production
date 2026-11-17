import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const id = String(body?.id || "").trim();
    const stateWiseCardStatus = body?.state_wise_card_status === "Yes" ? "Yes" : "No";

    if (!id) {
      return NextResponse.json({ success: false, error: "Offer timer id is required" }, { status: 400 });
    }

    const timer = await OfferTimer.findByIdAndUpdate(
      id,
      { $set: { state_wise_card_status: stateWiseCardStatus } },
      { new: true }
    ).select("_id state_wise_card_status");

    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(timer._id),
        state_wise_card_status: timer.state_wise_card_status,
      },
    });
  } catch (error) {
    console.error("Error updating state wise card status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update state wise card status" },
      { status: 500 }
    );
  }
}
