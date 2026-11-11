import ecom_category_info from "@/models/ecom_category_info";
import CategoryPage from "@/models/categoryPage";

/** Known CMS / URL typos → canonical category_slug */
const SLUG_ALIASES = {
  "air-conditoner": "air-conditioner",
};

function normalizeSlug(slug) {
  return String(slug || "").trim().toLowerCase();
}

function slugCandidates(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return [];
  const set = new Set([normalized]);
  const alias = SLUG_ALIASES[normalized];
  if (alias) set.add(normalizeSlug(alias));
  return [...set];
}

function isNearSlug(a, b) {
  const left = normalizeSlug(a).replace(/-/g, "");
  const right = normalizeSlug(b).replace(/-/g, "");
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 8 && right.length >= 8) {
    return left.startsWith(right.slice(0, 8)) || right.startsWith(left.slice(0, 8));
  }
  return false;
}

async function findBySlugCandidates(candidates = []) {
  if (!candidates.length) return null;
  const direct = await ecom_category_info
    .findOne({ category_slug: { $in: candidates } })
    .lean();
  if (direct) return direct;

  for (const cand of candidates) {
    const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byRegex = await ecom_category_info
      .findOne({ category_slug: { $regex: new RegExp(`^${escaped}$`, "i") } })
      .lean();
    if (byRegex) return byRegex;
  }
  return null;
}

async function isChildOrDescendant(category, parent) {
  if (!category || !parent) return false;
  if (String(category._id) === String(parent._id)) return false;

  // Direct parent match
  if (
    String(category.parentid) === String(parent._id) ||
    (category.parentid_new &&
      parent.md5_cat_name &&
      category.parentid_new === parent.md5_cat_name)
  ) {
    return true;
  }

  // Walk up ancestor chain
  let currentParentId = category.parentid;
  const visited = new Set([String(category._id)]);
  while (
    currentParentId &&
    currentParentId !== "none" &&
    !visited.has(String(currentParentId))
  ) {
    visited.add(String(currentParentId));
    if (String(currentParentId) === String(parent._id)) {
      return true;
    }
    const ancestor = await ecom_category_info
      .findById(currentParentId)
      .select("parentid parentid_new")
      .lean();
    if (!ancestor) break;
    if (
      ancestor.parentid_new &&
      parent.md5_cat_name &&
      ancestor.parentid_new === parent.md5_cat_name
    ) {
      return true;
    }
    currentParentId = ancestor.parentid;
  }

  return false;
}

/**
 * Resolve a category document by URL slug.
 * If parentSlug is provided, validates that parent exists and category is a child/descendant of parent.
 */
export async function resolveCategoryBySlug(slug, parentSlug = null) {
  const candidates = slugCandidates(slug);
  if (!candidates.length) return null;

  let direct = await findBySlugCandidates(candidates);
  if (!direct) {
    for (const cand of candidates) {
      const page = await CategoryPage.findOne({ categorySlug: cand })
        .select("categoryId")
        .lean();
      if (page?.categoryId) {
        direct = await ecom_category_info.findById(page.categoryId).lean();
        if (direct) break;
      }
    }
  }

  if (!direct || (direct.status === "Inactive" && direct.category_slug !== "combo-offers")) {
    return null;
  }

  const parentKey = normalizeSlug(parentSlug);
  if (parentKey) {
    const parentCandidates = slugCandidates(parentKey);
    let parent = await findBySlugCandidates(parentCandidates);
    if (!parent) {
      for (const cand of parentCandidates) {
        const page = await CategoryPage.findOne({ categorySlug: cand })
          .select("categoryId")
          .lean();
        if (page?.categoryId) {
          parent = await ecom_category_info.findById(page.categoryId).lean();
          if (parent) break;
        }
      }
    }

    if (!parent || parent.status === "Inactive") {
      return null;
    }

    const matchesRelationship = await isChildOrDescendant(direct, parent);
    if (!matchesRelationship) {
      return null;
    }
  }

  return direct;
}

