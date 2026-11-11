import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ecom_brand_info from "@/models/ecom_brand_info";
import ecom_category_info from "@/models/ecom_category_info";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") || 20)));
    const excludeGroupId = searchParams.get("excludeGroupId") || "";

    if (q.length < 2) {
      return NextResponse.json({ products: [], total: 0, page, limit });
    }

    const brandMatches = await ecom_brand_info
      .find({ brand_name: { $regex: q, $options: "i" } })
      .select("_id")
      .lean();
    const brandIds = brandMatches.map((b) => String(b._id));

    const categoryMatches = await ecom_category_info
      .find({ category_name: { $regex: q, $options: "i" } })
      .select("_id")
      .lean();
    const categoryIds = categoryMatches.map((c) => String(c._id));

    const or = [
      { name: { $regex: q, $options: "i" } },
      { item_code: { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
      { brand: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { sub_category: { $regex: q, $options: "i" } },
    ];
    if (brandIds.length) or.push({ brand: { $in: brandIds } });
    if (categoryIds.length) {
      or.push({ category: { $in: categoryIds } });
      or.push({ sub_category: { $in: categoryIds } });
    }

    const query = { $or: or };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(query)
        .select("_id name item_code slug brand category images price special_price variantGroupId status")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const products = items.map((product) => {
      const groupId = product.variantGroupId ? String(product.variantGroupId) : null;
      const inOtherGroup = Boolean(groupId && groupId !== excludeGroupId);
      return {
        ...product,
        _id: String(product._id),
        variantGroupId: groupId,
        inOtherGroup,
      };
    });

    return NextResponse.json({ products, total, page, limit });
  } catch (error) {
    console.error("GET /api/variants/search-products", error);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}
