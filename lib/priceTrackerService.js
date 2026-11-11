/**
 * ePrice Tracker™ - Live Market Price Comparison Engine
 * Sathya Store E-Commerce
 *
 * Pure On-Demand Fetch & Strict Matching (No Timers / No Cron)
 */

const CRON_FEED_URL =
  process.env.LSP_PRICE_API_URL ||
  "https://cron.epricetrack.com/eprice/admin/cron/competitor_lsp_data_fetch_api.php?cmpid=sathya";

// Backward-compatible stubs in case UI imports them (Zero errors)
export function getISTTimeMinutes() { return { hours: 0, minutes: 0, seconds: 0, totalMinutes: 0, totalSeconds: 0 }; }
export const IST_SYNC_SLOTS = [];
export function getLastVerifiedSlot() { return "Live"; }
export function getLastVerifiedSlotDetailed() { return { slot: "Live", label: "Live Verified", badgeText: "Verified" }; }
export function getNextSyncCountdown() { return 0; }

/**
 * Fetches the competitor feed directly with 12s timeout protection.
 * @returns {Promise<Array<any>>}
 */
// Feature approval pending from management — strictly block all external HTTP calls
export const IS_LSP_API_ENABLED = false;

export async function fetchCompetitorFeed() {
  // Management approval pending — strictly block all external HTTP calls
  if (!IS_LSP_API_ENABLED) {
    return [];
  }
  const fetchWithTimeout = async (url, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  };

  try {
    const res = await fetchWithTimeout(CRON_FEED_URL, 12000);
    if (res && res.ok) {
      const data = await res.json();
      const list = (Array.isArray(data) ? data : Object.values(data || {})).filter(Boolean);
      return list.length > 0 ? list : [];
    }
  } catch (err) {
    console.warn("[priceTrackerService] Error fetching feed:", err.message);
  }

  return [];
}

/**
 * Helper to safely extract competitor price for a given platform key
 * from direct fields, final_lsp_is, or all_lsp_competitors.
 */
export function extractCompetitorPrice(item, brandKey) {
  if (!item || typeof item !== "object") return null;

  const keyLower = String(brandKey || "").toLowerCase();
  const aliases = [keyLower];
  if (keyLower.includes("reliance")) {
    aliases.push("reliance", "reliance_digital", "reliancedigital");
  } else if (keyLower.includes("vijay")) {
    aliases.push("vijay", "vijay_sales", "vijaysales");
  }

  const parseVal = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return isNaN(v) || v <= 0 ? null : v;
    if (typeof v === "string") {
      const cleaned = parseFloat(v.replace(/[^0-9.]/g, ""));
      return isNaN(cleaned) || cleaned <= 0 ? null : cleaned;
    }
    return null;
  };

  const candidates = [];

  // 1. Direct fields on item
  for (const alias of aliases) {
    const directFields = [
      item[`${alias}_price`],
      item[`${alias}_product_price`],
      item[alias],
    ];
    for (const v of directFields) {
      const parsed = parseVal(v);
      if (parsed != null) candidates.push(parsed);
    }
  }

  // 2. final_lsp_is object
  if (item.final_lsp_is && typeof item.final_lsp_is === "object") {
    for (const [k, v] of Object.entries(item.final_lsp_is)) {
      const kl = k.toLowerCase();
      if (aliases.some((alias) => kl.includes(alias))) {
        const parsed = parseVal(v);
        if (parsed != null) candidates.push(parsed);
      }
    }
  }

  // 3. all_lsp_competitors object
  if (item.all_lsp_competitors && typeof item.all_lsp_competitors === "object") {
    for (const [k, v] of Object.entries(item.all_lsp_competitors)) {
      const kl = k.toLowerCase();
      if (aliases.some((alias) => kl.includes(alias))) {
        const parsed = parseVal(v);
        if (parsed != null) candidates.push(parsed);
      }
    }
  }

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

/**
 * Monitored platforms (Up to 4 competitor deals shown in UI)
 */
export const MONITORED_COMPETITOR_PLATFORMS = [
  { name: "Croma", key: "croma", defaultUrl: "https://www.croma.com" },
  { name: "Amazon", key: "amazon", defaultUrl: "https://www.amazon.in" },
  { name: "Flipkart", key: "flipkart", defaultUrl: "https://www.flipkart.com" },
  { name: "Reliance Digital", key: "reliancedigital", defaultUrl: "https://www.reliancedigital.in" },
  { name: "Vijay Sales", key: "vijaysales", defaultUrl: "https://www.vijaysales.com" },
  { name: "Poorvika", key: "poorvika", defaultUrl: "https://www.poorvika.com" },
];

/**
 * Extracts genuine competitor deals for a matched feed item.
 */
export function extractAndNormalizeCompetitorDeals(
  matchedItem,
  sathyaPrice,
  lastSlot = "Live"
) {
  if (!matchedItem || typeof matchedItem !== "object") return [];

  const itemType = String(matchedItem.type || "").trim().toLowerCase();
  if (itemType !== "lsp") {
    return [];
  }

  const p = Number(sathyaPrice) || 0;
  if (!IS_LSP_API_ENABLED) return [];
  if (p <= 0) return [];

  const deals = [];

  for (const comp of MONITORED_COMPETITOR_PLATFORMS) {
    const rawPrice = extractCompetitorPrice(matchedItem, comp.key);
    if (typeof rawPrice !== "number" || isNaN(rawPrice) || rawPrice <= 0) {
      continue;
    }

    const savings = Math.max(0, rawPrice - p);
    const isCheaper = rawPrice > p;
    const isMatched = rawPrice === p;

    if (isCheaper || isMatched) {
      deals.push({
        platform: comp.name,
        price: rawPrice,
        inStock: true,
        productUrl: matchedItem[`${comp.key}_url`] || comp.defaultUrl,
        lastVerified: "Live",
        priceDifferenceVsSathya: savings,
        savingsVsSathya: savings,
        isSathyaCheaper: isCheaper,
        isCompetitorCheaper: false,
        isMatched: isMatched,
      });
    }
  }

  return deals;
}

/**
 * Matches Sathya product strictly and returns competitor deals.
 */
export async function getCompetitorDeals({
  product_code = "",
  sku = "",
  item_code = "",
  model_number = "",
  ean = "",
  barcode = "",
  sathyaPrice = 0,
  feedOverride = null,
}) {
  const p = Math.max(0, Number(sathyaPrice) || 0);
  if (!IS_LSP_API_ENABLED) return [];
  if (p <= 0) return [];

  const cleanEanList = [ean, barcode]
    .filter(Boolean)
    .map((e) => String(e).trim().replace(/[^0-9]/g, ""))
    .filter((e) => e.length >= 8);

  const cleanProductCodes = [product_code, item_code, sku, model_number]
    .filter(Boolean)
    .map((c) => String(c).trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter((c) => c.length >= 3);

  if (cleanEanList.length === 0 && cleanProductCodes.length === 0) {
    return [];
  }

  // 1. Fetch live feed directly with timeout protection
  const feed = Array.isArray(feedOverride) ? feedOverride : await fetchCompetitorFeed();
  if (!Array.isArray(feed) || feed.length === 0) {
    return [];
  }

  // 2. Strict Match: EAN exact match OR exact product_code / model match
  const matchedItem = feed.find((item) => {
    if (!item || typeof item !== "object") return false;

    // Strict EAN check
    if (cleanEanList.length > 0 && item.product_ean_id) {
      const cleanFeedEan = String(item.product_ean_id).trim().replace(/[^0-9]/g, "");
      if (cleanFeedEan.length >= 8 && cleanEanList.includes(cleanFeedEan)) {
        return true;
      }
    }

    // Strict Product Code & Model Number Check
    if (cleanProductCodes.length > 0 && item.product_code) {
      const cleanFeedCode = String(item.product_code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanFeedCode.length >= 3) {
        if (cleanProductCodes.includes(cleanFeedCode)) {
          return true;
        }

        // Safe ERP prefix normalization (<= 4 chars prefix)
        if (cleanFeedCode.length >= 5) {
          for (const code of cleanProductCodes) {
            if (code.endsWith(cleanFeedCode) && (code.length - cleanFeedCode.length) <= 4) {
              return true;
            }
          }
        }
      }
    }
    return false;
  });

  if (!matchedItem) {
    return [];
  }

  return extractAndNormalizeCompetitorDeals(matchedItem, p);
}
