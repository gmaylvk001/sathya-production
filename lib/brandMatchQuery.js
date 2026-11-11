/**
 * Products store `brand` as an ObjectId string or a brand name.
 */
export function brandMatchQuery(brand) {
  if (!brand?._id) return {};
  const brandName = String(brand.brand_name || "").trim();
  const brandId = String(brand._id);
  return {
    $or: [
      { brand: brandId },
      { brand: brand._id },
      ...(brandName
        ? [
            { brand: brandName },
            {
              brand: new RegExp(
                `^${brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
              ),
            },
          ]
        : []),
    ],
  };
}
