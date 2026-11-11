import { getDiscountInfo } from "./discountHelper.js";
import { normalizeRegion } from "./regionHelper.js";
import OwnerProduct from "@/models/OwnerProduct";

/** on = Karnataka orders use OwnerProduct price. off, empty, or missing = Sathya catalog price. */
export function showUniletPriceToOrder() {
  return String(process.env.show_unilet_price_to_order || "").trim().toLowerCase() === "on";
}

/** Exist product.blade.php: LSP block is skipped for Pre-Order. */
export function isPreOrderStockStatus(stockStatus) {
  return /^pre[- ]?order$/i.test(String(stockStatus || "").trim());
}

/**
 * Exist PDP selling-price priority (Sathya path only):
 * lsp ≠ 0 → LSP, else special_price ≠ 0 → special, else MRP (price).
 * Unilet price view callers must skip this (handled inside resolveProductPrice).
 */
export function resolveSathyaSellingPrice(product) {
  const mrp = Number(product?.price) || 0;
  const specialPrice = Number(product?.special_price) || 0;
  const lsp = Number(product?.lsp) || 0;
  const skipLsp = isPreOrderStockStatus(product?.stock_status);

  if (!skipLsp && lsp > 0) {
    return {
      mrp,
      specialPrice,
      lsp,
      effectivePrice: lsp,
      displaySpecialPrice: lsp,
      usingLsp: true,
    };
  }

  if (specialPrice > 0) {
    return {
      mrp,
      specialPrice,
      lsp,
      effectivePrice: specialPrice,
      displaySpecialPrice: specialPrice,
      usingLsp: false,
    };
  }

  return {
    mrp,
    specialPrice: 0,
    lsp,
    effectivePrice: mrp,
    displaySpecialPrice: 0,
    usingLsp: false,
  };
}

/**
 * Resolves product pricing and stock status based on region.
 * Karnataka stock still comes from the active OwnerProduct.
 * OwnerProduct price is used only when show_unilet_price_to_order=on
 * (Exist Unilet view ON → LSP display block skipped).
 * Otherwise Exist priority: LSP → special_price → MRP.
 */
export const resolveProductPrice = (product, ownerProduct = null, region = "tamilnadu") => {
  if (!product) {
    return {
      price: 0,
      special_price: 0,
      effectivePrice: 0,
      discountPercentage: 0,
      saveAmount: 0,
      showDiscount: false,
      inStock: false,
      stock: 0,
      isUnilet: false,
      usingLsp: false,
    };
  }

  const isKarnataka = region === "karnataka";
  const activeOwner = isKarnataka && ownerProduct && ownerProduct.is_active ? ownerProduct : null;

  // Unilet price view ON → Unilet offer/price; do not apply catalog LSP.
  if (activeOwner && showUniletPriceToOrder()) {
    const mrp = Number(activeOwner.price) || Number(product.price) || 0;
    const offerPrice =
      Number(activeOwner.offer_price) > 0
        ? Number(activeOwner.offer_price)
        : Number(activeOwner.price) > 0
        ? Number(activeOwner.price)
        : Number(product.special_price) || Number(product.price) || 0;

    const effectivePrice = offerPrice > 0 ? offerPrice : mrp;
    const { discountPercent: discountPercentage, showDiscount } = getDiscountInfo(mrp, effectivePrice);
    const saveAmount = showDiscount ? mrp - effectivePrice : 0;
    const stock = Number(activeOwner.stock) || 0;
    const inStock = stock > 0 && activeOwner.stock_status !== "Out of Stock";

    return {
      price: mrp,
      special_price: offerPrice < mrp ? offerPrice : 0,
      effectivePrice,
      discountPercentage,
      saveAmount,
      showDiscount,
      inStock,
      stock,
      isUnilet: true,
      usingLsp: false,
      deliveryDays: activeOwner.delivery_days || 1,
    };
  }

  const {
    mrp,
    displaySpecialPrice,
    effectivePrice,
    usingLsp,
  } = resolveSathyaSellingPrice(product);
  const { discountPercent: discountPercentage, showDiscount } = getDiscountInfo(mrp, effectivePrice);
  const saveAmount = showDiscount ? mrp - effectivePrice : 0;

  // Karnataka stock always from OwnerProduct (never catalog products.quantity).
  // No active owner → treat as out of stock (matches check-delivery KA gate).
  let stock;
  let inStock;
  if (isKarnataka) {
    stock = activeOwner ? Number(activeOwner.stock) || 0 : 0;
    inStock = Boolean(
      activeOwner &&
        stock > 0 &&
        activeOwner.stock_status !== "Out of Stock"
    );
  } else {
    stock = Number(product.quantity) || 0;
    inStock =
      (stock > 0 || product.movement === "CUS-Order") &&
      product.stock_status !== "Out of Stock";
  }

  return {
    price: mrp,
    // Remap special_price so PDP/cart/EMI consumers that read special_price show LSP
    // the same way Exist $fprice prefers lsp first (Unilet path already returned above).
    special_price: displaySpecialPrice,
    effectivePrice,
    discountPercentage,
    saveAmount,
    showDiscount,
    inStock,
    stock,
    isUnilet: false,
    usingLsp,
    deliveryDays: activeOwner?.delivery_days || 2,
  };
};

export function readRequestRegion(request) {
  const url = request?.url ? new URL(request.url) : null;
  const raw =
    url?.searchParams.get("region") ||
    url?.searchParams.get("state") ||
    request?.cookies?.get?.("sathya_location")?.value ||
    "";
  if (!raw) return "tamilnadu";

  let value = raw;
  try {
    if (value.startsWith("%")) value = decodeURIComponent(value);
    if (value.startsWith("{")) {
      const parsed = JSON.parse(value);
      return normalizeRegion(parsed.region || parsed.state || parsed.stateName) || "tamilnadu";
    }
  } catch {
    // use the raw value below
  }
  return normalizeRegion(value) || "tamilnadu";
}

/**
 * Applies region/Unilet prices when Unilet view is on for Karnataka;
 * otherwise applies Exist Sathya priority (LSP → special → MRP) so cards match PDP.
 */
export async function applyRegionPrices(products, region = "tamilnadu") {
  if (!Array.isArray(products) || products.length === 0) return products;
  const list = products.map((product) => (product?.toObject ? product.toObject() : product));

  const needOwners = region === "karnataka" && showUniletPriceToOrder();
  let byProductId = new Map();
  let byCode = new Map();

  if (needOwners) {
    const ids = list.map((product) => product?._id).filter(Boolean);
    const codes = list.map((product) => product?.item_code).filter(Boolean);
    if (ids.length || codes.length) {
      const owners = await OwnerProduct.find({
        is_active: true,
        $or: [
          ...(ids.length ? [{ product_id: { $in: ids } }] : []),
          ...(codes.length ? [{ product_item_code: { $in: codes } }] : []),
        ],
      }).lean();

      for (const owner of owners) {
        if (owner.product_id) byProductId.set(String(owner.product_id), owner);
        if (owner.product_item_code) byCode.set(String(owner.product_item_code), owner);
      }
    }
  }

  return list.map((product) => {
    const owner = needOwners
      ? byProductId.get(String(product?._id)) ||
        (product?.item_code ? byCode.get(String(product.item_code)) : null)
      : null;
    const priceInfo = resolveProductPrice(product, owner, region);
    return {
      ...product,
      price: priceInfo.price,
      special_price: priceInfo.special_price,
      isUnilet: priceInfo.isUnilet,
      usingLsp: priceInfo.usingLsp,
    };
  });
}

