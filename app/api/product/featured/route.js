// app/api/product/featured/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import { applyRegionPrices, readRequestRegion } from "@/lib/priceResolver";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 10 : limitParam, 1), 50);

    const products = await Product.find({
      status: "Active",
      quantity: { $gt: 0 },
    })
      .sort({ featured_products: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(await applyRegionPrices(products, readRequestRegion(req)), { status: 200 });
  } catch (error) {
    console.error("Featured GET API Error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json().catch(() => ({}));
    const { ids, category, brand, limit = 2 } = body;

    // Enforce business rule of MAX 2 products from backend
    const maxLimit = Math.min(Number(limit) || 2, 2);
    let products = [];

    if (Array.isArray(ids) && ids.length > 0) {
      products = await Product.find({
        _id: { $in: ids },
        status: "Active"
      }).limit(maxLimit);
    }

    // Fallback if fewer than 2 active products found: fetch active items from same category/brand
    if (products.length < maxLimit && (category || brand)) {
      const existingIds = products.map(p => p._id);
      const queryFilter = {
        _id: { $nin: existingIds },
        status: "Active"
      };

      if (category) queryFilter.category = category;
      else if (brand) queryFilter.brand = brand;

      const additionalProducts = await Product.find(queryFilter).limit(maxLimit - products.length);
      products = [...products, ...additionalProducts];
    }

    return NextResponse.json(
      await applyRegionPrices(products.slice(0, 2), readRequestRegion(req))
    );
  } catch (error) {
    console.error("Featured/FBT API Error:", error);
    return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
  }
}
