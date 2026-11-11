import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

export function pageTypeFromLevel(level = 0) {
  if (level <= 0) return PAGE_TYPES.CATEGORY;
  if (level === 1) return PAGE_TYPES.SUB_CATEGORY;
  return PAGE_TYPES.CHILD_CATEGORY;
}

export const CATEGORY_TREE_PAGE_TYPES = [
  PAGE_TYPES.CATEGORY,
  PAGE_TYPES.SUB_CATEGORY,
  PAGE_TYPES.CHILD_CATEGORY,
];

export function availabilityKey(categoryId, pageType, brandId) {
  if (pageType === PAGE_TYPES.CATEGORY_BRAND && brandId) {
    return `${String(categoryId)}:${pageType}:${String(brandId)}`;
  }
  return `${String(categoryId)}:${pageType}`;
}

export function buildCategoryBasePath(slugs = [], level = null) {
  const parts = (slugs || [])
    .map((slug) => String(slug || "").trim())
    .filter(Boolean)
    .map((slug) => encodeURIComponent(slug));
  if (!parts.length) return "/collection";

  if (level === 0) {
    return `/collection/${parts[0]}`;
  }
  if (level === 1) {
    const subSlug = parts[parts.length - 1];
    return `/category/${subSlug}`;
  }
  if (level >= 2) {
    const childSlug = parts[parts.length - 1];
    const subSlug = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return `/category/${subSlug}/${childSlug}`;
  }

  if (parts.length === 1) {
    return `/collection/${parts[0]}`;
  }
  if (parts.length === 2) {
    return `/category/${parts[0]}/${parts[1]}`;
  }
  const childSlug = parts[parts.length - 1];
  const subSlug = parts[parts.length - 2];
  return `/category/${subSlug}/${childSlug}`;
}

/**
 * Build listing or overview href for a category hierarchy path.
 * Appends /overview only when hasOverview is true.
 */
export function buildCategoryHref(slugs = [], hasOverview = false, level = null) {
  const base = buildCategoryBasePath(slugs, level);
  return hasOverview ? `${base}/overview` : base;
}

export function hasOverviewAvailability(map, categoryId, pageType, brandId) {
  if (!map || !categoryId || !pageType) return false;
  const id = String(categoryId);
  if (
    pageType === PAGE_TYPES.CATEGORY_BRAND ||
    pageType === PAGE_TYPES.BRAND
  ) {
    return Boolean(map[availabilityKey(id, pageType, brandId)]);
  }
  // A designed page for this category should open /overview no matter
  // whether admin saved it as category, sub_category, or child_category.
  return CATEGORY_TREE_PAGE_TYPES.some((type) =>
    Boolean(map[availabilityKey(id, type)])
  );
}

export function buildCategoryBrandBasePath(categorySlug = "", brandSlug = "") {
  const cat = String(categorySlug || "").trim();
  const brand = String(brandSlug || "").trim();
  if (!cat || !brand) return "/category";
  return `/category/brand/${encodeURIComponent(cat)}/${encodeURIComponent(brand)}`;
}

export function buildCategoryBrandHref(
  categorySlug = "",
  brandSlug = "",
  hasOverview = false
) {
  const base = buildCategoryBrandBasePath(categorySlug, brandSlug);
  return hasOverview ? `${base}/overview` : base;
}

export function buildBrandBasePath(slug = "") {
  const part = String(slug || "").trim();
  if (!part) return "/brand";
  return `/brand/${encodeURIComponent(part)}`;
}

export function buildBrandHref(slug = "", hasOverview = false) {
  const base = buildBrandBasePath(slug);
  return hasOverview ? `${base}/overview` : base;
}
