// Shared Header Builder schema defaults, validation, migration, smooth gradient builder, and WCAG contrast helpers.

export const DEFAULT_MENU_ITEMS = [
  { label: "TV & Audio", link: "/category/television", order: 0, visible: true },
  { label: "Appliances", link: "/category/refrigerator", order: 1, visible: true },
  { label: "Mobiles & Wearables", link: "/category/smartphones", order: 2, visible: true },
  { label: "Kitchen Appliances", link: "/category/kitchen-appliances", order: 3, visible: true },
  { label: "Utility Appliances", link: "/category/air-conditioner", order: 4, visible: true },
  { label: "Loyalty", link: "/loyalty", order: 5, visible: true },
  { label: "Blogs", link: "/blogs", order: 6, visible: true },
];

export const DEFAULT_HEADER_SETTINGS = {
  design: "modern",
  logo: {
    url: "/uploads/sathya-header-logo.webp",
    height: 48,
  },
  topbar: {
    enabled: true,
    badge_text: "FLASH SALE",
    message: "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
    deals_label: "Deals",
    deals_link: "/deals-offer",
    stores_text: "180+ Stores in South India",
    helpline: "+91 88805 98985",
    bg_start: "#0b1033",
    bg_end: "#00c6ff",
    text_color: "#ffffff",
  },
  main: {
    bg: "#ffffff",
    search_placeholder: "Search for",
    search_btn_color: "#ed1c24",
    icon_color: "#333333",
    badge_color: "#ed1c24",
    show: {
      deliver_to: true,
      deals: true,
      contact: true,
      store: true,
      wishlist: true,
      cart: true,
      user: true,
    },
  },
  menu: {
    bg_type: "single",
    bg_single: "#b91c1c",
    gradient: {
      start: "#e31e24",
      mid: "#ffffff",
      mid_enabled: false,
      end: "#ffe600",
      direction: "90deg",
      mid_spread: 35,
      smooth: true,
    },
    text_color: "#ffffff",
    hover_color: "#ffe600",
    button_bg: "#e31e24",
    button_text: "#ffffff",
    accent_line: {
      enabled: true,
      color: "#ffe600",
      height: 3,
    },
    items: DEFAULT_MENU_ITEMS,
  },
};

export const READY_THEMES = [
  {
    id: "sathya-red",
    name: "Sathya Red",
    description: "Classic Sathya red bar with yellow accent line",
    swatch: "#b91c1c",
    patch: {
      topbar: { bg_start: "#0b1033", bg_end: "#00c6ff", text_color: "#ffffff" },
      main: { bg: "#ffffff", search_btn_color: "#ed1c24", icon_color: "#333333", badge_color: "#ed1c24" },
      menu: {
        bg_type: "single",
        bg_single: "#b91c1c",
        text_color: "#ffffff",
        hover_color: "#ffe600",
        button_bg: "#991b1b",
        button_text: "#ffffff",
        accent_line: { enabled: true, color: "#ffe600", height: 3 },
      },
    },
  },
  {
    id: "festive-rwy",
    name: "Festive Red-White-Yellow",
    description: "Smooth 3-color festive fade with readable dark text",
    swatch: "linear-gradient(90deg, #e31e24 0%, #ffffff 50%, #ffe600 100%)",
    patch: {
      topbar: { bg_start: "#0b1033", bg_end: "#00c6ff", text_color: "#ffffff" },
      main: { bg: "#ffffff", search_btn_color: "#e31e24", icon_color: "#1f2937", badge_color: "#e31e24" },
      menu: {
        bg_type: "gradient",
        gradient: {
          start: "#e31e24",
          mid: "#ffffff",
          mid_enabled: true,
          end: "#ffe600",
          direction: "90deg",
          mid_spread: 35,
          smooth: true,
        },
        text_color: "#111827",
        hover_color: "#b91c1c",
        button_bg: "#e31e24",
        button_text: "#ffffff",
        accent_line: { enabled: false, color: "#ffe600", height: 3 },
      },
    },
  },
  {
    id: "dark-charcoal",
    name: "Dark Charcoal",
    description: "Sleek dark retail bar with amber hover",
    swatch: "#161616",
    patch: {
      topbar: { bg_start: "#0a0a0a", bg_end: "#262626", text_color: "#ffffff" },
      main: { bg: "#ffffff", search_btn_color: "#ed1c24", icon_color: "#111827", badge_color: "#ed1c24" },
      menu: {
        bg_type: "single",
        bg_single: "#161616",
        text_color: "#ffffff",
        hover_color: "#fbbf24",
        button_bg: "#ed1c24",
        button_text: "#ffffff",
        accent_line: { enabled: false, color: "#fbbf24", height: 3 },
      },
    },
  },
  {
    id: "christmas-green",
    name: "Christmas Green",
    description: "Festive evergreen bar with gold highlights",
    swatch: "#14532d",
    patch: {
      topbar: { bg_start: "#052e16", bg_end: "#166534", text_color: "#ffffff" },
      main: { bg: "#ffffff", search_btn_color: "#dc2626", icon_color: "#14532d", badge_color: "#dc2626" },
      menu: {
        bg_type: "single",
        bg_single: "#14532d",
        text_color: "#ffffff",
        hover_color: "#fde047",
        button_bg: "#dc2626",
        button_text: "#ffffff",
        accent_line: { enabled: true, color: "#fde047", height: 3 },
      },
    },
  },
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_DIRECTIONS = new Set(["90deg", "180deg", "135deg", "45deg", "270deg", "to right", "to left", "to bottom", "to top", "radial"]);

export function isValidHexColor(value) {
  return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHex(hex, fallback = "#ffffff") {
  if (!isValidHexColor(hex)) return fallback;
  const raw = hex.trim().toLowerCase();
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

export function isValidUrlOrPath(value) {
  if (value === "" || value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith("/")) return !v.startsWith("//");
  try {
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_HEADER_SETTINGS));
}

/**
 * Deep-merge incoming settings with defaults, preserving structure.
 */
export function mergeHeaderSettings(raw = {}) {
  const base = cloneDefaults();
  if (!raw || typeof raw !== "object") return base;

  base.design = raw.design === "classic" ? "classic" : "modern";

  if (raw.logo && typeof raw.logo === "object") {
    if (typeof raw.logo.url === "string") base.logo.url = raw.logo.url.trim();
    const h = Number(raw.logo.height);
    if (Number.isFinite(h) && h >= 28 && h <= 80) base.logo.height = Math.round(h);
  }

  if (raw.topbar && typeof raw.topbar === "object") {
    const t = raw.topbar;
    if (typeof t.enabled === "boolean") base.topbar.enabled = t.enabled;
    if (typeof t.badge_text === "string") base.topbar.badge_text = t.badge_text.slice(0, 40);
    if (typeof t.message === "string") base.topbar.message = t.message.slice(0, 200);
    if (typeof t.deals_label === "string") base.topbar.deals_label = t.deals_label.slice(0, 30);
    if (typeof t.deals_link === "string") base.topbar.deals_link = t.deals_link.trim();
    if (typeof t.stores_text === "string") base.topbar.stores_text = t.stores_text.slice(0, 80);
    if (typeof t.helpline === "string") base.topbar.helpline = t.helpline.slice(0, 40);
    if (isValidHexColor(t.bg_start)) base.topbar.bg_start = normalizeHex(t.bg_start);
    if (isValidHexColor(t.bg_end)) base.topbar.bg_end = normalizeHex(t.bg_end);
    if (isValidHexColor(t.text_color)) base.topbar.text_color = normalizeHex(t.text_color);
  }

  if (raw.main && typeof raw.main === "object") {
    const m = raw.main;
    if (isValidHexColor(m.bg)) base.main.bg = normalizeHex(m.bg);
    if (typeof m.search_placeholder === "string") base.main.search_placeholder = m.search_placeholder.slice(0, 60);
    if (isValidHexColor(m.search_btn_color)) base.main.search_btn_color = normalizeHex(m.search_btn_color);
    if (isValidHexColor(m.icon_color)) base.main.icon_color = normalizeHex(m.icon_color);
    if (isValidHexColor(m.badge_color)) base.main.badge_color = normalizeHex(m.badge_color);
    if (m.show && typeof m.show === "object") {
      for (const k of Object.keys(base.main.show)) {
        if (typeof m.show[k] === "boolean") base.main.show[k] = m.show[k];
      }
    }
  }

  if (raw.menu && typeof raw.menu === "object") {
    const mu = raw.menu;
    base.menu.bg_type = mu.bg_type === "gradient" ? "gradient" : "single";
    if (isValidHexColor(mu.bg_single)) base.menu.bg_single = normalizeHex(mu.bg_single);
    if (isValidHexColor(mu.text_color)) base.menu.text_color = normalizeHex(mu.text_color);
    if (isValidHexColor(mu.hover_color)) base.menu.hover_color = normalizeHex(mu.hover_color);
    if (isValidHexColor(mu.button_bg)) base.menu.button_bg = normalizeHex(mu.button_bg);
    if (isValidHexColor(mu.button_text)) base.menu.button_text = normalizeHex(mu.button_text);

    if (mu.gradient && typeof mu.gradient === "object") {
      const g = mu.gradient;
      if (isValidHexColor(g.start)) base.menu.gradient.start = normalizeHex(g.start);
      if (isValidHexColor(g.mid)) base.menu.gradient.mid = normalizeHex(g.mid);
      if (typeof g.mid_enabled === "boolean") base.menu.gradient.mid_enabled = g.mid_enabled;
      if (isValidHexColor(g.end)) base.menu.gradient.end = normalizeHex(g.end);
      if (typeof g.direction === "string" && ALLOWED_DIRECTIONS.has(g.direction)) {
        base.menu.gradient.direction = g.direction;
      }
      const spread = Number(g.mid_spread);
      if (Number.isFinite(spread)) {
        base.menu.gradient.mid_spread = Math.max(0, Math.min(80, Math.round(spread)));
      }
      if (typeof g.smooth === "boolean") base.menu.gradient.smooth = g.smooth;
    }

    if (mu.accent_line && typeof mu.accent_line === "object") {
      if (typeof mu.accent_line.enabled === "boolean") base.menu.accent_line.enabled = mu.accent_line.enabled;
      if (isValidHexColor(mu.accent_line.color)) base.menu.accent_line.color = normalizeHex(mu.accent_line.color);
      const ah = Number(mu.accent_line.height);
      if (Number.isFinite(ah)) base.menu.accent_line.height = Math.max(1, Math.min(8, Math.round(ah)));
    }

    if (Array.isArray(mu.items)) {
      base.menu.items = mu.items
        .filter((it) => it && typeof it === "object" && typeof it.label === "string" && it.label.trim())
        .map((it, idx) => ({
          label: it.label.trim().slice(0, 50),
          link: typeof it.link === "string" ? it.link.trim() : "/",
          order: Number.isFinite(Number(it.order)) ? Number(it.order) : idx,
          visible: it.visible !== false,
        }))
        .sort((a, b) => a.order - b.order)
        .map((it, idx) => ({ ...it, order: idx }));
    }
  }

  return base;
}

/**
 * Validate incoming settings from Admin PUT/POST request.
 */
export function validateHeaderSettings(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Invalid settings payload"], data: null };
  }

  const hexChecks = [
    ["topbar.bg_start", input?.topbar?.bg_start],
    ["topbar.bg_end", input?.topbar?.bg_end],
    ["topbar.text_color", input?.topbar?.text_color],
    ["main.bg", input?.main?.bg],
    ["main.search_btn_color", input?.main?.search_btn_color],
    ["main.icon_color", input?.main?.icon_color],
    ["main.badge_color", input?.main?.badge_color],
    ["menu.bg_single", input?.menu?.bg_single],
    ["menu.gradient.start", input?.menu?.gradient?.start],
    ["menu.gradient.mid", input?.menu?.gradient?.mid],
    ["menu.gradient.end", input?.menu?.gradient?.end],
    ["menu.text_color", input?.menu?.text_color],
    ["menu.hover_color", input?.menu?.hover_color],
    ["menu.button_bg", input?.menu?.button_bg],
    ["menu.button_text", input?.menu?.button_text],
    ["menu.accent_line.color", input?.menu?.accent_line?.color],
  ];

  for (const [field, val] of hexChecks) {
    if (val !== undefined && val !== null && !isValidHexColor(val)) {
      errors.push(`Invalid hex color for ${field}`);
    }
  }

  const urlChecks = [
    ["logo.url", input?.logo?.url],
    ["topbar.deals_link", input?.topbar?.deals_link],
  ];
  if (Array.isArray(input?.menu?.items)) {
    input.menu.items.forEach((it, i) => {
      urlChecks.push([`menu.items[${i}].link`, it?.link]);
    });
  }

  for (const [field, val] of urlChecks) {
    if (val !== undefined && val !== null && !isValidUrlOrPath(val)) {
      errors.push(`Invalid URL or path for ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: mergeHeaderSettings(input),
  };
}

/**
 * Migrate legacy flat NavbarSettings document into the new structured schema.
 */
export function migrateLegacyNavbarSettings(legacyDoc) {
  if (!legacyDoc) return cloneDefaults();
  if (legacyDoc.headerConfig && typeof legacyDoc.headerConfig === "object") {
    return mergeHeaderSettings(legacyDoc.headerConfig);
  }

  const mapped = cloneDefaults();
  mapped.design = legacyDoc.headerStyle === "classic" ? "classic" : "modern";
  if (legacyDoc.flashSaleBadge) mapped.topbar.badge_text = legacyDoc.flashSaleBadge;
  if (legacyDoc.flashSaleText) mapped.topbar.message = legacyDoc.flashSaleText;
  if (legacyDoc.storeCountText) mapped.topbar.stores_text = legacyDoc.storeCountText;
  if (legacyDoc.helplineText) mapped.topbar.helpline = legacyDoc.helplineText;

  if (isValidHexColor(legacyDoc.topBarBg)) mapped.main.bg = normalizeHex(legacyDoc.topBarBg);
  if (isValidHexColor(legacyDoc.searchBtnBg)) mapped.main.search_btn_color = normalizeHex(legacyDoc.searchBtnBg);
  if (isValidHexColor(legacyDoc.actionIconColor)) mapped.main.icon_color = normalizeHex(legacyDoc.actionIconColor);
  if (isValidHexColor(legacyDoc.badgeBgColor)) mapped.main.badge_color = normalizeHex(legacyDoc.badgeBgColor);

  mapped.menu.bg_type = legacyDoc.bgType === "gradient" ? "gradient" : "single";
  if (isValidHexColor(legacyDoc.bgColor)) mapped.menu.bg_single = normalizeHex(legacyDoc.bgColor);
  if (isValidHexColor(legacyDoc.gradientStart)) mapped.menu.gradient.start = normalizeHex(legacyDoc.gradientStart);
  if (isValidHexColor(legacyDoc.gradientEnd)) mapped.menu.gradient.end = normalizeHex(legacyDoc.gradientEnd);
  if (typeof legacyDoc.gradientDirection === "string" && ALLOWED_DIRECTIONS.has(legacyDoc.gradientDirection)) {
    mapped.menu.gradient.direction = legacyDoc.gradientDirection;
  }
  if (isValidHexColor(legacyDoc.textColor)) mapped.menu.text_color = normalizeHex(legacyDoc.textColor);
  if (typeof legacyDoc.showTopBorder === "boolean") mapped.menu.accent_line.enabled = legacyDoc.showTopBorder;
  if (isValidHexColor(legacyDoc.topBorderColor)) mapped.menu.accent_line.color = normalizeHex(legacyDoc.topBorderColor);

  return mapped;
}

function hexToRgb(hex) {
  const norm = normalizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(norm.slice(0, 2), 16),
    g: parseInt(norm.slice(2, 4), 16),
    b: parseInt(norm.slice(4, 6), 16),
  };
}

function lerpRgb(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Build CSS background string for the menu bar.
 * When mid_enabled + smooth are true, generates 13 eased rgba() stops per fade
 * so there are zero hard or muddy dark edges.
 */
export function buildMenuBackgroundCss(menu) {
  if (!menu) return DEFAULT_HEADER_SETTINGS.menu.bg_single;
  if (menu.bg_type !== "gradient") {
    return normalizeHex(menu.bg_single, "#b91c1c");
  }

  const g = menu.gradient || DEFAULT_HEADER_SETTINGS.menu.gradient;
  const startHex = normalizeHex(g.start, "#e31e24");
  const endHex = normalizeHex(g.end, "#ffe600");
  const dir = g.direction || "90deg";

  if (!g.mid_enabled) {
    if (dir === "radial") {
      return `radial-gradient(circle, ${startHex} 0%, ${endHex} 100%)`;
    }
    return `linear-gradient(${dir}, ${startHex} 0%, ${endHex} 100%)`;
  }

  const midHex = normalizeHex(g.mid, "#ffffff");
  const spread = Math.max(0, Math.min(80, Number(g.mid_spread ?? 35)));
  const midStart = Math.max(2, 50 - spread / 2);
  const midEnd = Math.min(98, 50 + spread / 2);

  if (!g.smooth) {
    const stops = `${startHex} 0%, ${midHex} ${midStart}%, ${midHex} ${midEnd}%, ${endHex} 100%`;
    return dir === "radial" ? `radial-gradient(circle, ${stops})` : `linear-gradient(${dir}, ${stops})`;
  }

  const cStart = hexToRgb(startHex);
  const cMid = hexToRgb(midHex);
  const cEnd = hexToRgb(endHex);

  const STEPS = 13; // 13 stops per fade (0..12)
  const stops = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const eased = easeInOutSine(t);
    const pct = (t * midStart).toFixed(2);
    stops.push(`${lerpRgb(cStart, cMid, eased)} ${pct}%`);
  }

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const eased = easeInOutSine(t);
    const pct = (midEnd + t * (100 - midEnd)).toFixed(2);
    stops.push(`${lerpRgb(cMid, cEnd, eased)} ${pct}%`);
  }

  const stopStr = stops.join(", ");
  return dir === "radial" ? `radial-gradient(circle, ${stopStr})` : `linear-gradient(${dir}, ${stopStr})`;
}

export function buildTopbarBackgroundCss(topbar) {
  if (!topbar) return "linear-gradient(90deg, #0b1033 0%, #00c6ff 100%)";
  const start = normalizeHex(topbar.bg_start, "#0b1033");
  const end = normalizeHex(topbar.bg_end, "#00c6ff");
  return `linear-gradient(90deg, ${start} 0%, ${end} 100%)`;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check menu text color against single background or gradient start/mid/end stops (WCAG AA 4.5:1).
 */
export function checkMenuContrast(menu) {
  if (!menu) return { passes: true, minRatio: 21, failedStops: [], suggestion: "" };
  const textHex = normalizeHex(menu.text_color, "#ffffff");

  const targets =
    menu.bg_type === "gradient"
      ? [
          { name: "Start", hex: normalizeHex(menu.gradient?.start, "#e31e24") },
          ...(menu.gradient?.mid_enabled
            ? [{ name: "Middle", hex: normalizeHex(menu.gradient?.mid, "#ffffff") }]
            : []),
          { name: "End", hex: normalizeHex(menu.gradient?.end, "#ffe600") },
        ]
      : [{ name: "Background", hex: normalizeHex(menu.bg_single, "#b91c1c") }];

  let minRatio = Infinity;
  const failedStops = [];
  for (const t of targets) {
    const ratio = getContrastRatio(textHex, t.hex);
    if (ratio < minRatio) minRatio = ratio;
    if (ratio < 4.5) failedStops.push(t.name);
  }

  let suggestion = "";
  if (failedStops.length > 0) {
    const hasLightMid = menu.bg_type === "gradient" && menu.gradient?.mid_enabled && relativeLuminance(menu.gradient?.mid || "#ffffff") > 0.5;
    suggestion = hasLightMid
      ? "Tip: Use dark text (e.g. #111827) for gradients with a light/white middle."
      : "Tip: Try #FFFFFF on dark backgrounds or #111827 on light backgrounds.";
  }

  return {
    passes: failedStops.length === 0,
    minRatio: Number(minRatio.toFixed(2)),
    failedStops,
    suggestion,
  };
}

/**
 * Convert new structured HeaderSettings to CSS variables map for the header root.
 */
export function buildHeaderCssVars(settings) {
  const s = mergeHeaderSettings(settings);
  return {
    "--hdr-topbar-bg": buildTopbarBackgroundCss(s.topbar),
    "--hdr-topbar-text": s.topbar.text_color,
    "--hdr-main-bg": s.main.bg,
    "--hdr-search-btn": s.main.search_btn_color,
    "--hdr-icon-color": s.main.icon_color,
    "--hdr-badge-bg": s.main.badge_color,
    "--hdr-menu-bg": buildMenuBackgroundCss(s.menu),
    "--hdr-menu-text": s.menu.text_color,
    "--hdr-menu-hover": s.menu.hover_color,
    "--hdr-btn-bg": s.menu.button_bg,
    "--hdr-btn-text": s.menu.button_text,
    "--hdr-accent-color": s.menu.accent_line.color,
    "--hdr-accent-height": `${s.menu.accent_line.enabled ? s.menu.accent_line.height : 0}px`,
  };
}
