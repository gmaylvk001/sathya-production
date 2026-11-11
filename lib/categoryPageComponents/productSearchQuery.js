export function buildProductSearchQuery({
  categoryId,
  ownerType = "category",
  q = "",
  brandId,
} = {}) {
  const params = new URLSearchParams({
    categoryId: String(categoryId || ""),
    ownerType,
    q,
  });
  if (brandId) params.set("brandId", String(brandId));
  return params.toString();
}
