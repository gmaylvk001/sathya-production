import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";

export async function POST(req) {
  try {
    const { id } = await req.json();
    await dbConnect();
    
    const deletedOffer = await HighlightedProductOffer.findByIdAndDelete(id);
    
    if (!deletedOffer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Offer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting highlighted offer:", error);
    return NextResponse.json({ success: false, error: "Error deleting offer", message: error?.message }, { status: 500 });
  }
}
