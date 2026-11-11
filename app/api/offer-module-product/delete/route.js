import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModuleProduct from "@/models/OfferModuleProduct";

export async function POST(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Offer Product ID is required" }, { status: 400 });
    }

    const deletedProduct = await OfferModuleProduct.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ success: false, error: "Offer Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Offer Product deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/offer-module-product/delete:", error);
    return NextResponse.json({ success: false, error: "Error deleting offer product", message: error?.message }, { status: 500 });
  }
}
