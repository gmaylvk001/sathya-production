export const AVAILABLE_IN_STORE_HEADING = "Available in Store";

export const UNAVAILABLE_ONLINE_MESSAGE =
  "This product is currently unavailable online. Please contact your nearest store to check availability.";

/**
 * Determine whether a product or variant should be treated as out of stock.
 */
export function isProductOutOfStock(
  product,
  { requireExplicitInStock = false } = {}
) {
  if (!product || typeof product !== "object") return true;
  if (product.inStock === false) return true;

  const rawStatus = String(product.stock_status ?? product.stock ?? "")
    .trim()
    .toLowerCase();

  if (
    rawStatus === "out of stock" ||
    rawStatus === "outofstock" ||
    rawStatus === "out_of_stock"
  ) {
    return true;
  }

  const rawQty =
    product.quantity !== undefined && product.quantity !== null
      ? product.quantity
      : product.stockQuantity !== undefined && product.stockQuantity !== null
        ? product.stockQuantity
        : product.stock_quantity;

  if (rawQty !== undefined && rawQty !== null && rawQty !== "") {
    const numericQty = Number(rawQty);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      return true;
    }
    return false;
  }

  if (requireExplicitInStock) {
    return rawStatus !== "in stock" && rawStatus !== "instock" && rawStatus !== "in_stock";
  }

  return false;
}

/**
 * Check whether a product is active and in stock for Home Page storefront display.
 */
export function isHomeProductInStock(product) {
  if (!product || typeof product !== "object") return false;

  if (
    product.status !== undefined &&
    product.status !== null &&
    String(product.status).trim() !== "" &&
    String(product.status).trim().toLowerCase() !== "active"
  ) {
    return false;
  }

  if (isProductOutOfStock(product)) {
    return false;
  }

  if (
    product.hasVariants === true &&
    Array.isArray(product.variants) &&
    product.variants.length > 0
  ) {
    return product.variants.some((variant) => {
      if (!variant || typeof variant !== "object") return false;
      const vStatus = String(variant.status ?? "Active").trim().toLowerCase();
      if (vStatus && vStatus !== "active") return false;
      return !isProductOutOfStock(variant);
    });
  }

  return true;
}

/**
 * Filter a list of products down to active in-stock items for Home Page rows.
 */
export function filterHomeInStockProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.filter(isHomeProductInStock);
}

const VARIANT_CLASSES = {
  panel: {
    container:
      "w-full rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-left min-w-0",
    row: "flex items-start gap-2.5 min-w-0",
    iconWrap:
      "w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5",
    icon: "w-4 h-4",
    heading: "text-xs sm:text-[13px] font-bold text-gray-900 leading-snug",
    message:
      "mt-0.5 text-[11.5px] sm:text-xs text-gray-700 leading-relaxed break-words",
  },
  compact: {
    container:
      "w-full rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-left min-w-0",
    row: "flex items-start gap-2 min-w-0",
    iconWrap: "text-amber-700 shrink-0 mt-0.5",
    icon: "w-4 h-4",
    heading: "text-[11px] font-bold text-gray-900 leading-tight",
    message: "mt-0.5 text-[10.5px] text-gray-700 leading-snug break-words",
  },
  card: {
    container:
      "w-full rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-left min-w-0",
    row: "flex items-start gap-1.5 min-w-0",
    iconWrap: "text-amber-700 shrink-0 mt-0.5",
    icon: "w-3.5 h-3.5",
    heading: "text-[11px] font-bold text-gray-900 leading-tight",
    message:
      "mt-0.5 text-[10px] sm:text-[10.5px] text-gray-700 leading-snug break-words",
  },
};

export default function AvailableInStoreNotice({
  variant = "panel",
  className = "",
}) {
  const styles = VARIANT_CLASSES[variant] || VARIANT_CLASSES.panel;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.container} ${className}`.trim()}
    >
      <div className={styles.row}>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.icon}
          >
            <path d="M3 9l1-4h16l1 4" />
            <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
            <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
            <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={styles.heading}>{AVAILABLE_IN_STORE_HEADING}</p>
          <p className={styles.message}>{UNAVAILABLE_ONLINE_MESSAGE}</p>
        </div>
      </div>
    </div>
  );
}
