/**
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} bankName
 * @property {"PERCENT" | "FLAT"} type
 * @property {number} value
 * @property {number} [maxDiscount]
 * @property {number} [minOrderValue]
 * @property {string[]} [applicableCategories]
 * @property {string[]} [applicableProductIds]
 * @property {string} [validFrom]
 * @property {string} [validTill]
 * @property {"CREDIT_CARD" | "DEBIT_CARD" | "EMI" | "UPI"} [paymentMethod]
 */

/**
 * @typedef {Object} BestPriceResult
 * @property {number} effectivePrice
 * @property {number} discountAmount
 * @property {Offer | null} appliedOffer
 * @property {boolean} hasOffer
 */

/**
 * Calculates the best applicable offer for a given product price and list of offers.
 * 
 * @param {Object} product
 * @param {number} product.price
 * @param {string} [product.id]
 * @param {string[]} [product.categories]
 * @param {Offer[]} offers 
 * @returns {BestPriceResult}
 */
export function calculateBestPrice(product, offers = []) {
  if (!product || typeof product.price !== 'number' || product.price <= 0 || !Array.isArray(offers) || offers.length === 0) {
    return {
      effectivePrice: product?.price || 0,
      discountAmount: 0,
      appliedOffer: null,
      hasOffer: false,
    };
  }

  const { price, id: productId, categories: productCategories = [] } = product;
  const now = new Date();
  
  let bestDiscount = 0;
  let bestOffer = null;

  for (const offer of offers) {
    // Check Date Validity
    if (offer.validFrom && new Date(offer.validFrom) > now) continue;
    if (offer.validTill && new Date(offer.validTill) < now) continue;

    // Check Min Order Value
    if (offer.minOrderValue && price < offer.minOrderValue) continue;

    // Check Product ID applicability
    if (offer.applicableProductIds && offer.applicableProductIds.length > 0) {
      if (!productId || !offer.applicableProductIds.includes(productId)) continue;
    }

    // Check Category applicability
    if (offer.applicableCategories && offer.applicableCategories.length > 0) {
      const hasMatchingCategory = productCategories.some(cat => offer.applicableCategories.includes(cat));
      if (!hasMatchingCategory) continue;
    }

    // Calculate Discount
    let currentDiscount = 0;
    if (offer.type === "PERCENT") {
      currentDiscount = (price * offer.value) / 100;
      if (offer.maxDiscount) {
        currentDiscount = Math.min(currentDiscount, offer.maxDiscount);
      }
    } else if (offer.type === "FLAT") {
      currentDiscount = offer.value;
    }

    // Cap discount to price itself
    currentDiscount = Math.min(currentDiscount, price);
    currentDiscount = Math.round(currentDiscount); // integer safe math

    if (currentDiscount > bestDiscount) {
      bestDiscount = currentDiscount;
      bestOffer = offer;
    }
  }

  const effectivePrice = price - bestDiscount;

  return {
    effectivePrice,
    discountAmount: bestDiscount,
    appliedOffer: bestOffer,
    hasOffer: bestDiscount > 0,
  };
}
