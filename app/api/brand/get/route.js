// app/api/brand/get/route.js
import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import Product from "@/models/product";
import CategoryPage from "@/models/categoryPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const isHomePage = searchParams.get("homePage") === "true";
    const minProductsParam = searchParams.get("minProducts");

    const letterParam = searchParams.get("letter");

    let query = { status: { $regex: /^active$/i } };
    if (letterParam && letterParam !== "ALL") {
      query.brand_name = { $regex: new RegExp(`^${letterParam.trim()}`, "i") };
    }

    let brands = [];
    try {
      brands = await Brand.find(query)
        .select("brand_name brand_slug image status")
        .sort({ brand_name: 1 })
        .lean();
    } catch (queryErr) {
      console.warn("Status filter query failed in /api/brand/get, falling back to find all:", queryErr);
      brands = await Brand.find()
        .select("brand_name brand_slug image status")
        .sort({ brand_name: 1 })
        .lean();
    }

    // Check overview availability for all found brands
    const brandIds = brands.map((b) => b._id).filter(Boolean);
    const brandSlugs = brands.map((b) => b.brand_slug).filter(Boolean);

    let activeBrandPages = [];
    try {
      activeBrandPages = await CategoryPage.find({
        pageType: PAGE_TYPES.BRAND,
        status: "active",
        $or: [
          { categoryId: { $in: brandIds } },
          { categorySlug: { $in: brandSlugs } },
          { brandSlug: { $in: brandSlugs } },
        ],
      })
        .select("categoryId categorySlug brandSlug components")
        .lean();
    } catch (pageErr) {
      console.warn("Failed to check brand overview pages in /api/brand/get:", pageErr);
    }

    const designedBrandIds = new Set();
    const designedSlugs = new Set();
    for (const page of activeBrandPages) {
      const hasActiveComponents = (page?.components || []).some(
        (c) => c.isActive !== false
      );
      if (hasActiveComponents) {
        if (page.categoryId) designedBrandIds.add(String(page.categoryId));
        if (page.categorySlug)
          designedSlugs.add(String(page.categorySlug).toLowerCase().trim());
        if (page.brandSlug)
          designedSlugs.add(String(page.brandSlug).toLowerCase().trim());
      }
    }

    const checkBrandOverview = (b) => {
      const idStr = b?._id ? String(b._id) : (b?.id ? String(b.id) : "");
      const slugStr = String(b?.brand_slug || "").toLowerCase().trim();
      return (
        (Boolean(idStr) && designedBrandIds.has(idStr)) ||
        (Boolean(slugStr) && designedSlugs.has(slugStr))
      );
    };

    if (isHomePage || minProductsParam !== null) {
      // Default to at least 50 products for home page, or custom minProducts threshold
      const minCount = minProductsParam !== null 
        ? Math.max(1, Number(minProductsParam) || 0) 
        : 50;

      // Aggregate active products per brand
      const productCounts = await Product.aggregate([
        {
          $match: {
            $or: [
              { status: { $regex: /^active$/i } },
              { status: { $exists: false } }
            ]
          }
        },
        {
          $group: {
            _id: { $toString: "$brand" },
            count: { $sum: 1 }
          }
        }
      ]);

      const countMap = new Map();
      productCounts.forEach((c) => {
        if (c._id && c._id !== "null") {
          countMap.set(c._id, c.count);
        }
      });

      // Filter out brands with 0 products or below minCount, and sort descending by product count
      const filteredBrands = brands
        .map((brand) => {
          const id = brand?._id ? brand._id.toString() : "";
          const count = countMap.get(id) || 0;
          return {
            id,
            brand_name: brand?.brand_name || "",
            brand_slug: brand?.brand_slug || "",
            image: brand?.image || "",
            productCount: count,
            hasOverview: checkBrandOverview(brand),
          };
        })
        .filter((brand) => brand.productCount >= minCount && brand.image)
        .sort((a, b) => b.productCount - a.productCount);

      return NextResponse.json({
        success: true,
        brands: filteredBrands,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      brands: (brands || []).map(brand => ({
        id: brand?._id ? brand._id.toString() : "",
        brand_name: brand?.brand_name || "",
        brand_slug: brand?.brand_slug || "",
        image: brand?.image || "",
        hasOverview: checkBrandOverview(brand),
      }))
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching brands in /api/brand/get:", error);
    return NextResponse.json({
      success: false,
      brands: [],
      error: error?.message || "Internal server error"
    }, { status: 200 });
  }
}