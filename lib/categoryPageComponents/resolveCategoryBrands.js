import mongoose from "mongoose";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import Category from "@/models/ecom_category_info";

function escapeRegExp(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBrandImage(image) {
  const src = String(image || "").trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
  return `/uploads/Brands/${src}`;
}

/**
 * Collect category + descendants (ids + md5 hashes) for product matching.
 */
async function collectCategoryScope(categoryId) {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(String(categoryId))) {
    return null;
  }

  const root = await Category.findById(categoryId)
    .select("_id category_slug category_name md5_cat_name")
    .lean();
  if (!root) return null;

  const ids = [String(root._id)];
  const md5List = root.md5_cat_name ? [root.md5_cat_name] : [];
  const queue = [String(root._id)];
  const seen = new Set(ids);

  while (queue.length) {
    const parent = queue.shift();
    const children = await Category.find({ parentid: parent })
      .select("_id md5_cat_name")
      .lean();
    for (const child of children) {
      const id = String(child._id);
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (child.md5_cat_name) md5List.push(child.md5_cat_name);
      queue.push(id);
    }
  }

  return {
    category: root,
    categoryIds: ids,
    md5List: [...new Set(md5List)],
  };
}

/**
 * Brands that have Active in-stock products under the given category
 * (including child categories). Reuses the same product↔category linkage
 * as storefront category pages (md5 chain + ObjectId fields).
 */
export async function resolveBrandsForCategory(categoryId) {
  const scope = await collectCategoryScope(categoryId);
  if (!scope) return [];

  const { category, categoryIds, md5List } = scope;
  const md5Regex =
    md5List.length > 0
      ? new RegExp(md5List.map(escapeRegExp).join("|"), "i")
      : null;

  const productMatch = {
    status: "Active",
    $or: [
      { category: { $in: categoryIds } },
      { sub_category: { $in: categoryIds } },
      ...(md5List.length ? [{ category_new: { $in: md5List } }] : []),
      ...(md5Regex ? [{ sub_category_new: md5Regex }] : []),
    ],
  };

  const brandAgg = await Product.aggregate([
    { $match: productMatch },
    { $group: { _id: "$brand", count: { $sum: 1 } } },
  ]);

  const brandIds = brandAgg
    .map((row) => row._id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

  if (!brandIds.length) return [];

  const brands = await Brand.find({
    _id: { $in: brandIds },
    $or: [{ status: "Active" }, { status: { $exists: false } }, { status: null }],
  })
    .select("brand_name brand_slug image status")
    .lean();

  const countMap = Object.fromEntries(
    brandAgg.map((row) => [String(row._id), row.count || 0])
  );

  const categorySlug = category.category_slug;

  return brands
    .map((brand) => {
      const image = normalizeBrandImage(brand.image);
      const brandSlug = brand.brand_slug || "";
      const url =
        categorySlug && brandSlug
          ? `/category/brand/${encodeURIComponent(categorySlug)}/${encodeURIComponent(brandSlug)}`
          : "";
      return {
        _id: brand._id,
        brand_name: brand.brand_name,
        brand_slug: brandSlug,
        image,
        url,
        count: countMap[String(brand._id)] || 0,
      };
    })
    .sort((a, b) =>
      String(a.brand_name || "").localeCompare(String(b.brand_name || ""), undefined, {
        sensitivity: "base",
      })
    );
}

/**
 * All active brands with products (home Brand Carousel auto mode).
 * Only returns brands having at least minProducts (default 50), sorted descending by product count.
 */
export async function resolveAllBrands(minProducts = 50) {
  // 1. Aggregate active products count per brand
  const productCounts = await Product.aggregate([
    {
      $match: {
        $or: [
          { status: "Active" },
          { status: "active" },
          { status: { $exists: false } },
          { status: null },
        ],
      },
    },
    {
      $group: {
        _id: { $toString: "$brand" },
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map();
  productCounts.forEach((c) => {
    if (c._id && c._id !== "null") {
      countMap.set(c._id, c.count);
    }
  });

  // 2. Fetch active brands
  const brands = await Brand.find({
    $or: [{ status: "Active" }, { status: "active" }, { status: { $exists: false } }, { status: null }],
  })
    .select("brand_name brand_slug image status")
    .lean();

  return brands
    .map((brand) => {
      const id = String(brand._id);
      const brandSlug = brand.brand_slug || "";
      const count = countMap.get(id) || 0;
      return {
        _id: brand._id,
        brand_name: brand.brand_name,
        brand_slug: brandSlug,
        image: normalizeBrandImage(brand.image),
        url: brandSlug ? `/brand/${encodeURIComponent(brandSlug)}` : "",
        count,
      };
    })
    .filter((brand) => brand.count >= minProducts && brand.image)
    .sort((a, b) => b.count - a.count);
}

/**
 * Map resolved category brands into Brand Carousel item shape.
 */
export function brandsToCarouselItems(brands = []) {
  return brands.map((brand, index) => ({
    _id: brand._id,
    image: brand.image,
    url: brand.url || "",
    notes: brand.brand_name || "",
    isActive: true,
    order: index,
  }));
}
