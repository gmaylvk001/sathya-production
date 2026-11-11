import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HeaderMenuItem from "@/models/header_menu_item";
import Category from "@/models/ecom_category_info";

const g = globalThis;
if (!g.__sathyaHeaderMenuCache) {
  g.__sathyaHeaderMenuCache = { data: null, at: 0 };
}

const PUBLIC_CACHE_TTL_MS = 60 * 1000;

export function invalidateHeaderMenuCache() {
  g.__sathyaHeaderMenuCache.data = null;
  g.__sathyaHeaderMenuCache.at = 0;
}

const DEFAULT_CUSTOM_LINKS = [
  { label: "Blogs", href: "/blog" },
  { label: "Loyalty", href: "/loyalty" },
];

/**
 * First run only: copy today's red bar (Active root categories) so the storefront
 * doesn't lose its menu, then append Blogs / Loyalty as Inactive for the admin to enable.
 */
export async function seedHeaderMenuIfEmpty() {
  if (g.__sathyaHeaderMenuSeeded) return false;
  await dbConnect();

  // One-time marker so a menu the admin intentionally emptied is not re-seeded.
  const meta = mongoose.connection.db.collection("header_menu_meta");
  const marker = await meta.findOne({ _id: "seed" });
  if (marker) {
    g.__sathyaHeaderMenuSeeded = true;
    return false;
  }

  const existing = await HeaderMenuItem.estimatedDocumentCount();
  if (existing > 0) {
    await meta.updateOne({ _id: "seed" }, { $set: { at: new Date() } }, { upsert: true });
    g.__sathyaHeaderMenuSeeded = true;
    return false;
  }

  try {
    await meta.insertOne({ _id: "seed", at: new Date() });
  } catch {
    g.__sathyaHeaderMenuSeeded = true;
    return false;
  }

  const roots = await Category.find({ parentid: "none", status: "Active" })
    .sort({ position: 1 })
    .select("_id category_name")
    .lean();

  const docs = roots.map((cat, index) => ({
    type: "category",
    label: cat.category_name,
    category_id: String(cat._id),
    position: index,
    status: "Active",
  }));

  DEFAULT_CUSTOM_LINKS.forEach((link, i) => {
    docs.push({
      type: "custom",
      label: link.label,
      href: link.href,
      position: roots.length + i,
      status: "Inactive",
    });
  });

  if (docs.length) {
    await HeaderMenuItem.insertMany(docs, { ordered: false }).catch(() => {});
  }
  g.__sathyaHeaderMenuSeeded = true;
  invalidateHeaderMenuCache();
  return true;
}

/** Admin list: every item with its category snapshot attached. */
export async function listHeaderMenuItemsForAdmin() {
  await dbConnect();
  await seedHeaderMenuIfEmpty();

  const items = await HeaderMenuItem.find({}).sort({ position: 1, createdAt: 1 }).lean();

  const categoryIds = items
    .filter((i) => i.type === "category" && mongoose.Types.ObjectId.isValid(i.category_id))
    .map((i) => i.category_id);

  const cats = categoryIds.length
    ? await Category.find({ _id: { $in: categoryIds } })
        .select("_id category_name category_slug status parentid position")
        .lean()
    : [];
  const catMap = new Map(cats.map((c) => [String(c._id), c]));

  const withCategory = items.map((item) => {
    const cat = item.type === "category" ? catMap.get(String(item.category_id)) : null;
    return {
      ...item,
      _id: String(item._id),
      category: cat
        ? {
            _id: String(cat._id),
            category_name: cat.category_name,
            category_slug: cat.category_slug,
            status: cat.status,
            position: Number(cat.position) || 0,
          }
        : null,
    };
  });

  const categoryItems = withCategory
    .filter((i) => i.type === "category")
    .sort((a, b) => (a.category?.position ?? Infinity) - (b.category?.position ?? Infinity));
  return [...categoryItems, ...withCategory.filter((i) => i.type === "custom")];
}

function buildActiveChildrenTree(allCats, rootId) {
  const byParent = new Map();
  for (const c of allCats) {
    const parent = c.parentid && c.parentid !== "none" ? String(c.parentid) : "none";
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(c);
  }

  const build = (parentId, visiting = new Set()) => {
    if (visiting.has(parentId)) return [];
    visiting.add(parentId);
    const children = (byParent.get(parentId) || [])
      .filter((c) => c.status === "Active")
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    const out = children.map((c) => ({
      ...c,
      _id: String(c._id),
      parentid: String(c.parentid),
      subcategories: build(String(c._id), visiting),
    }));
    visiting.delete(parentId);
    return out;
  };

  return build(String(rootId));
}

/**
 * Storefront menu: Active items in order. Category items whose category is missing
 * or Inactive are dropped; each category carries its Active descendant tree so the
 * header can decide dropdown vs direct link.
 */
export async function getPublicHeaderMenu() {
  const cache = g.__sathyaHeaderMenuCache;
  if (cache.data && Date.now() - cache.at < PUBLIC_CACHE_TTL_MS) {
    return cache.data;
  }

  await dbConnect();
  await seedHeaderMenuIfEmpty();

  const items = await HeaderMenuItem.find({ status: "Active" })
    .sort({ position: 1, createdAt: 1 })
    .lean();

  const needsCategories = items.some((i) => i.type === "category");
  const allCats = needsCategories
    ? await Category.find({})
        .select("_id category_name category_slug status parentid position image navImage icon_url")
        .lean()
    : [];
  const catMap = new Map(allCats.map((c) => [String(c._id), c]));

  const result = [];
  for (const item of items) {
    if (item.type === "custom") {
      if (!item.href) continue;
      result.push({
        _id: String(item._id),
        type: "custom",
        label: item.label || item.href,
        href: item.href,
      });
      continue;
    }

    const cat = catMap.get(String(item.category_id));
    if (!cat || cat.status !== "Active") continue;

    const subcategories = buildActiveChildrenTree(allCats, cat._id);
    result.push({
      _id: String(item._id),
      type: "category",
      label: cat.category_name,
      category: {
        ...cat,
        _id: String(cat._id),
        parentid: cat.parentid ? String(cat.parentid) : "none",
        subcategories,
      },
    });
  }

  // Categories follow /admin/category position; custom links come after them.
  const catPosition = (entry) => Number(entry.category?.position) || 0;
  const ordered = [
    ...result.filter((e) => e.type === "category").sort((a, b) => catPosition(a) - catPosition(b)),
    ...result.filter((e) => e.type === "custom"),
  ];

  cache.data = ordered;
  cache.at = Date.now();
  return ordered;
}
