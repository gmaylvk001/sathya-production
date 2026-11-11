import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    
    if (!search) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search by name or item_code
    const products = await Product.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { item_code: { $regex: search, $options: "i" } }
      ]
    }).limit(10).select("name item_code _id").lean();

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Search Products Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
