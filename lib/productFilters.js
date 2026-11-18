/**
 * Standard product filter rules for storefront queries.
 *
 * Excludes promotional/freebie "Gift" products (product_type == "gift" or movement contains "gift", case-insensitive)
 * and ensures only active products are returned to customer-facing views.
 */

// MongoDB filter chunk to exclude gift movement and product_type while preserving normal/null/empty values
export const NON_GIFT_MOVEMENT_FILTER = {
  movement: { $not: /gift/i },
  product_type: { $nin: ["gift", "Gift", "GIFT"] },
};

// Full active storefront product filter
export const STOREFRONT_PRODUCT_FILTER = {
  status: "Active",
  movement: { $not: /gift/i },
  product_type: { $nin: ["gift", "Gift", "GIFT"] },
};

/**
 * Returns true if the product has a product_type or movement indicating a gift/promotional item.
 * @param {Object} product
 * @returns {boolean}
 */
export function isGiftProduct(product) {
  if (!product) return false;
  const rawType = String(
    product.product_type || product.rawProduct?.product_type || ""
  ).trim().toLowerCase();
  if (rawType === "gift") return true;
  if (product.movement && /gift/i.test(String(product.movement).trim())) return true;
  return false;
}

/**
 * Returns true if the product is displayable on storefront (not a gift item).
 * @param {Object} product
 * @returns {boolean}
 */
export function isStorefrontDisplayable(product) {
  return !isGiftProduct(product);
}
