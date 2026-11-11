import { getDiscountInfo } from "./discountHelper.js";

/** Coerce brandMap entries (string or { brand_name/name }) to a display label. */
function brandMapLabel(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.brand_name || value.name || "").trim();
  }
  return String(value).trim();
}

export function normalizeProduct(product, brandMap = {}) {
  if (!product) return null;

  const originalPrice = Number(product.price ?? product.originalPrice) || 0;
  const catalogSpecial = Number(product.special_price) || 0;
  const lsp = Number(product.lsp) || 0;
  // Exist card/PDP priority when Unilet price was not applied: LSP → special → MRP
  const skipLsp =
    Boolean(product.isUnilet) ||
    /^pre[- ]?order$/i.test(String(product.stock_status || "").trim());
  const usingLsp =
    Boolean(product.usingLsp) || (!skipLsp && lsp > 0);
  const specialPriceRaw = usingLsp ? lsp : catalogSpecial;
  const { discountPercent, showDiscount } = getDiscountInfo(originalPrice, specialPriceRaw);
  const hasDiscount = showDiscount;
  const currentPrice = hasDiscount
    ? specialPriceRaw
    : specialPriceRaw > 0
      ? specialPriceRaw
      : Number(product.currentPrice) || originalPrice;

  const brandId =
    product.brand?._id ||
    product.brand?.id ||
    (typeof product.brand === "string" ? product.brand : null);
  const resolvedBrandMap = brandId ? brandMapLabel(brandMap[brandId]) : "";

  const brandNameCandidate =
    product.brand?.name ||
    product.brand?.brand_name ||
    product.brand_name ||
    resolvedBrandMap ||
    (typeof product.brand === "string" &&
    !/^[0-9a-fA-F]{24}$/.test(product.brand) &&
    product.brand.toUpperCase() !== "SATHYA"
      ? product.brand
      : "") ||
    (typeof product.brandName === "string" &&
    product.brandName.toUpperCase() !== "SATHYA"
      ? product.brandName
      : "") ||
    product.manufacturer_name ||
    "";

  let brandName = brandMapLabel(brandNameCandidate);

  if (!brandName && typeof product.name === "string" && product.name.trim()) {
    const firstWord = product.name.trim().split(/\s+/)[0] || "";
    const firstWordLower = firstWord.toLowerCase();
    const matchedBrand = Object.values(brandMap)
      .map(brandMapLabel)
      .find((label) => label && label.toLowerCase() === firstWordLower);
    if (matchedBrand) {
      brandName = matchedBrand;
    } else if (/^windzy/i.test(product.name)) {
      brandName = "WINDZY";
    } else if (/^acer/i.test(product.name)) {
      brandName = "Acer";
    }
  }

  const rawQty = product.quantity ?? product.stock;
  const hasExplicitQty = rawQty !== undefined && rawQty !== null;
  const inStock =
    product.inStock !== undefined
      ? Boolean(product.inStock)
      : ((product.stock_status === "In Stock" || product.stock_status === "instock") &&
        (!hasExplicitQty || Number(rawQty) > 0));
  const quantity = hasExplicitQty ? Number(rawQty) : (inStock ? 10 : 0);

  const ratingValue = Number(
    product.avgRating || product.rating || product.average_rating || 0
  );
  const reviewCount = Number(
    product.reviewCount || product.reviews_count || product.numReviews || 0
  );

  let imgSrc = "/uploads/products/placeholder.jpg";
  const validImage = Array.isArray(product.images)
    ? product.images.find(img => img && typeof img === "string" && img.trim() !== "" && img.trim().toLowerCase() !== "null" && img.trim().toLowerCase() !== "undefined")
    : (typeof product.images === "string" && product.images.trim() ? product.images : null);

  const imagepathname = validImage || product.imgSrc || product.image || "";

  if (imagepathname) {
    if (imagepathname.startsWith("http")) {
      imgSrc = imagepathname;
    } else {
      const clean = imagepathname
        .replace(/^\/?(uploads\/products\/)?/, "")
        .replace(/^\/+/, "");
      imgSrc = `/uploads/products/${clean}`;
    }
  } else if (product.imgSrc) {
    imgSrc = product.imgSrc;
  }

  const _id = product._id || product.id || "";
  const slug = product.slug || _id;

  return {
    ...product,
    _id,
    slug,
    name: product.name || "",
    currentPrice,
    originalPrice,
    price: originalPrice,
    special_price: specialPriceRaw > 0 ? specialPriceRaw : product.special_price,
    hasDiscount,
    discountPercent,
    brand: product.brand || brandName,
    brand_name: product.brand_name || brandName,
    brandName,
    inStock,
    stock_status: product.stock_status || (inStock ? "In Stock" : "Out of Stock"),
    quantity,
    ratingValue,
    reviewCount,
    imgSrc,
    images: (Array.isArray(product.images) && product.images.length > 0) ? product.images : (imgSrc ? [imgSrc] : []),
    movement: product.movement,
    lsp: lsp,
    hasLspPrice: usingLsp,
    usingLsp,
  };
}
