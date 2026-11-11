import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const g = globalThis;
if (!g.__sathyaCategoriesCache) {
  g.__sathyaCategoriesCache = { data: null, at: 0, isBuilding: false };
}

export function invalidateCategoriesCache() {
  if (g.__sathyaCategoriesCache) {
    g.__sathyaCategoriesCache.data = null;
    g.__sathyaCategoriesCache.at = 0;
  }
}

const CATEGORIES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 mins

function buildDescendantMap(categories) {
  const childrenByParent = new Map();

  for (const cat of categories) {
    const parentKey =
      cat.parentid && cat.parentid !== "none"
        ? cat.parentid.toString()
        : "none";
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey).push(cat._id.toString());
  }

  const memo = new Map();

  function getDescendants(categoryId, visiting = new Set()) {
    const idStr = categoryId.toString();
    if (memo.has(idStr)) return memo.get(idStr);
    if (visiting.has(idStr)) return [];
    visiting.add(idStr);

    const result = [idStr];
    const children = childrenByParent.get(idStr) || [];
    for (const childId of children) {
      result.push(...getDescendants(childId, visiting));
    }
    visiting.delete(idStr);
    memo.set(idStr, result);
    return result;
  }

  return getDescendants;
}

async function fetchAndBuildCategories() {
  await dbConnect();
  const now = Date.now();

  const categories = await Category.find().sort({ position: 1 }).lean();
  if (!categories || !Array.isArray(categories)) {
    return [];
  }

  const getDescendants = buildDescendantMap(categories);

  let brandByCategory = [];
  try {
    brandByCategory = await Product.aggregate([
      {
        $match: {
          brand: { $exists: true, $nin: [null, ""] },
          category: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$category",
          brands: { $addToSet: "$brand" },
        },
      },
    ]);
  } catch (aggErr) {
    console.warn("Product brand aggregation skipped:", aggErr?.message);
  }

  const brandsByCategoryId = new Map();
  for (const row of brandByCategory) {
    if (row?._id != null) {
      brandsByCategoryId.set(row._id.toString(), row.brands || []);
    }
  }

  const allBrandIdSet = new Set();
  const brandIdsPerCategory = new Map();

  for (const cat of categories) {
    const catId = cat._id.toString();
    const descendantIds = getDescendants(catId);
    const brandIds = new Set();

    for (const descId of descendantIds) {
      const brands = brandsByCategoryId.get(descId) || [];
      for (const brandId of brands) {
        if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
          brandIds.add(brandId.toString());
          allBrandIdSet.add(brandId.toString());
        }
      }
    }

    brandIdsPerCategory.set(catId, [...brandIds]);
  }

  const allBrandIds = [...allBrandIdSet];
  let brands = [];
  try {
    brands =
      allBrandIds.length > 0
        ? await Brand.find({ _id: { $in: allBrandIds } }).lean()
        : [];
  } catch (brandErr) {
    console.warn("Brand fetch skipped:", brandErr?.message);
  }

  const brandMap = new Map(brands.map((b) => [b._id.toString(), b]));

  const categoriesWithProducts = categories.map((cat) => {
    const catId = cat._id.toString();
    const brandIds = brandIdsPerCategory.get(catId) || [];
    const catBrands = brandIds.map((id) => brandMap.get(id)).filter(Boolean);

    return {
      ...cat,
      parentid: cat.parentid?.toString() || "none",
      brands: catBrands,
    };
  });

  const cacheStore = g.__sathyaCategoriesCache;
  cacheStore.data = categoriesWithProducts;
  cacheStore.at = now;
  return categoriesWithProducts;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const now = Date.now();
    const cacheStore = g.__sathyaCategoriesCache;

    if (cacheStore.data && now - cacheStore.at < CATEGORIES_CACHE_TTL_MS) {
      return NextResponse.json({ data: cacheStore.data }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    if (cacheStore.data) {
      if (!cacheStore.isBuilding) {
        cacheStore.isBuilding = true;
        fetchAndBuildCategories()
          .catch((e) => console.error("Background categories rebuild error:", e))
          .finally(() => {
            cacheStore.isBuilding = false;
          });
      }
      return NextResponse.json({ data: cacheStore.data }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    const data = await fetchAndBuildCategories();
    return NextResponse.json({ data }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("❌ Error fetching categories with products/brands:", error);
    return NextResponse.json(
      { data: [], error: "Failed to fetch categories", details: error?.message || String(error) },
      { status: 200, headers: NO_CACHE_HEADERS },
    );
  }
}
