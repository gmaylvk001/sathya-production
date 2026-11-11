import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";
import { normalizeOfferValue } from "@/lib/exchangeOfferMatch";

export async function PUT(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;
    if ("categoryName" in updateData) updateData.categoryName = normalizeOfferValue(updateData.categoryName);
    if ("brand" in updateData) updateData.brand = normalizeOfferValue(updateData.brand);
    if ("type" in updateData) updateData.type = normalizeOfferValue(updateData.type);
    if ("condition" in updateData) updateData.condition = normalizeOfferValue(updateData.condition);
    if ("zone" in updateData) updateData.zone = normalizeOfferValue(updateData.zone);

    if (!_id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const updatedOffer = await ExchangeOfferCondition.findByIdAndUpdate(_id, updateData, { new: true });

    if (!updatedOffer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Exchange Offer updated successfully" });
  } catch (error) {
    console.error("Error updating Exchange Offer Condition:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
