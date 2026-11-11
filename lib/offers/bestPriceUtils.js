import { resolveOffersForProduct, getSellingPrice } from "../offerCalculator.js";

export function getBestPriceData(product) {
  if (!product) return null;
  const sellingPrice = getSellingPrice(
    product.special_price > 0 ? product.special_price : (product.currentPrice || product.price || 0)
  );
  if (!sellingPrice || sellingPrice <= 0) return null;

  const result = resolveOffersForProduct(sellingPrice);
  if (result && result.bestPrice && result.bestPrice < sellingPrice) {
    return {
      bestPrice: result.bestPrice,
      basePrice: result.basePrice || sellingPrice,
      bankOffers: result.bankOffers || [],
    };
  }
  return null;
}

export function getBestPrice(product) {
  const data = getBestPriceData(product);
  return data ? data.bestPrice : null;
}


