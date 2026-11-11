import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";

export async function PUT(req) {
  try {
    const data = await req.json();
    await dbConnect();

    const updatedOffer = await HighlightedProductOffer.findByIdAndUpdate(
      data.id,
      {
        offerName: data.offerName,
        products: data.products,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        state: data.state,
      },
      { new: true }
    );

    if (!updatedOffer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedOffer }, { status: 200 });
  } catch (error) {
    console.error("Error updating highlighted offer:", error);
    return NextResponse.json({ success: false, error: "Error updating offer", message: error?.message }, { status: 500 });
  }
}
