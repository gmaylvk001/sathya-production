export const MIN_DISCOUNT_PERCENT = 1;

/**
 * Calculates the discount percentage and determines whether the discount badge
 * and strikethrough MRP should be displayed.
 *
 * @param {number|string} mrp - Maximum Retail Price (original/catalog price)
 * @param {number|string} price - Selling / special price
 * @returns {{ discountPercent: number, showDiscount: boolean }}
 */
export function getDiscountInfo(mrp, price) {
  const numMrp = Number(mrp);
  const numPrice = Number(price);

  if (
    isNaN(numMrp) ||
    isNaN(numPrice) ||
    numMrp <= 0 ||
    numPrice <= 0 ||
    numPrice >= numMrp
  ) {
    return {
      discountPercent: 0,
      showDiscount: false,
    };
  }

  const rawPercent = ((numMrp - numPrice) / numMrp) * 100;
  const discountPercent = Math.max(0, Math.round(rawPercent));
  const showDiscount = discountPercent >= MIN_DISCOUNT_PERCENT;

  return {
    discountPercent: showDiscount ? discountPercent : 0,
    showDiscount,
  };
}

export default getDiscountInfo;
