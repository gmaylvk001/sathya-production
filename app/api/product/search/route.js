import dbConnect from "@/lib/db";
import Product from "@/models/product";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    
    if (q.length < 2) return NextResponse.json([]);
    
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { item_code: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id name item_code images price special_price slug lsp")
      .limit(10)
      .lean();
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}