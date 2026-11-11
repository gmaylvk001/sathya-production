import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";

export async function POST(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const deletedOffer = await ExchangeOfferCondition.findByIdAndDelete(id);

    if (!deletedOffer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Exchange Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting Exchange Offer Condition:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
