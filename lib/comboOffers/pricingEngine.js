/**
 * Pricing Engine — original / discount / offer / savings
 */

export function getUnitPrice(product) {
  const special = Number(product?.special_price) || 0;
  const price = Number(product?.price) || 0;
  if (special > 0 && special < price) return special;
  return price > 0 ? price : special;
}

export function calculateComboPricing(products = [], discountPercent = 0) {
  const originalPrice = (products || []).reduce(
    (sum, p) => sum + getUnitPrice(p),
    0
  );
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const savingsAmount = Math.round((originalPrice * pct) / 100);
  const offerPrice = Math.max(0, Math.round(originalPrice - savingsAmount));

  return {
    originalPrice: Math.round(originalPrice),
    discountPercent: pct,
    offerPrice,
    savingsAmount,
  };
}
