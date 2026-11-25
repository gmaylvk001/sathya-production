/**
 * Category page component registry (admin gallery + storefront).
 *
 * Rules:
 * - Top Banner: allowMultiple=false → one per category page.
 *   Multiple images inside it = carousel only.
 * - Image Carousel (and future): allowMultiple=true → same type can be added
 *   many times (different names/products). Each instance on Drag & Drop Order.
 */

export const PAGE_TYPES = {
  CATEGORY: "category",
  SUB_CATEGORY: "sub_category",
  CHILD_CATEGORY: "child_category",
  BRAND: "brand",
  CATEGORY_BRAND: "category_brand",
};

export const PAGE_TYPE_LABELS = {
  [PAGE_TYPES.CATEGORY]: "Category",
  [PAGE_TYPES.SUB_CATEGORY]: "Sub Category",
  [PAGE_TYPES.CHILD_CATEGORY]: "Child Category",
  [PAGE_TYPES.BRAND]: "Brand",
  [PAGE_TYPES.CATEGORY_BRAND]: "Category + Brand",
};

export const COMPONENT_TYPES = {
  TOP_BANNER: "top_banner",
  IMAGE_CAROUSEL: "image_carousel",
  PRODUCT_CAROUSEL: "product_carousel",
  BANNER_SIDE_PRODUCTS: "banner_side_products",
  BANNER_FOUR_PRODUCTS: "banner_four_products",
  BANNER_GRID: "banner_grid",
  IMAGE_COLUMNS: "image_columns",
  SINGLE_BANNER_PRODUCTS: "single_banner_products",
  BRAND_CAROUSEL: "brand_carousel",
  IMAGE_HOTSPOT_BANNER: "image_hotspot_banner",
  CATEGORY_CONTENT: "category_content",
  SPLIT_BANNER: "split_banner",
  CIRCLE_IMAGE_CAROUSEL: "circle_image_carousel",
  SUPER_CATEGORIES: "super_categories",
  WHY_BUY_REASONS: "why_buy_reasons",
  TRENDING_VIDEOS: "trending_videos",
  DEAL_OF_THE_DAY: "deal_of_the_day",
  HERO_GRID_BIG_LEFT: "hero_grid_big_left",
  HERO_GRID_BIG_RIGHT: "hero_grid_big_right",
};

/** Shared accept list for Home / Category / Brand settings image inputs. */
export const CATEGORY_PAGE_IMAGE_ACCEPT =
  "image/webp,image/avif,.webp,.avif";

export const CATEGORY_PAGE_IMAGE_ACCEPT_HINT =
  "Upload only webp or avif format image";

const ALLOWED_PAGE_BUILDER_IMAGE_MIMES = new Set([
  "image/avif",
  "image/webp",
]);
const ALLOWED_PAGE_BUILDER_IMAGE_EXTS = new Set([
  "avif",
  "webp",
]);

function pageBuilderImageExt(file) {
  const name = String(file?.name || "");
  if (name.includes(".")) {
    return name.split(".").pop().toLowerCase().trim();
  }
  const mime = String(file?.type || "").toLowerCase().trim();
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "";
}

export function isAllowedCategoryPageImage(file) {
  if (!file || typeof file !== "object") return false;
  const mime = String(file.type || "").toLowerCase().trim();
  const ext = pageBuilderImageExt(file);
  // Strict requirement: extension must be webp or avif
  if (!ALLOWED_PAGE_BUILDER_IMAGE_EXTS.has(ext)) return false;
  // If browser provides MIME type, it must be image/webp or image/avif
  if (mime && mime !== "application/octet-stream" && !ALLOWED_PAGE_BUILDER_IMAGE_MIMES.has(mime)) {
    return false;
  }
  return true;
}

export function getCategoryPageImageError(file) {
  if (!file) return "";
  if (isAllowedCategoryPageImage(file)) return "";
  return "Upload only webp and avif format image";
}

export function consumeAllowedCategoryPageImage(file, inputEl) {
  if (!file) return { file: null, error: "" };
  const error = getCategoryPageImageError(file);
  if (error) {
    if (inputEl) {
      try {
        inputEl.value = "";
      } catch (e) { }
    }
    if (typeof window !== "undefined") {
      import("react-toastify")
        .then(({ toast }) => {
          toast.error(error);
        })
        .catch(() => { });
    }
    return { file: null, error };
  }
  return { file, error: "" };
}

export function assertAllowedCategoryPageImage(file) {
  if (!file) throw new Error("Invalid image file");
  const error = getCategoryPageImageError(file);
  if (error) throw new Error(error);
}

export const componentRegistry = {
  [COMPONENT_TYPES.TOP_BANNER]: {
    type: COMPONENT_TYPES.TOP_BANNER,
    label: "Top Banner",
    description:
      "One Top Banner per category page. Multiple images = left–right carousel only (not multiple Top Banner blocks).",
    icon: "mdi:image-area",
    enabled: true,
    allowMultiple: false,
    preview: "/uploads/category-page-previews/top-banner.png",
  },
  [COMPONENT_TYPES.IMAGE_CAROUSEL]: {
    type: COMPONENT_TYPES.IMAGE_CAROUSEL,
    label: "Image Carousel",
    description:
      "Select to open this component. Lists existing sets; ADD NEW creates another (many images + URLs per set).",
    icon: "mdi:view-carousel",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/image-carousel.png",
  },
  [COMPONENT_TYPES.PRODUCT_CAROUSEL]: {
    type: COMPONENT_TYPES.PRODUCT_CAROUSEL,
    label: "Product Carousel",
    description:
      "Named product row (like Best Selling). Search & add products from this category only.",
    icon: "mdi:shopping",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/product-carousel.png",
  },
  [COMPONENT_TYPES.BANNER_SIDE_PRODUCTS]: {
    type: COMPONENT_TYPES.BANNER_SIDE_PRODUCTS,
    label: "Banner + Side + Products",
    description:
      "Main banner with URL, side image (left or right), product search row. See All uses main banner URL.",
    icon: "mdi:view-split-vertical",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/banner-side-products.png",
  },
  [COMPONENT_TYPES.BANNER_FOUR_PRODUCTS]: {
    type: COMPONENT_TYPES.BANNER_FOUR_PRODUCTS,
    label: "Banner + 3/4 Images + Products",
    description:
      "Top banner with URL, 3 or 4 tiles (image + URL + shared BG color), then related products. See All uses banner URL.",
    icon: "mdi:view-grid",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/banner-four-products.png",
  },
  [COMPONENT_TYPES.BANNER_GRID]: {
    type: COMPONENT_TYPES.BANNER_GRID,
    label: "Banner Grid (2–4) + Products",
    description:
      "Add 2, 3, or 4 equal-size linked banners. An optional product row can be added with a name and at least 6 products.",
    icon: "mdi:view-grid-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/banner-grid.png",
  },
  [COMPONENT_TYPES.IMAGE_COLUMNS]: {
    type: COMPONENT_TYPES.IMAGE_COLUMNS,
    label: "Image Columns (3 Layouts)",
    description:
      "Five-image mosaic: center big, left big, or right big. Optional URL per image.",
    icon: "mdi:view-column",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/image-columns.png",
  },
  [COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS]: {
    type: COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS,
    label: "Single Banner + Products",
    description:
      "One promotional banner with URL, then a product row (min 6). See All uses the same banner URL.",
    icon: "mdi:image-text",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/single-banner-products.png",
  },
  [COMPONENT_TYPES.BRAND_CAROUSEL]: {
    type: COMPONENT_TYPES.BRAND_CAROUSEL,
    label: "Brand Carousel",
    description:
      "Brand logo carousel — add images + URLs. Auto-scrolls on storefront like Image Carousel.",
    icon: "mdi:storefront-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/brand-carousel.png",
  },
  [COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER]: {
    type: COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER,
    label: "Image Hotspot Banner",
    description:
      "Upload one banner and draw unlimited clickable hotspot regions (links). Coordinates are %-based and responsive.",
    icon: "mdi:image-filter-center-focus",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/image-hotspot-banner.png",
  },
  [COMPONENT_TYPES.CATEGORY_CONTENT]: {
    type: COMPONENT_TYPES.CATEGORY_CONTENT,
    label: "Category Content",
    description:
      "Write category content in one text field. Shown on the category page with a white background.",
    icon: "mdi:text-box-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/category-content.png",
  },
  [COMPONENT_TYPES.SPLIT_BANNER]: {
    type: COMPONENT_TYPES.SPLIT_BANNER,
    label: "Single / Double Banner",
    description:
      "Choose 1 banner (full width) or 2 banners (left + right). Each banner has an image and optional URL. No title needed.",
    icon: "mdi:image-multiple-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/split-banner.gif",
  },
  [COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL]: {
    type: COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL,
    label: "Category Cards Carousel",
    description:
      "Category cards carousel (Best Price In the Market) with category name, dynamic starting prices, brands, and arrow link.",
    icon: "mdi:view-carousel-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/circle-image-carousel.png",
  },
  [COMPONENT_TYPES.SUPER_CATEGORIES]: {
    type: COMPONENT_TYPES.SUPER_CATEGORIES,
    label: "Super Categories Matrix",
    description:
      "Explore Super-Categories (Department Matrix) with offer badges, category titles, subtitle tags, and View All link.",
    icon: "mdi:grid-large",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/super-categories.png",
  },
  [COMPONENT_TYPES.WHY_BUY_REASONS]: {
    type: COMPONENT_TYPES.WHY_BUY_REASONS,
    label: "Why Buy From Sathya",
    description:
      "Omnichannel Advantage section with 6–8 feature cards, circular icons, descriptions, and highlight tags.",
    icon: "mdi:shield-star-outline",
    enabled: true,
    allowMultiple: true,
    preview: "/uploads/category-page-previews/why-buy-reasons.png",
  },
  [COMPONENT_TYPES.TRENDING_VIDEOS]: {
    type: COMPONENT_TYPES.TRENDING_VIDEOS,
    label: "Instagram Feed Carousel",
    description:
      "Showcase trending Instagram reels & posts in a smooth carousel on the home page.",
    icon: "mdi:instagram",
    enabled: true,
    allowMultiple: false,
    scope: "home",
    preview: "/uploads/category-page-previews/trending-insta-reel.png",
  },
  [COMPONENT_TYPES.DEAL_OF_THE_DAY]: {
    type: COMPONENT_TYPES.DEAL_OF_THE_DAY,
    label: "Deal of the Day",
    description:
      "Spotlight product with countdown, savings badge, and Buy Now / Add to Bag. Schedule start & end; only live deals show on the storefront.",
    icon: "mdi:timer-flash-outline",
    enabled: true,
    allowMultiple: true,
    scope: "home",
    preview: "/uploads/category-page-previews/product-carousel.png",
  },
  [COMPONENT_TYPES.HERO_GRID_BIG_LEFT]: {
    type: COMPONENT_TYPES.HERO_GRID_BIG_LEFT,
    label: "Hero Grid - Big Left",
    description:
      "3-banner layout: 1 Large Hero Banner left (optional heading, description & button) + 2 Small Banners stacked right.",
    icon: "mdi:view-dashboard-variant-outline",
    enabled: false,
    allowMultiple: true,
    scope: "home",
    hideInSidebar: true,
    preview:
      "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 120'%3E%3Crect width='320' height='120' fill='%23f8fafc'/%3E%3Crect x='10' y='10' width='196' height='100' rx='8' fill='%231e293b'/%3E%3Crect x='22' y='62' width='110' height='10' rx='3' fill='%23ffffff'/%3E%3Crect x='22' y='77' width='80' height='6' rx='2' fill='%23cbd5e1'/%3E%3Crect x='22' y='88' width='48' height='12' rx='4' fill='%23ED1C24'/%3E%3Crect x='214' y='10' width='96' height='46' rx='7' fill='%23e2e8f0'/%3E%3Crect x='214' y='64' width='96' height='46' rx='7' fill='%23e2e8f0'/%3E%3C/svg%3E",
  },
  [COMPONENT_TYPES.HERO_GRID_BIG_RIGHT]: {
    type: COMPONENT_TYPES.HERO_GRID_BIG_RIGHT,
    label: "Hero Grid - Big Right",
    description:
      "3-banner layout: 2 Small Banners stacked left + 1 Large Hero Banner right (optional heading, description & button).",
    icon: "mdi:view-dashboard-variant-outline",
    enabled: false,
    allowMultiple: true,
    scope: "home",
    hideInSidebar: true,
    preview:
      "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 120'%3E%3Crect width='320' height='120' fill='%23f8fafc'/%3E%3Crect x='10' y='10' width='96' height='46' rx='7' fill='%23e2e8f0'/%3E%3Crect x='10' y='64' width='96' height='46' rx='7' fill='%23e2e8f0'/%3E%3Crect x='114' y='10' width='196' height='100' rx='8' fill='%231e293b'/%3E%3Crect x='126' y='62' width='110' height='10' rx='3' fill='%23ffffff'/%3E%3Crect x='126' y='77' width='80' height='6' rx='2' fill='%23cbd5e1'/%3E%3Crect x='126' y='88' width='48' height='12' rx='4' fill='%23ED1C24'/%3E%3C/svg%3E",
  },
};

export function getAvailableComponents(scope = "all") {
  return Object.values(componentRegistry).filter((c) => {
    if (!c.enabled) return false;
    if (scope === "category" && c.scope === "home") return false;
    if (scope === "home" && c.scope === "category") return false;
    return true;
  });
}

export function getComponentMeta(type) {
  return componentRegistry[type] || null;
}

export function isValidComponentType(type) {
  return Boolean(componentRegistry[type]?.enabled);
}

export function allowsMultipleInstances(type) {
  const meta = getComponentMeta(type);
  return Boolean(meta?.allowMultiple);
}

/**
 * Build display labels for order / builder UI.
 */
export function getInstanceLabels(components = []) {
  const sorted = [...components].sort((a, b) => a.order - b.order);
  const totals = {};
  for (const c of sorted) {
    totals[c.type] = (totals[c.type] || 0) + 1;
  }

  const typeIndex = {};
  const labels = {};
  for (const c of sorted) {
    const meta = getComponentMeta(c.type);
    const base = meta?.label || c.type;

    if (meta?.allowMultiple) {
      typeIndex[c.type] = (typeIndex[c.type] || 0) + 1;
      const n = typeIndex[c.type];
      const total = totals[c.type] || 1;
      let label = total > 1 ? `${base} #${n}` : base;
      if (c.title) label += ` — ${c.title}`;
      labels[c.instanceId] = label;
    } else {
      labels[c.instanceId] = base;
    }
  }
  return labels;
}
