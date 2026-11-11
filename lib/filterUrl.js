/**
 * SEO-friendly filter URL mapping layer.
 * Browser uses slugs only; converts to/from Mongo IDs for existing APIs.
 * Does NOT change backend filtering or category routes.
 */

export function slugifyFilter(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/%/g, "percent")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Query keys reserved for special filters (not filter-group names). */
export const FILTER_URL = {
  BRAND: "brand",
  MIN_PRICE: "min-price",
  MAX_PRICE: "max-price",
  CATEGORY: "category",
  SUBCATEGORY: "subcategory",
};

const RESERVED_KEYS = new Set([
  FILTER_URL.BRAND,
  FILTER_URL.MIN_PRICE,
  FILTER_URL.MAX_PRICE,
  FILTER_URL.CATEGORY,
  FILTER_URL.SUBCATEGORY,
  "sort",
  "page",
  "limit",
  "query",
  "q",
]);

function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getFilterSlug(filter) {
  if (filter?.filter_slug) return slugifyFilter(filter.filter_slug);
  return slugifyFilter(filter?.filter_name || filter?.name || filter?.filter_value);
}

function getGroupSlug(group) {
  if (group?.slug) return slugifyFilter(group.slug);
  if (group?.filtergroup_slug) return slugifyFilter(group.filtergroup_slug);
  return slugifyFilter(group?.name || group?.filter_group_name);
}

function getBrandSlug(brand) {
  if (brand?.brand_slug) return slugifyFilter(brand.brand_slug);
  return slugifyFilter(brand?.brand_name || brand?.name);
}

function getCategorySlug(cat) {
  if (cat?.category_slug) return slugifyFilter(cat.category_slug);
  if (cat?.slug) return slugifyFilter(cat.slug);
  return slugifyFilter(cat?.category_name || cat?.name);
}

function walkCategoryTree(nodes, visit) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    visit(node);
    if (node?.subCategories?.length) walkCategoryTree(node.subCategories, visit);
    if (node?.subcategories?.length) walkCategoryTree(node.subcategories, visit);
  }
}

/**
 * Build bidirectional slug ↔ id maps from current sidebar options.
 */
export function buildFilterLookupMaps({
  brands = [],
  filterGroups = {},
  categoryTree = [],
  subcategoryTree = [],
} = {}) {
  const brandSlugToId = new Map();
  const brandIdToSlug = new Map();
  const groupSlugToFilterSlugToId = new Map();
  const filterIdToMeta = new Map(); // id -> { groupSlug, filterSlug }
  const categorySlugToId = new Map();
  const categoryIdToSlug = new Map();
  const subcategorySlugToId = new Map();
  const subcategoryIdToSlug = new Map();

  for (const brand of brands || []) {
    const rawId = brand?._id ?? brand?.brandId ?? brand?.id;
    const id = rawId != null ? String(rawId) : "";
    if (!id) continue;
    const slug = getBrandSlug(brand);
    if (!slug) continue;
    brandSlugToId.set(slug, id);
    brandIdToSlug.set(id, slug);
  }

  for (const group of Object.values(filterGroups || {})) {
    const groupSlug = getGroupSlug(group);
    if (!groupSlug || RESERVED_KEYS.has(groupSlug)) continue;

    if (!groupSlugToFilterSlugToId.has(groupSlug)) {
      groupSlugToFilterSlugToId.set(groupSlug, new Map());
    }
    const filterMap = groupSlugToFilterSlugToId.get(groupSlug);

    for (const filter of group.filters || []) {
      const rawId = filter?._id ?? filter?.filter_id ?? filter?.id;
      const id = rawId != null ? String(rawId) : "";
      if (!id) continue;
      const filterSlug = getFilterSlug(filter);
      if (!filterSlug) continue;
      filterMap.set(filterSlug, id);
      filterIdToMeta.set(id, { groupSlug, filterSlug });
    }
  }

  walkCategoryTree(categoryTree, (cat) => {
    const rawId = cat?._id ?? cat?.category_id ?? cat?.id;
    const id = rawId != null ? String(rawId) : "";
    if (!id) return;
    const slug = getCategorySlug(cat);
    if (!slug) return;
    categorySlugToId.set(slug, id);
    categoryIdToSlug.set(id, slug);
  });

  walkCategoryTree(subcategoryTree, (cat) => {
    const rawId = cat?._id ?? cat?.category_id ?? cat?.id;
    const id = rawId != null ? String(rawId) : "";
    if (!id) return;
    const slug = getCategorySlug(cat);
    if (!slug) return;
    subcategorySlugToId.set(slug, id);
    subcategoryIdToSlug.set(id, slug);
  });

  return {
    brandSlugToId,
    brandIdToSlug,
    groupSlugToFilterSlugToId,
    filterIdToMeta,
    categorySlugToId,
    categoryIdToSlug,
    subcategorySlugToId,
    subcategoryIdToSlug,
  };
}

function isDefaultPrice(price, priceRange) {
  if (!price || price.min == null || price.max == null) return true;
  if (!priceRange || priceRange.length < 2) return true;
  const [min, max] = priceRange;
  return (
    Number(price.min) === Number(min) && Number(price.max) === Number(max)
  );
}

/**
 * Convert selectedFilters (IDs) → query string (slugs). Empty string if none.
 */
export function selectedFiltersToQueryString(
  selectedFilters,
  maps,
  priceRange
) {
  const params = new URLSearchParams();
  if (!selectedFilters || !maps) return "";

  const brandSlugs = (selectedFilters.brands || [])
    .map((id) => maps.brandIdToSlug.get(String(id)))
    .filter(Boolean);
  if (brandSlugs.length > 0) {
    params.set(FILTER_URL.BRAND, [...new Set(brandSlugs)].join(","));
  }

  const categorySlugs = (selectedFilters.categories || [])
    .map((id) => maps.categoryIdToSlug.get(String(id)))
    .filter(Boolean);
  if (categorySlugs.length > 0) {
    params.set(FILTER_URL.CATEGORY, [...new Set(categorySlugs)].join(","));
  }

  const subcategorySlugs = (selectedFilters.subcategories || [])
    .map((id) => maps.subcategoryIdToSlug?.get(String(id)))
    .filter(Boolean);
  if (subcategorySlugs.length > 0) {
    params.set(FILTER_URL.SUBCATEGORY, [...new Set(subcategorySlugs)].join(","));
  }

  // Group attribute filters: ram=12-gb,storage=256-gb
  const byGroup = new Map();
  for (const id of selectedFilters.filters || []) {
    const meta = maps.filterIdToMeta.get(String(id));
    if (!meta) continue;
    if (!byGroup.has(meta.groupSlug)) byGroup.set(meta.groupSlug, []);
    byGroup.get(meta.groupSlug).push(meta.filterSlug);
  }

  const sortedGroupKeys = [...byGroup.keys()].sort();
  for (const groupSlug of sortedGroupKeys) {
    const slugs = [...new Set(byGroup.get(groupSlug))];
    if (slugs.length > 0) params.set(groupSlug, slugs.join(","));
  }

  if (
    selectedFilters.price &&
    priceRange &&
    !isDefaultPrice(selectedFilters.price, priceRange)
  ) {
    params.set(FILTER_URL.MIN_PRICE, String(selectedFilters.price.min));
    params.set(FILTER_URL.MAX_PRICE, String(selectedFilters.price.max));
  }

  return params.toString();
}

/**
 * Convert URL search params (slugs) → selectedFilters (IDs).
 * Unknown slugs are ignored safely.
 */
export function searchParamsToSelectedFilters(
  searchParams,
  maps,
  priceRange
) {
  const result = {
    categories: [],
    subcategories: [],
    brands: [],
    price: {
      min: priceRange?.[0] ?? 0,
      max: priceRange?.[1] ?? 100000,
    },
    filters: [],
  };

  if (!searchParams || !maps) return result;

  const get = (key) => {
    if (typeof searchParams.get === "function") return searchParams.get(key);
    return searchParams[key] ?? null;
  };

  const entries =
    typeof searchParams.entries === "function"
      ? [...searchParams.entries()]
      : Object.entries(searchParams || {});

  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey).toLowerCase();
    const values = splitCsv(rawValue);
    if (!values.length) continue;

    if (key === FILTER_URL.BRAND) {
      for (const slug of values) {
        const id = maps.brandSlugToId.get(slugifyFilter(slug));
        if (id) result.brands.push(id);
      }
      continue;
    }

    if (key === FILTER_URL.CATEGORY || key === "categoryids") {
      for (const slug of values) {
        const id = maps.categorySlugToId.get(slugifyFilter(slug));
        if (id) {
          result.categories.push(id);
        } else if (/^[0-9a-fA-F]{24}$/.test(slug)) {
          result.categories.push(slug);
        }
      }
      continue;
    }

    if (key === FILTER_URL.SUBCATEGORY || key === "subcategoryids") {
      for (const slug of values) {
        const id = maps.subcategorySlugToId?.get(slugifyFilter(slug));
        if (id) {
          result.subcategories.push(id);
        } else if (/^[0-9a-fA-F]{24}$/.test(slug)) {
          result.subcategories.push(slug);
        }
      }
      continue;
    }

    if (key === FILTER_URL.MIN_PRICE) {
      const n = parseFloat(values[0]);
      if (!Number.isNaN(n)) result.price.min = n;
      continue;
    }

    if (key === FILTER_URL.MAX_PRICE) {
      const n = parseFloat(values[0]);
      if (!Number.isNaN(n)) result.price.max = n;
      continue;
    }

    if (RESERVED_KEYS.has(key)) continue;

    const filterMap = maps.groupSlugToFilterSlugToId.get(key);
    if (!filterMap) continue;

    for (const slug of values) {
      const id = filterMap.get(slugifyFilter(slug));
      if (id) result.filters.push(id);
    }
  }

  // Clamp price to range when possible
  if (priceRange && priceRange.length >= 2) {
    result.price.min = Math.max(priceRange[0], Math.min(result.price.min, priceRange[1]));
    result.price.max = Math.max(priceRange[0], Math.min(result.price.max, priceRange[1]));
    if (result.price.min > result.price.max) {
      result.price.min = priceRange[0];
      result.price.max = priceRange[1];
    }
  }

  result.brands = [...new Set(result.brands.map(String))];
  result.filters = [...new Set(result.filters.map(String))];
  result.categories = [...new Set(result.categories.map(String))];
  result.subcategories = [...new Set(result.subcategories.map(String))];

  return result;
}

export function hasActiveFilterParams(searchParams) {
  if (!searchParams) return false;
  const entries =
    typeof searchParams.entries === "function"
      ? [...searchParams.entries()]
      : Object.entries(searchParams || {});
  return entries.some(([key, value]) => {
    if (!value) return false;
    const k = String(key).toLowerCase();
    if (k === "sort" || k === "page" || k === "limit" || k === "query" || k === "q") return false;
    return true;
  });
}

export function selectedFiltersEqual(a, b) {
  if (!a || !b) return false;
  const sortJoin = (arr) => [...(arr || [])].map(String).sort().join(",");
  return (
    sortJoin(a.brands) === sortJoin(b.brands) &&
    sortJoin(a.filters) === sortJoin(b.filters) &&
    sortJoin(a.categories) === sortJoin(b.categories) &&
    sortJoin(a.subcategories) === sortJoin(b.subcategories) &&
    Number(a.price?.min) === Number(b.price?.min) &&
    Number(a.price?.max) === Number(b.price?.max)
  );
}

export function selectionKey(filters, omitBrand = false) {
  if (!filters) return "";
  const sortJoin = (arr) => [...(arr || [])].map(String).sort().join(",");
  return [
    omitBrand ? "" : sortJoin(filters.brands),
    sortJoin(filters.filters),
    sortJoin(filters.categories),
    sortJoin(filters.subcategories),
    filters.price?.min ?? "",
    filters.price?.max ?? "",
  ].join("|");
}

/**
 * Normalize filter option objects so slug fields are always present for URL mapping.
 */
export function normalizeFilterOption(filter) {
  const rawId = filter?._id ?? filter?.filter_id ?? filter?.id;
  const filterName = filter?.filter_name || filter?.name || filter?.filter_value || "";
  return {
    ...filter,
    _id: rawId != null ? String(rawId) : "",
    filter_name: filterName,
    filter_slug: filter?.filter_slug || slugifyFilter(filterName),
  };
}

export function buildFilterGroupsFromList(filters = []) {
  const groups = {};
  (filters || []).forEach((filter) => {
    const groupId = filter.filter_group_id || filter.filter_group_name;
    if (!groupId) return;
    if (!groups[groupId]) {
      groups[groupId] = {
        _id: String(groupId),
        name: filter.filter_group_name || "Filters",
        slug: slugifyFilter(
          filter.filter_group_slug || filter.filter_group_name || "filters"
        ),
        filters: [],
      };
    }
    const option = normalizeFilterOption(filter);
    const exists = groups[groupId].filters.some(
      (f) => String(f._id) === String(option._id)
    );
    if (!exists) groups[groupId].filters.push(option);
  });
  return groups;
}

export function normalizeFilterGroup(group, filters) {
  return {
    ...group,
    slug: group.slug || slugifyFilter(group.name || group.filter_group_name),
    filters: (filters || group.filters || []).map(normalizeFilterOption),
  };
}
