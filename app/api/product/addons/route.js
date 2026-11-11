import dbConnect from "@/lib/db";
import Product from "@/models/product";
import { NextResponse } from "next/server";

export async function POST(request) {
  await dbConnect();

  const body = await request.json().catch(() => ({}));
  const { ids, productId } = body;

  let targetIds = Array.isArray(ids) ? ids : [];

  if (productId && targetIds.length === 0) {
    const parentProduct = await Product.findById(productId, "add_ons").lean();
    if (parentProduct?.add_ons && Array.isArray(parentProduct.add_ons)) {
      targetIds = parentProduct.add_ons;
    }
  }

  if (!targetIds.length) {
    return NextResponse.json({ products: [] });
  }

  const products = await Product.find({
    _id: { $in: targetIds },
    status: "Active"
  }).lean();

  return NextResponse.json({ products });
}

