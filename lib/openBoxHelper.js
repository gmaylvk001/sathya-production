/**
 * openBoxHelper.js
 * Isolated helper for detecting EOL / FOCUS low-stock clearance products
 * and managing official clearance purchase contact details.
 */

export const CLEARANCE_PHONE = "9842344323";
export const CLEARANCE_PHONE_DISPLAY = "98423 44323";
export const CLEARANCE_EMAIL = "customercare@sathya.store";

export const CLEARANCE_CONTACT = {
  phone: CLEARANCE_PHONE,
  phoneDisplay: CLEARANCE_PHONE_DISPLAY,
  email: CLEARANCE_EMAIL,
};

/**
 * Checks if a product qualifies as an Open Box / Clearance item.
 * Criteria: movement is EOL or FOCUS, and available quantity is <= 10.
 *
 * @param {Object} [product] - Product object with movement and quantity fields
 * @param {string} [movementOverride] - Optional movement string override
 * @param {number} [quantityOverride] - Optional quantity number override
 * @returns {boolean}
 */
export function isOpenBoxEligible(product, movementOverride, quantityOverride) {
  if (!product && movementOverride === undefined) return false;

  const movement = String(movementOverride ?? product?.movement ?? "")
    .trim()
    .toUpperCase();
  const rawQty =
    quantityOverride !== undefined
      ? quantityOverride
      : (product?.quantity ?? product?.stockQuantity ?? 0);
  const qty = Number(rawQty) || 0;

  const isEolOrFocus = movement === "EOL" || movement === "FOCUS";
  return isEolOrFocus && qty <= 10 && qty > 0;
}

export default isOpenBoxEligible;
