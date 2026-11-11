/**
 * lib/paymentOffersHelper.js
 * Helpers for PaymentOffers collapse/expand state and accessibility attributes.
 */

/**
 * Returns WAI-ARIA and accessible attributes for the Payment Offers accordion toggle.
 * @param {boolean} isExpanded
 * @returns {Object}
 */
export function getPaymentOffersAriaAttributes(isExpanded) {
  const expanded = Boolean(isExpanded);
  return {
    role: "button",
    tabIndex: 0,
    "aria-expanded": expanded,
    "aria-controls": "payment-offers-collapsible-content",
    "aria-label": expanded ? "Collapse Payment Offers" : "Expand Payment Offers",
    title: expanded ? "Collapse Payment Offers" : "Expand Payment Offers",
  };
}

/**
 * Helper to determine chevron arrow CSS transform based on collapse state.
 * @param {boolean} isExpanded
 * @returns {string}
 */
export function getPaymentOffersChevronClass(isExpanded) {
  return isExpanded ? "" : "rotate-180";
}

/**
 * Helper to determine header margin based on collapse state.
 * @param {boolean} isExpanded
 * @returns {string}
 */
export function getPaymentOffersHeaderMarginClass(isExpanded) {
  return isExpanded ? "mb-4" : "mb-0";
}

/**
 * Strict minimum price threshold for EMI eligibility.
 */
export const MIN_EMI_PRICE = 2500;

/**
 * Evaluates whether EMI options can be shown for this product price and offer list.
 * @param {number} price
 * @param {Array} rawEmiOffers
 * @returns {boolean}
 */
export function isEmiEligible(price, rawEmiOffers = []) {
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < MIN_EMI_PRICE) {
    return false;
  }
  if (!Array.isArray(rawEmiOffers) || rawEmiOffers.length === 0) {
    return false;
  }
  return rawEmiOffers.some(
    (offer) =>
      offer &&
      typeof offer === "object" &&
      Number(offer.monthlyEmi) > 0 &&
      Number(offer.tenureMonths || 0) > 0
  );
}

/**
 * Filters and sorts eligible bank offers for a given price.
 * Excludes inactive, expired, below minOrderValue, zero discount, or non-discounting offers.
 * Sorts highest savings / isBestOffer first.
 * @param {number} price
 * @param {Array} rawBankOffers
 * @returns {Array}
 */
export function filterEligibleBankOffers(price, rawBankOffers = []) {
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0 || !Array.isArray(rawBankOffers)) {
    return [];
  }

  const now = new Date();
  const valid = rawBankOffers.filter((offer) => {
    if (!offer || typeof offer !== "object") return false;
    if (offer.isActive === false) return false;
    if (offer.validTill && new Date(offer.validTill) < now) return false;
    if (numPrice < (Number(offer.minOrderValue) || 0)) return false;
    const discount = Number(offer.calculatedDiscount) || 0;
    if (discount <= 0) return false;
    const effPrice = Number(offer.effectivePrice) || numPrice;
    if (effPrice >= numPrice) return false;
    return true;
  });

  valid.sort((a, b) => {
    if (a.isBestOffer && !b.isBestOffer) return -1;
    if (!a.isBestOffer && b.isBestOffer) return 1;
    return (Number(b.calculatedDiscount) || 0) - (Number(a.calculatedDiscount) || 0);
  });

  return valid;
}

/**
 * Checks whether any payment offers (EMI or Bank) are eligible for display.
 * @param {number} price
 * @param {Object|null} offersData
 * @returns {boolean}
 */
export function hasEligiblePaymentOffers(price, offersData = null) {
  if (!offersData || typeof offersData !== "object") {
    return false;
  }
  const emiOk = isEmiEligible(price, offersData.emiOffers);
  const bankOffers = filterEligibleBankOffers(price, offersData.bankOffers);
  return emiOk || bankOffers.length > 0;
}

/**
 * Calculates best effective price and max discount for top banner.
 * @param {number} price
 * @param {Array} validBankOffers
 * @returns {{ bestPrice: number, maxDiscount: number }}
 */
export function calculatePaymentOffersBestPrice(price, validBankOffers = []) {
  const numPrice = Math.max(0, Number(price) || 0);
  if (!Array.isArray(validBankOffers) || validBankOffers.length === 0) {
    return { bestPrice: numPrice, maxDiscount: 0 };
  }
  const maxDiscount = Math.max(
    0,
    ...validBankOffers.map((o) => Number(o.calculatedDiscount) || 0)
  );
  const bestPrice = Math.max(0, numPrice - maxDiscount);
  return { bestPrice, maxDiscount };
}
