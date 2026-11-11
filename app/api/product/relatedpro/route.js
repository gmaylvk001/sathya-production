// app/api/products/related/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db"; 
import Product from "@/models/product";
import { applyRegionPrices, readRequestRegion } from "@/lib/priceResolver";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category"); 
    const brandId = searchParams.get("brand");   // 👈 brand filter
    const excludeId = searchParams.get("exclude"); 
    const limit = parseInt(searchParams.get("limit")) || 5; 

    if (!categoryId || !brandId) {
      return NextResponse.json(
        { error: "Category ID and Brand ID are required" },
        { status: 400 }
      );
    }

    // Same category + brand, only products that can be bought online.
    const query = {
      category: categoryId,
      brand: brandId,
      status: "Active",
      stock_status: "In Stock",
      quantity: { $gte: 10 },
    };
    if (excludeId) query._id = { $ne: excludeId }; 

    const relatedProducts = await Product.find(query)
      .limit(limit)
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      products: await applyRegionPrices(relatedProducts, readRequestRegion(req)),
    });

  } catch (error) {
    console.error("Error fetching related products:", error);
    return NextResponse.json(
      { error: "Failed to fetch related products" },
      { status: 500 }
    );
  }
}
