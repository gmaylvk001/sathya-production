/**
 * Modular Regional Delivery & Warehouse Isolation Helpers
 * Handles strict regional boundary mapping between Sathya (Tamil Nadu) and Unilet (Karnataka)
 */

import { normalizeRegion } from "./regionHelper.js";

export const UNILET_RESTRICTION_MESSAGE =
  "UNILETEC products are only deliverable within Karnataka. Please change delivery address or remove item.";

/**
 * Checks if a 6-digit Indian postal code falls within the Karnataka postal range:
 * Range: 560001 to 599999 (prefixes 56, 57, 58, 59)
 */
export const isKarnatakaPincode = (pincode) => {
  if (!pincode) return false;
  const clean = pincode.toString().replace(/\D/g, "").trim();
  if (clean.length < 2) return false;

  const prefix2 = clean.substring(0, 2);
  const p2 = parseInt(prefix2, 10);
  if (p2 >= 56 && p2 <= 59) {
    if (clean.length >= 6) {
      const fullPin = parseInt(clean.substring(0, 6), 10);
      return fullPin >= 560001 && fullPin <= 599999;
    }
    return true;
  }
  return false;
};

/**
 * Identifies whether a product is a Unilet Karnataka-exclusive item
 */
export const isUniletProduct = (product) => {
  if (!product) return false;
  const itemCode = String(
    product.item_code ||
    product.itemCode ||
    product.product_item_code ||
    product.vendor_item_code ||
    ""
  ).trim().toUpperCase();

  const sku = String(product.sku || "").trim().toUpperCase();
  const vendor = String(
    product.vendor ||
    product.store_owner ||
    product.owner_id ||
    ""
  ).trim().toLowerCase();

  const slug = String(product.slug || "").trim().toLowerCase();
  const name = String(product.name || product.title || "").trim().toLowerCase();

  return (
    itemCode.startsWith("UNILET") ||
    sku.startsWith("UNILET") ||
    vendor === "unilet" ||
    product.isUnilet === true ||
    slug.includes("-uniletec") ||
    slug.endsWith("-unilet") ||
    slug.includes("unilet") ||
    name.includes("unilet exclusive")
  );
};

/**
 * Validates if a product can be delivered to the specified pincode / state.
 * - Unilet exclusive items: Strictly deliverable ONLY within Karnataka (560000 - 599999).
 * - Standard Sathya products: Follow normal multi-channel / Sathya network delivery.
 */
export const isProductDeliverableToPincode = (product, pincode, userState = null) => {
  if (!isUniletProduct(product)) {
    // Normal Sathya product flow is not restricted by Karnataka-only isolation
    return true;
  }

  // Unilet exclusive products: strictly Karnataka
  const isPinKarnataka = isKarnatakaPincode(pincode);
  const isStateKarnataka =
    userState &&
    (
      /karnataka/i.test(String(userState)) ||
      normalizeRegion(String(userState)) === "karnataka"
    );

  return Boolean(isPinKarnataka || isStateKarnataka);
};

/**
 * Resolves the designated warehouse and inventory fulfillment source by region and vendor.
 * Ensures Unilet Karnataka warehouse is strictly isolated from Sathya Tamil Nadu default warehouse.
 */
export const getWarehouseByRegion = (pincode, vendor = null) => {
  const isKarnataka = isKarnatakaPincode(pincode);
  const vendorKey = String(vendor || "").trim().toLowerCase();

  if (vendorKey === "unilet" || isKarnataka) {
    return {
      warehouseId: "unilet",
      region: "karnataka",
      isUnilet: true,
      name: "Unilet Karnataka Warehouse",
    };
  }

  return {
    warehouseId: "sathya_default",
    region: "tamilnadu",
    isUnilet: false,
    name: "Sathya Tamil Nadu Warehouse",
  };
};
