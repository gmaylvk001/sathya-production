/**
 * Standard product filter rules for storefront queries.
 *
 * Excludes promotional/freebie "Gift" products (movement contains "gift", case-insensitive)
 * and ensures only active products are returned to customer-facing views.
 */

// MongoDB filter chunk to exclude gift movement while preserving normal/null/empty movement values
export const NON_GIFT_MOVEMENT_FILTER = {
  movement: { $not: /gift/i },
};

// Full active storefront product filter
export const STOREFRONT_PRODUCT_FILTER = {
  status: "Active",
  movement: { $not: /gift/i },
};

/**
 * Returns true if the product has a movement indicating a gift/promotional item.
 * @param {Object} product
 * @returns {boolean}
 */
export function isGiftProduct(product) {
  if (!product || !product.movement) return false;
  return /gift/i.test(String(product.movement).trim());
}

/**
 * Returns true if the product is displayable on storefront (not a gift item).
 * @param {Object} product
 * @returns {boolean}
 */
export function isStorefrontDisplayable(product) {
  return !isGiftProduct(product);
}
