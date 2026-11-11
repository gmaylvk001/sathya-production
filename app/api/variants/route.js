import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VariantGroup from "@/models/variantGroup";
import Product from "@/models/product";
import {
  parseGroupPayload,
  validateGroupPayload,
  syncProductVariantGroupLinks,
} from "@/lib/variantGroup";

export async function GET() {
  try {
    await dbConnect();
    const groups = await VariantGroup.find().sort({ updatedAt: -1 }).lean();
    const allIds = groups.flatMap((group) =>
      (group.products || []).map((entry) => entry.productId)
    );
    const products = allIds.length
      ? await Product.find({ _id: { $in: allIds } }).select("_id name item_code slug").lean()
      : [];
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const data = groups.map((group) => ({
      _id: group._id,
      name: group.name,
      attributeCount: (group.attributes || []).length,
      productCount: (group.products || []).length,
      products: (group.products || []).map((entry) => productMap.get(String(entry.productId))).filter(Boolean),
      updatedAt: group.updatedAt,
      createdAt: group.createdAt,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/variants", error);
    return NextResponse.json({ error: "Failed to fetch variant groups" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const parsed = parseGroupPayload(body);
    const validation = await validateGroupPayload(parsed);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const group = await VariantGroup.create({
      name: parsed.name,
      ...(parsed.group_code !== undefined && { group_code: parsed.group_code }),
      attributes: parsed.attributes,
      products: parsed.products,
    });

    await syncProductVariantGroupLinks(
      group._id,
      parsed.products.map((p) => p.productId)
    );

    return NextResponse.json(
      { message: "Variant group created", data: group },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/variants", error);
    return NextResponse.json({ error: error.message || "Failed to create variant group" }, { status: 500 });
  }
}
