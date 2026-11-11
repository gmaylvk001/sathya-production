import mongoose from "mongoose";
import Product from "../models/product.js";
import OwnerProduct from "../models/OwnerProduct.js";
import { normalizeRegion, isValidPincode } from "./regionHelper.js";
import {
  isKarnatakaPincode,
  isUniletProduct,
  UNILET_RESTRICTION_MESSAGE,
} from "./productDeliveryHelper.js";

export const VENDOR_UNILET = "UNILET";
export const VENDOR_SATHYA = "SATHYA";

const SOUTH_INDIAN_STATE_PATTERN =
  /tamil\s*nadu|tamilnadu|karnataka|kerala|andhra|telangana|puducherry|pondicherry/i;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generates clean candidate item_code strings (exact, stripped "ITEM" prefix, and "ITEM"-prefixed)
 * without mutating codes that natively start or do not start with "ITEM".
 */
export function itemCodeVariants(rawCode) {
  const code = String(rawCode || "").trim();
  if (!code) return [];
  const bare = code.replace(/^ITEM/i, "").trim();
  const withItem = bare ? (/^ITEM/i.test(code) ? code : `ITEM${bare}`) : "";
  return [...new Set([code, bare, withItem].filter(Boolean))];
}

/**
 * Normalizes a 6-digit Indian pincode string; returns empty string when absent.
 */
export function cleanPincode(pincode) {
  if (pincode == null) return "";
  const digits = String(pincode).replace(/\D/g, "").trim();
  return digits.slice(0, 6);
}

/**
 * Infers canonical storefront region key from a 6-digit South Indian pincode.
 */
export function inferRegionFromPincode(pincode) {
  const pinStr = cleanPincode(pincode);
  if (pinStr.length !== 6) return null;
  const pinNum = parseInt(pinStr, 10);
  if (pinNum >= 560001 && pinNum <= 599999) return "karnataka";
  if (pinNum >= 600001 && pinNum <= 649999) return "tamilnadu";
  if (pinNum >= 670001 && pinNum <= 699999) return "kerala";
  if (pinNum >= 500001 && pinNum <= 509999) return "telangana";
  if (pinNum >= 510001 && pinNum <= 539999) return "andhra";
  return null;
}

/**
 * Checks whether a 6-digit pincode belongs to covered South Indian delivery zones
 * (KA: 56-59, TN/PY: 60-64, KL: 67-69, AP/TG: 50-53).
 */
export function isServiceableSouthIndiaPincode(pincode) {
  const pinStr = cleanPincode(pincode);
  if (!isValidPincode(pinStr)) return false;
  if (pinStr.startsWith("0") || pinStr.startsWith("9")) return false;
  const prefix2 = parseInt(pinStr.substring(0, 2), 10);
  if (prefix2 >= 56 && prefix2 <= 59) {
    const num = parseInt(pinStr, 10);
    return num >= 560001 && num <= 599999;
  }
  if (prefix2 >= 60 && prefix2 <= 64) {
    const num = parseInt(pinStr, 10);
    return num >= 600001 && num <= 649999;
  }
  return (prefix2 >= 50 && prefix2 <= 53) || (prefix2 >= 67 && prefix2 <= 69);
}

/**
 * Resolves strict regional vendor partition (UNILET for Karnataka, SATHYA for non-Karnataka).
 * Authoritative precedence:
 * 1. Explicit Store Pickup storeOwner ('unilet' vs 'sathya') when deliveryType === 'store'
 * 2. Valid 6-digit pincode range (560001-599999 => UNILET, other serviceable => SATHYA)
 * 3. State / region fallback when pincode is not provided
 */
export function resolveRegionVendorContext({
  pincode = "",
  state = "",
  region = "",
  deliveryType = "home",
  storeOwner = null,
} = {}) {
  const rawPin = String(pincode ?? "").trim();
  const normalizedPin = cleanPincode(rawPin);
  const hasPinInput = rawPin !== "";

  if (hasPinInput) {
    if (!isValidPincode(normalizedPin) || normalizedPin.startsWith("0") || normalizedPin.startsWith("9")) {
      const stateSuggestsKA = /karnataka/i.test(String(state || "")) || normalizeRegion(region || state) === "karnataka";
      return {
        validPincode: false,
        pincode: normalizedPin,
        isKarnataka: stateSuggestsKA,
        assignedVendor: stateSuggestsKA ? VENDOR_UNILET : VENDOR_SATHYA,
        vendorId: stateSuggestsKA ? "unilet" : "sathya",
        vendorName: stateSuggestsKA ? "Unilet" : "Sathya Stores",
        region: stateSuggestsKA ? "karnataka" : normalizeRegion(region || state || "tamilnadu"),
        errorReason: "Please enter a valid 6-digit pincode",
      };
    }
  }

  const normalizedStoreOwner = String(storeOwner || "").trim().toLowerCase();
  const isStorePickup = String(deliveryType || "").trim().toLowerCase() === "store" || String(deliveryType || "").trim().toLowerCase() === "store_pickup";

  let isKarnataka = false;
  if (isStorePickup && (normalizedStoreOwner === "unilet" || normalizedStoreOwner === "sathya")) {
    isKarnataka = normalizedStoreOwner === "unilet";
  } else if (normalizedPin.length === 6) {
    isKarnataka = isKarnatakaPincode(normalizedPin);
  } else {
    isKarnataka =
      /karnataka/i.test(String(state || "")) ||
      normalizeRegion(region || state) === "karnataka";
  }

  const inferredFromPin = normalizedPin.length === 6 ? inferRegionFromPincode(normalizedPin) : null;
  const resolvedRegion = isKarnataka
    ? "karnataka"
    : inferredFromPin || normalizeRegion(region || state || "tamilnadu");

  return {
    validPincode: true,
    pincode: normalizedPin,
    isKarnataka,
    assignedVendor: isKarnataka ? VENDOR_UNILET : VENDOR_SATHYA,
    vendorId: isKarnataka ? "unilet" : "sathya",
    vendorName: isKarnataka ? "Unilet" : "Sathya Stores",
    region: resolvedRegion,
    errorReason: null,
  };
}

/**
 * Resolves a Product document by ObjectId or item_code variants (including stripped/raw ITEM prefix).
 */
export async function findProductByIdOrCode({
  productId = null,
  itemCode = null,
  ProductModel = Product,
} = {}) {
  const idStr =
    productId && typeof productId === "object"
      ? String(productId._id || productId.id || "")
      : String(productId || "").trim();

  if (idStr && mongoose.isValidObjectId(idStr)) {
    const byId = await ProductModel.findById(idStr).lean();
    if (byId) return byId;
  }

  const codeList = itemCodeVariants(itemCode);
  if (!codeList.length) return null;

  const exact = await ProductModel.findOne({ item_code: { $in: codeList } }).lean();
  if (exact) return exact;

  const bareCode = codeList.find((c) => !/^ITEM/i.test(c)) || codeList[0];
  return ProductModel.findOne({
    item_code: new RegExp(`^${escapeRegex(bareCode)}$`, "i"),
  }).lean();
}

/**
 * Finds the active Unilet OwnerProduct record matching a Product by product_id,
 * product_item_code, or vendor_item_code across normalized code variants.
 */
export async function findUniletOwnerProduct({
  product = null,
  productId = null,
  itemCode = null,
  OwnerProductModel = OwnerProduct,
} = {}) {
  const idCandidates = [];
  const rawProdId = product?._id || productId;
  const prodIdStr =
    rawProdId && typeof rawProdId === "object"
      ? String(rawProdId._id || rawProdId.id || "")
      : String(rawProdId || "").trim();

  if (prodIdStr && mongoose.isValidObjectId(prodIdStr)) {
    idCandidates.push(new mongoose.Types.ObjectId(prodIdStr));
  }

  const codeSet = new Set([
    ...itemCodeVariants(itemCode),
    ...itemCodeVariants(product?.item_code),
    ...itemCodeVariants(product?.sku),
    ...itemCodeVariants(product?.common_item_code),
  ]);
  const codeList = [...codeSet];

  const orClauses = [];
  if (idCandidates.length) {
    orClauses.push({ product_id: { $in: idCandidates } });
  }
  if (codeList.length) {
    orClauses.push({ product_item_code: { $in: codeList } });
    orClauses.push({ vendor_item_code: { $in: codeList } });
  }

  if (!orClauses.length) return null;

  const matches = await OwnerProductModel.find({
    owner_id: { $regex: /^unilet$/i },
    is_active: true,
    $or: orClauses,
  }).lean();

  if (!matches || matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Prefer active in-stock record that matches product.item_code via vendor_item_code/product_item_code or product_id
  const targetCode = String(product?.item_code || itemCode || "").trim().toUpperCase();
  const scored = matches.slice().sort((a, b) => {
    const score = (doc) => {
      let s = 0;
      if (prodIdStr && String(doc.product_id || "") === prodIdStr) s += 4;
      if (targetCode && String(doc.vendor_item_code || "").trim().toUpperCase() === targetCode) s += 3;
      if (targetCode && String(doc.product_item_code || "").trim().toUpperCase() === targetCode) s += 2;
      if (Number(doc.stock || 0) > 0 && doc.stock_status !== "Out of Stock") s += 1;
      return s;
    };
    return score(b) - score(a);
  });

  return scored[0];
}

/**
 * Unified Regional Serviceability & Fulfillment Resolver.
 * Single source of truth consumed by PDP check-delivery, Cart, Checkout validation, and Order creation.
 *
 * @param {object} params
 * @param {string} [params.pincode]
 * @param {string} [params.state]
 * @param {string} [params.region]
 * @param {string|object} [params.productId]
 * @param {string} [params.itemCode]
 * @param {string} [params.item_code]
 * @param {number} [params.quantity=1]
 * @param {object} [params.product] - Optional preloaded Product doc
 * @param {object} [params.ownerProduct] - Optional preloaded OwnerProduct doc
 * @param {string} [params.deliveryType='home'] - 'home' | 'store' | 'store_pickup'
 * @param {string} [params.storeOwner] - Store owner ('unilet' | 'sathya') for store pickup
 * @param {object} [params.geoCheckResult] - Optional pre-computed geo check ({ serviceable, message })
 * @param {object} [params.models] - Optional { Product, OwnerProduct } for testing
 * @returns {Promise<{
 *   isDeliverable: boolean,
 *   assignedVendor: 'UNILET' | 'SATHYA',
 *   vendorId: 'unilet' | 'sathya',
 *   vendorName: 'Unilet' | 'Sathya Stores',
 *   region: string,
 *   availableStock: number,
 *   errorReason?: string,
 *   product?: object|null,
 *   ownerProduct?: object|null,
 *   isUniletOnlyProduct?: boolean,
 * }>}
 */
export async function resolveRegionalFulfillment({
  pincode = "",
  state = "",
  region = "",
  productId = null,
  itemCode = null,
  item_code = null,
  quantity = 1,
  product: providedProduct = null,
  ownerProduct: providedOwnerProduct = null,
  deliveryType = "home",
  storeOwner = null,
  geoCheckResult = null,
  models = null,
} = {}) {
  const ProductModel = models?.Product || Product;
  const OwnerProductModel = models?.OwnerProduct || OwnerProduct;

  const requestedQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const rawCode = itemCode || item_code || providedProduct?.item_code || providedProduct?.sku || "";

  const ctx = resolveRegionVendorContext({
    pincode,
    state,
    region,
    deliveryType,
    storeOwner,
  });

  if (!ctx.validPincode) {
    return {
      isDeliverable: false,
      assignedVendor: ctx.assignedVendor,
      vendorId: ctx.vendorId,
      vendorName: ctx.vendorName,
      region: ctx.region,
      availableStock: 0,
      errorReason: ctx.errorReason,
      product: providedProduct || null,
      ownerProduct: null,
      isUniletOnlyProduct: isUniletProduct(providedProduct),
    };
  }

  // Respect explicit upstream geo check failure (e.g., distance > 600km or non-existent postal code)
  if (geoCheckResult && geoCheckResult.serviceable === false) {
    return {
      isDeliverable: false,
      assignedVendor: ctx.assignedVendor,
      vendorId: ctx.vendorId,
      vendorName: ctx.vendorName,
      region: ctx.region,
      availableStock: 0,
      errorReason: geoCheckResult.message || "Not Available for Delivery at Your Location",
      product: providedProduct || null,
      ownerProduct: null,
      isUniletOnlyProduct: isUniletProduct(providedProduct),
    };
  }

  // When a 6-digit pincode is provided without an upstream geo pass, enforce South Indian territory
  if (ctx.pincode.length === 6 && geoCheckResult?.serviceable !== true) {
    const isCoveredPrefix = isServiceableSouthIndiaPincode(ctx.pincode);
    const isCoveredState = SOUTH_INDIAN_STATE_PATTERN.test(String(state || ""));
    if (!isCoveredPrefix && !isCoveredState) {
      return {
        isDeliverable: false,
        assignedVendor: ctx.assignedVendor,
        vendorId: ctx.vendorId,
        vendorName: ctx.vendorName,
        region: ctx.region,
        availableStock: 0,
        errorReason: "Not Available for Delivery at Your Location",
        product: providedProduct || null,
        ownerProduct: null,
        isUniletOnlyProduct: isUniletProduct(providedProduct),
      };
    }
  }

  // Load Product if not already provided
  let product = providedProduct;
  if (!product && (productId || rawCode)) {
    product = await findProductByIdOrCode({
      productId,
      itemCode: rawCode,
      ProductModel,
    });
  }

  if (!product) {
    return {
      isDeliverable: false,
      assignedVendor: ctx.assignedVendor,
      vendorId: ctx.vendorId,
      vendorName: ctx.vendorName,
      region: ctx.region,
      availableStock: 0,
      errorReason: "Product not found or currently unavailable.",
      product: null,
      ownerProduct: null,
      isUniletOnlyProduct: false,
    };
  }

  if (product.status && product.status !== "Active") {
    return {
      isDeliverable: false,
      assignedVendor: ctx.assignedVendor,
      vendorId: ctx.vendorId,
      vendorName: ctx.vendorName,
      region: ctx.region,
      availableStock: 0,
      errorReason: `Item "${product.name || rawCode}" is currently unavailable.`,
      product,
      ownerProduct: null,
      isUniletOnlyProduct: isUniletProduct(product),
    };
  }

  const isUniletOnly = isUniletProduct(product);
  const displayName = product.name || product.title || rawCode || "Product";

  // Strict Rule 1: Unilet-exclusive SKUs cannot be delivered outside Karnataka
  if (isUniletOnly && !ctx.isKarnataka) {
    return {
      isDeliverable: false,
      assignedVendor: VENDOR_SATHYA,
      vendorId: "sathya",
      vendorName: "Sathya Stores",
      region: ctx.region,
      availableStock: 0,
      errorReason: UNILET_RESTRICTION_MESSAGE,
      product,
      ownerProduct: null,
      isUniletOnlyProduct: true,
    };
  }

  // Strict Rule 2: Karnataka (560001-599999) -> UNILET inventory & fulfillment only
  if (ctx.isKarnataka) {
    const ownerProduct =
      providedOwnerProduct ||
      (await findUniletOwnerProduct({
        product,
        productId,
        itemCode: rawCode,
        OwnerProductModel,
      }));

    if (!ownerProduct) {
      return {
        isDeliverable: false,
        assignedVendor: VENDOR_UNILET,
        vendorId: "unilet",
        vendorName: "Unilet",
        region: "karnataka",
        availableStock: 0,
        errorReason: `Item "${displayName}" is currently unavailable for delivery in Karnataka.`,
        product,
        ownerProduct: null,
        isUniletOnlyProduct: isUniletOnly,
      };
    }

    const availableStock = Math.max(0, Number(ownerProduct.stock ?? ownerProduct.quantity ?? 0) || 0);
    const ownerStatusLower = String(ownerProduct.stock_status || "").trim().toLowerCase();
    const isOwnerOutOfStock =
      ownerStatusLower === "out of stock" ||
      ownerStatusLower === "outofstock" ||
      availableStock <= 0;

    if (isOwnerOutOfStock) {
      return {
        isDeliverable: false,
        assignedVendor: VENDOR_UNILET,
        vendorId: "unilet",
        vendorName: "Unilet",
        region: "karnataka",
        availableStock: 0,
        errorReason: `Item "${displayName}" is out of stock in Karnataka (0 available).`,
        product,
        ownerProduct,
        isUniletOnlyProduct: isUniletOnly,
      };
    }

    if (availableStock < requestedQty) {
      return {
        isDeliverable: false,
        assignedVendor: VENDOR_UNILET,
        vendorId: "unilet",
        vendorName: "Unilet",
        region: "karnataka",
        availableStock,
        errorReason: `Item "${displayName}" is out of stock in Karnataka (${availableStock} available).`,
        product,
        ownerProduct,
        isUniletOnlyProduct: isUniletOnly,
      };
    }

    return {
      isDeliverable: true,
      assignedVendor: VENDOR_UNILET,
      vendorId: "unilet",
      vendorName: "Unilet",
      region: "karnataka",
      availableStock,
      product,
      ownerProduct,
      isUniletOnlyProduct: isUniletOnly,
    };
  }

  // Strict Rule 3: Non-Karnataka (Tamil Nadu / South India) -> SATHYA inventory & fulfillment only
  const isCustomOrder = product.movement === "CUS-Order";
  const availableStock = Math.max(0, Number(product.quantity ?? product.stock ?? 0) || 0);
  const statusLower = String(product.stock_status || "").trim().toLowerCase();
  const isSathyaOutOfStock =
    statusLower === "out of stock" ||
    statusLower === "outofstock" ||
    (!isCustomOrder && availableStock <= 0);

  if (isSathyaOutOfStock) {
    return {
      isDeliverable: false,
      assignedVendor: VENDOR_SATHYA,
      vendorId: "sathya",
      vendorName: "Sathya Stores",
      region: ctx.region,
      availableStock: 0,
      errorReason: `Item "${displayName}" is out of stock (${availableStock} available).`,
      product,
      ownerProduct: null,
      isUniletOnlyProduct: false,
    };
  }

  if (!isCustomOrder && availableStock < requestedQty) {
    return {
      isDeliverable: false,
      assignedVendor: VENDOR_SATHYA,
      vendorId: "sathya",
      vendorName: "Sathya Stores",
      region: ctx.region,
      availableStock,
      errorReason: `Item "${displayName}" is out of stock (${availableStock} available).`,
      product,
      ownerProduct: null,
      isUniletOnlyProduct: false,
    };
  }

  return {
    isDeliverable: true,
    assignedVendor: VENDOR_SATHYA,
    vendorId: "sathya",
    vendorName: "Sathya Stores",
    region: ctx.region,
    availableStock,
    product,
    ownerProduct: null,
    isUniletOnlyProduct: false,
  };
}

/**
 * Resolves and validates regional fulfillment across a list of cart / checkout items.
 */
export async function resolveOrderItemsFulfillment({
  pincode = "",
  state = "",
  region = "",
  deliveryType = "home",
  storeOwner = null,
  items = [],
  geoCheckResult = null,
  models = null,
} = {}) {
  const ctx = resolveRegionVendorContext({
    pincode,
    state,
    region,
    deliveryType,
    storeOwner,
  });

  const itemList = Array.isArray(items) ? items : [];
  const results = [];

  for (const item of itemList) {
    const rawPid =
      item?.productId?._id ||
      item?.productId ||
      item?.id ||
      item?._id ||
      item?.product_id ||
      item?.product ||
      null;
    const rawCode = item?.item_code || item?.itemCode || "";
    const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1));
    const displayName = String(item?.name || item?.product_name || item?.title || rawCode || "Product").trim();

    if (item?.isCombo && item?.comboId) {
      results.push({
        productId: String(item.comboId),
        item_code: rawCode,
        name: displayName,
        quantity: qty,
        isDeliverable: ctx.validPincode,
        assignedVendor: ctx.assignedVendor,
        vendorId: ctx.vendorId,
        vendorName: ctx.vendorName,
        region: ctx.region,
        availableStock: qty,
        ...(ctx.validPincode ? {} : { errorReason: ctx.errorReason }),
      });
      continue;
    }

    const res = await resolveRegionalFulfillment({
      pincode,
      state,
      region,
      productId: rawPid,
      itemCode: rawCode,
      quantity: qty,
      deliveryType,
      storeOwner,
      geoCheckResult,
      models,
    });

    results.push({
      productId: res.product?._id ? String(res.product._id) : String(rawPid || ""),
      item_code: res.product?.item_code || rawCode,
      name: res.product?.name || displayName,
      quantity: qty,
      isDeliverable: res.isDeliverable,
      assignedVendor: res.assignedVendor,
      vendorId: res.vendorId,
      vendorName: res.vendorName,
      region: res.region,
      availableStock: res.availableStock,
      isUniletOnlyProduct: res.isUniletOnlyProduct,
      ...(res.errorReason ? { errorReason: res.errorReason } : {}),
    });
  }

  const unavailableItems = results.filter((r) => !r.isDeliverable);
  const isValid = ctx.validPincode && unavailableItems.length === 0;

  return {
    isValid,
    assignedVendor: ctx.assignedVendor,
    vendorId: ctx.vendorId,
    vendorName: ctx.vendorName,
    region: ctx.region,
    items: results,
    unavailableItems,
    message: unavailableItems[0]?.errorReason || ctx.errorReason || null,
  };
}

