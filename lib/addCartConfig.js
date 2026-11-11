// Movement types allowed for online cart checkout.
// Offline/Retail store-only items (e.g. NON ROL, EOL without clearance) are "Sold Out Online" and "Available in Store".
export const ADD_CART_ALLOWED_MOVEMENTS = [
  "FAST",
  "FOCUS",
  "SPL FOCUS",
  "Fast",
  "Focus",
  "Spl Focus",
  "Fast-CE",
  "Fast-EXL",
  "Fast-LGP",
  "Fast-EXLAP",
  "Fast-EXLKL",
  "Open",
  "Open-Box",
  "Open-LGP",
  "EXSTK",
  "CUS-Order",
  "CUS-ORDER",
];

const ALLOWED_SET = new Set(
  ADD_CART_ALLOWED_MOVEMENTS.map((m) => m.trim().toUpperCase())
);

/**
 * Validates whether a product movement type is allowed for online e-commerce cart & checkout.
 * Products with movements outside this whitelist (e.g. 'NON ROL') are physical retail store stock only.
 *
 * @param {string} [movement] - Raw movement value from DB / ERP
 * @returns {boolean}
 */
export function isMovementAllowed(movement) {
  if (!movement) return false;
  const upper = String(movement).trim().toUpperCase();
  if (ALLOWED_SET.has(upper)) return true;
  if (upper.startsWith("FAST")) return true;
  return false;
}

