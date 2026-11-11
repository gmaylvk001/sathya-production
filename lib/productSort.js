/**
 * Helper utilities for ordering products:
 * 1. In-stock products always appear first.
 * 2. In default / featured view, latest added products (createdAt: -1) appear first.
 * 3. Out-of-stock products appear at the end (after in-stock), also ordered newest first.
 */

export function isProductInStock(product) {
  if (!product) return false;
  const status = String(product.stock_status || "").trim().toLowerCase();
  const qty = Number(product.quantity);
  if (status === "out of stock") return false;
  if (!isNaN(qty) && qty <= 0) return false;
  return status === "in stock" || status === "instock";
}

export function getProductSortObject(sort = "featured") {
  switch (sort) {
    case "price-low-high":
      return { stock_status: 1, price: 1, _id: -1 };
    case "price-high-low":
      return { stock_status: 1, price: -1, _id: -1 };
    case "name-a-z":
      return { stock_status: 1, name: 1, _id: -1 };
    case "name-z-a":
      return { stock_status: 1, name: -1, _id: -1 };
    case "quantity-low-to-high":
      return { stock_status: 1, quantity: 1, _id: -1 };
    case "quantity-high-to-low":
      return { stock_status: 1, quantity: -1, _id: -1 };
    case "featured":
    default:
      return { stock_status: 1, createdAt: -1, _id: -1 };
  }
}

export function getProductAggregateSort(sort = "featured") {
  if (sort === "price-low-high") {
    return { stock_status: 1, effective_price: 1, _id: -1 };
  }
  if (sort === "price-high-low") {
    return { stock_status: 1, effective_price: -1, _id: -1 };
  }
  return getProductSortObject(sort);
}

export function sortProductsClient(products = [], sortOption = "") {
  if (!Array.isArray(products)) return [];
  const sorted = [...products];

  const stockScore = (p) => (isProductInStock(p) ? 1 : 0);

  return sorted.sort((a, b) => {
    // Priority 1: In-stock (1) before Out-of-stock (0)
    const stockDiff = stockScore(b) - stockScore(a);
    if (stockDiff !== 0) return stockDiff;

    // Priority 2: Selected sort option or default latest added
    const priceA =
      Number(a?.special_price > 0 ? a.special_price : a?.price) || 0;
    const priceB =
      Number(b?.special_price > 0 ? b.special_price : b?.price) || 0;

    switch (sortOption) {
      case "price-low-high":
        return priceA - priceB;
      case "price-high-low":
        return priceB - priceA;
      case "name-a-z":
        return String(a?.name || "").localeCompare(String(b?.name || ""));
      case "name-z-a":
        return String(b?.name || "").localeCompare(String(a?.name || ""));
      case "quantity-low-to-high":
        return (Number(a?.quantity) || 0) - (Number(b?.quantity) || 0);
      case "quantity-high-to-low":
        return (Number(b?.quantity) || 0) - (Number(a?.quantity) || 0);
      default: {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return String(b?._id || "").localeCompare(String(a?._id || ""));
      }
    }
  });
}
