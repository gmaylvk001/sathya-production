import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";

export async function POST(req) {
  try {
    const data = await req.json();
    await dbConnect();
    
    const newOffer = new HighlightedProductOffer({
      offerName: data.offerName,
      products: data.products || [],
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || "Active",
      state: data.state,
    });
    
    await newOffer.save();
    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });
  } catch (error) {
    console.error("Error adding highlighted offer:", error);
    return NextResponse.json({ success: false, error: "Error adding offer", message: error?.message }, { status: 500 });
  }
}
