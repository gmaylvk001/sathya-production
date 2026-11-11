import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import CategoryPage, {
  ensureCategoryPageIndexes,
} from "@/models/categoryPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminRequest";

export async function GET(req) {
  try {
    const auth = await requireAdmin(req, "brands");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    await ensureCategoryPageIndexes();
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    let page = await CategoryPage.findOne({
      pageType: PAGE_TYPES.BRAND,
      categoryId: brand._id,
    });

    if (!page) {
      page = await CategoryPage.create({
        pageType: PAGE_TYPES.BRAND,
        categoryId: brand._id,
        categoryName: brand.brand_name,
        categorySlug: brand.brand_slug,
        brandId: null,
        brandName: "",
        brandSlug: "",
        status: "active",
        components: [],
      });
    }

    return NextResponse.json({
      success: true,
      pageId: String(page._id),
      brandName: brand.brand_name,
    });
  } catch (error) {
    console.error("Error fetching or creating brand page:", error);
    return NextResponse.json(
      { error: error.message || "Failed to find or create brand page" },
      { status: 500 }
    );
  }
}
