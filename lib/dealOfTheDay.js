import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";

const PRODUCT_SELECT =
  "name slug images price special_price model_number item_code stock_status quantity brand movement star status display_stock lsp vendor";

export function computeSavings(mrp, deal) {
  const m = Number(mrp) || 0;
  const d = Number(deal) || 0;
  if (m <= 0 || d <= 0 || d >= m) {
    return { saveAmount: 0, savePercent: 0 };
  }
  const saveAmount = Math.round(m - d);
  const savePercent = Math.round(((m - d) / m) * 100);
  return { saveAmount, savePercent };
}

export function normalizeHighlightSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .slice(0, 6)
    .map((s) => ({
      label: String(s?.label || "").trim(),
      value: String(s?.value || "").trim(),
    }))
    .filter((s) => s.label || s.value);
}

export function isDealLive(doc, now = new Date()) {
  if (!doc) return false;
  if (String(doc.status || "").toLowerCase() === "inactive") return false;
  if (!doc.productId) return false;
  if (!doc.startAt || !doc.endAt) return false;
  const start = new Date(doc.startAt).getTime();
  const end = new Date(doc.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return false;
  const t = now.getTime();
  return t >= start && t <= end;
}

export async function enrichDealProduct(dealDoc) {
  if (!dealDoc?.productId) return null;

  const product = await Product.findById(dealDoc.productId)
    .select(PRODUCT_SELECT)
    .lean();
  if (!product) return null;
  if (String(product.status || "").toLowerCase() === "inactive") return null;

  let brandName = "";
  if (product.brand) {
    const brand = await Brand.findOne({
      $or: [
        { _id: product.brand },
        { brand_code: product.brand },
        { brand_name: product.brand },
      ],
    })
      .select("brand_name")
      .lean()
      .catch(() => null);
    brandName = brand?.brand_name || String(product.brand);
  }

  const mrp =
    dealDoc.mrpPrice != null && dealDoc.mrpPrice > 0
      ? Number(dealDoc.mrpPrice)
      : Number(product.price) || 0;
  const dealPrice =
    dealDoc.dealPrice != null && dealDoc.dealPrice > 0
      ? Number(dealDoc.dealPrice)
      : product.special_price > 0
        ? Number(product.special_price)
        : mrp;

  const { saveAmount, savePercent } = computeSavings(mrp, dealPrice);
  const qty =
    dealDoc.scarcityQtyOverride != null && dealDoc.scarcityQtyOverride >= 0
      ? Number(dealDoc.scarcityQtyOverride)
      : Number(product.quantity) || 0;

  const images = Array.isArray(product.images) ? product.images : [];

  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    item_code: product.item_code,
    model_number: product.model_number,
    brand: brandName,
    status: product.status || "",
    images,
    image: images[0] || "",
    stock_status: product.stock_status,
    quantity: Number(product.quantity) || 0,
    display_stock: product.display_stock || "",
    star: product.star || 0,
    movement: product.movement || "",
    special_price: Number(product.special_price) || 0,
    price: Number(product.price) || 0,
    lsp: Number(product.lsp) || 0,
    vendor: product.vendor || "",
    mrp,
    dealPrice,
    saveAmount,
    savePercent,
    scarcityQty: qty,
  };
}

export function buildStorefrontDealConfig(doc, product, now = new Date()) {
  if (!doc || !product) return null;
  return {
    eyebrow: doc.eyebrow || "DEAL OF THE DAY",
    badgeLabel: doc.badgeLabel || "Spotlight 24H",
    bannerSubtitle: doc.bannerSubtitle || "",
    tagline: doc.tagline || "",
    scarcityLabel: doc.scarcityLabel || "High Demand",
    showScarcity: doc.showScarcity !== false,
    show360Button: Boolean(doc.show360Button),
    studioViewLabel: doc.studioViewLabel || "360° Studio View",
    highlightSpecs: Array.isArray(doc.highlightSpecs) ? doc.highlightSpecs : [],
    deliveryHint: doc.deliveryHint || "",
    emiHint: doc.emiHint || "",
    primaryCtaLabel: doc.primaryCtaLabel || "Buy Now with Express Delivery",
    secondaryCtaLabel: doc.secondaryCtaLabel || "Add to Bag",
    startAt: doc.startAt,
    endAt: doc.endAt,
    serverNow: now.toISOString(),
    product,
  };
}
