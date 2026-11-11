import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryPage, {
  ensureCategoryPageIndexes,
} from "@/models/categoryPage";
import ecom_category_info from "@/models/ecom_category_info";
import ecom_brand_info from "@/models/ecom_brand_info";
import {
  PAGE_TYPES,
  PAGE_TYPE_LABELS,
} from "@/lib/categoryPageComponents/registry";

const BRAND_PAGE_TYPES = [PAGE_TYPES.BRAND, PAGE_TYPES.CATEGORY_BRAND];

/** GET /api/category-pages — list layouts */
export async function GET(req) {
  try {
    await dbConnect();
    await ensureCategoryPageIndexes();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const pageType = searchParams.get("pageType");
    const scope = searchParams.get("scope");

    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (scope === "brand-pages") {
      filter.pageType = { $in: BRAND_PAGE_TYPES };
    } else if (pageType) {
      const types = pageType
        .split(",")
        .map((t) => t.trim())
        .filter((t) => Object.values(PAGE_TYPES).includes(t));
      if (types.length === 1) filter.pageType = types[0];
      else if (types.length > 1) filter.pageType = { $in: types };
    } else {
      filter.pageType = { $nin: BRAND_PAGE_TYPES };
    }

    const pages = await CategoryPage.find(filter).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      pages: pages.map((p) => ({
        ...p,
        pageTypeLabel: PAGE_TYPE_LABELS[p.pageType] || p.pageType,
        componentCount: p.components?.length || 0,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/** POST /api/category-pages — create layout { pageType, categoryId, brandId? } */
export async function POST(req) {
  try {
    await dbConnect();
    await ensureCategoryPageIndexes();
    const { pageType, categoryId, brandId } = await req.json();

    if (!pageType || !Object.values(PAGE_TYPES).includes(pageType)) {
      return NextResponse.json(
        { success: false, message: "Invalid pageType" },
        { status: 400 }
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "categoryId required" },
        { status: 400 }
      );
    }

    let categoryName = "";
    let categorySlug = "";
    let resolvedBrandId = null;
    let brandName = "";
    let brandSlug = "";

    if (pageType === PAGE_TYPES.BRAND) {
      const brand = await ecom_brand_info.findById(categoryId).lean();
      if (!brand) {
        return NextResponse.json(
          { success: false, message: "Brand not found" },
          { status: 404 }
        );
      }
      categoryName = brand.brand_name;
      categorySlug = brand.brand_slug;
    } else if (pageType === PAGE_TYPES.CATEGORY_BRAND) {
      if (!brandId) {
        return NextResponse.json(
          { success: false, message: "brandId required" },
          { status: 400 }
        );
      }
      const category = await ecom_category_info.findById(categoryId).lean();
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category not found" },
          { status: 404 }
        );
      }
      const brand = await ecom_brand_info.findById(brandId).lean();
      if (!brand) {
        return NextResponse.json(
          { success: false, message: "Brand not found" },
          { status: 404 }
        );
      }
      categoryName = category.category_name;
      categorySlug = category.category_slug;
      resolvedBrandId = brand._id;
      brandName = brand.brand_name;
      brandSlug = brand.brand_slug;
    } else {
      const category = await ecom_category_info.findById(categoryId).lean();
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category not found" },
          { status: 404 }
        );
      }
      categoryName = category.category_name;
      categorySlug = category.category_slug;
    }

    const existingFilter =
      pageType === PAGE_TYPES.CATEGORY_BRAND
        ? { pageType, categoryId, brandId: resolvedBrandId }
        : { pageType, categoryId };

    const existing = await CategoryPage.findOne(existingFilter);
    if (existing) {
      return NextResponse.json({
        success: true,
        page: existing,
        alreadyExists: true,
      });
    }

    const page = await CategoryPage.create({
      pageType,
      categoryId,
      categoryName,
      categorySlug,
      brandId: resolvedBrandId,
      brandName,
      brandSlug,
      status: "active",
      components: [],
    });

    return NextResponse.json({ success: true, page }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Page already exists for this selection" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
