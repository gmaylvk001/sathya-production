import dbConnect from "@/lib/db";
import Product from "@/models/product";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || "";
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

    console.log("Fetch products by IDs:", ids);

    if (ids.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // keep only valid ObjectId strings
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const products = await Product.find({ _id: { $in: validIds } })
      .populate("brand", "brand_name brand_slug")
      .lean();

    // preserve order of incoming ids
    const map = new Map(products.map((p) => [String(p._id), p]));
    const ordered = validIds.map((id) => map.get(id)).filter(Boolean);

    console.log("Found products count:", ordered.length);

    return NextResponse.json({ products: ordered });
  } catch (error) {
    console.error("Error in /api/products/by-ids:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}