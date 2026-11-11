import Product from "@/models/product";

export function slugifyProductName(text = "") {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueProductSlug(baseName, { excludeId } = {}) {
  const base = slugifyProductName(baseName) || `product-${Date.now()}`;
  let slug = base;
  let n = 0;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Product.findOne(query).select("_id").lean();
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}
