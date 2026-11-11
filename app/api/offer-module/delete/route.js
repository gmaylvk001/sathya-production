import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModule from "@/models/OfferModule";
import OfferModuleProduct from "@/models/OfferModuleProduct";

export async function POST(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Offer ID is required" }, { status: 400 });
    }

    const offer = await OfferModule.findById(id);
    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    // Remove linked offer-module products, then the offer itself
    await OfferModuleProduct.deleteMany({ offerId: id });
    await OfferModule.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Offer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/offer-module/delete:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting offer", message: error?.message },
      { status: 500 }
    );
  }
}
