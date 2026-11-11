import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { resolveCategoryPageComponents } from "@/lib/categoryPageComponents/resolvePageComponents";

/**
 * GET /api/category-pages/render?categoryId=&pageType= OR ?slug=&pageType=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const slug = searchParams.get("slug");
    const parentSlug = searchParams.get("parent");
    const brandSlug = searchParams.get("brandSlug");
    const brandId = searchParams.get("brandId");
    const pageType = searchParams.get("pageType");
    const region = (
      searchParams.get("region") ||
      searchParams.get("state") ||
      req.cookies?.get("sathya_selected_region")?.value ||
      "all"
    ).toLowerCase();

    const result = await resolveCategoryPageComponents({
      categoryId,
      slug,
      parentSlug,
      brandSlug,
      brandId,
      pageType,
      region,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err?.message || "Failed to render category page";
    const status =
      message.includes("pageType") || message.includes("categoryId or slug")
        ? 400
        : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
