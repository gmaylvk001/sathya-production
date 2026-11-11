import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";
import ExtendedWarranty from "@/models/ecom_products_extended_warrent";

export async function GET() {
  try {
    await dbConnect();
    const ExtendedWarranties            = await ExtendedWarranty.find({}) .sort({ createdAt: -1 }) .lean();
console.log(ExtendedWarranties);
    // Add filters and wishlist to products
    const ExtendedWarrantiesLists = ExtendedWarranties.map(ExtendedWarranty => {
      return {
        ...ExtendedWarranty,
      };
    });

    return NextResponse.json(ExtendedWarrantiesLists, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
