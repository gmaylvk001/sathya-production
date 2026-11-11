/**
 * Best Price Resolver for Sathya Store Product Details
 *
 * Real-world Reliance Digital-inspired best price calculation system:
 * - Lowest valid effective ONLINE price obtainable from automatically applicable offers.
 * - Single canonical base selling price: product.special_price > 0 ? product.special_price : product.price.
 * - Never re-applies existing MRP-to-selling-price discount.
 * - Supports percentage, fixed amount, bank/card instant discounts, caps, min order value,
 *   product/category/brand eligibility, validity dates, active status.
 * - Respects stacking and exclusivity rules.
 * - Excludes exchange and manual coupon codes unless auto-applicable.
 * - Safe decimal arithmetic (rounded to 2 decimals, rounded for display).
 */

/**
 * Standard default automatically applicable online bank/payment offers
 * Matching the live Payment Offers configured on the Product Details page.
 */
export const DEFAULT_ONLINE_OFFERS = [
  {
    id: "bank-hdfc-emi",
    name: "HDFC Bank Credit Card EMI",
    category: "bank",
    type: "percentage",
    percentage: 7.5,
    maxDiscount: 15000,
    minOrderValue: 5000,
    code: "NO CODE REQUIRED",
    isAutoApplicable: true,
    stackable: false,
    channel: "online",
    badge: "Best Deal",
    description: "7.5% Instant Discount up to ₹15,000 on HDFC Bank Credit Card EMI (Min. cart ₹5,000)",
  },
  {
    id: "bank-sbi-cc",
    name: "SBI Credit Card",
    category: "bank",
    type: "percentage",
    percentage: 7.5,
    maxDiscount: 15000,
    minOrderValue: 5000,
    code: "NO CODE REQUIRED",
    isAutoApplicable: true,
    stackable: false,
    channel: "online",
    badge: "Instant Discount",
    description: "7.5% Instant Discount up to ₹15,000 on SBI Credit Cards (Min. order ₹5,000)",
  },
  {
    id: "bank-axis-cc",
    name: "Axis Bank Credit Card",
    category: "bank",
    type: "percentage",
    percentage: 7.5,
    maxDiscount: 15000,
    minOrderValue: 0,
    code: "NO CODE REQUIRED",
    isAutoApplicable: true,
    stackable: false,
    channel: "online",
    badge: "Instant Discount",
    description: "7.5% Instant Discount up to ₹15,000 on Axis Bank Credit Cards",
  },
  {
    id: "bank-icici-flat",
    name: "ICICI Bank Cards",
    category: "bank",
    type: "fixed",
    fixedAmount: 1000,
    minOrderValue: 10000,
    code: "ICICI1000",
    isAutoApplicable: false, // Manual coupon required - excluded from automatic Best Price
    stackable: false,
    channel: "online",
    badge: "Flat Cashback",
    description: "Flat ₹1,000 Instant Discount on ICICI Bank Cards (Requires Code ICICI1000)",
  },
];

/**
 * Safe 2-decimal rounding for monetary values
 */
export function roundToTwoDecimals(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format a rupee value for display (standard Indian comma formatting, integer)
 */
export function formatINR(val) {
  const rounded = Math.round(Number(val) || 0);
  return rounded.toLocaleString("en-IN");
}

/**
 * Extract one canonical base selling price:
 * sellingPrice = product.special_price > 0 ? product.special_price : product.price
 */
export function getSellingPrice(product) {
  if (!product) return 0;
  const sp = Number(product.special_price);
  const p = Number(product.price);
  if (!isNaN(sp) && sp > 0) return roundToTwoDecimals(sp);
  if (!isNaN(p) && p > 0) return roundToTwoDecimals(p);
  return 0;
}

/**
 * Check if an offer is eligible for a specific product and context
 */
export function isOfferEligible(offer, product, context = {}) {
  if (!offer || typeof offer !== "object") return false;

  const sellingPrice = context.sellingPrice ?? getSellingPrice(product);
  if (sellingPrice <= 0) return false;

  // 1. Status check: must not be explicitly inactive
  const status = String(
    offer.fest_offer_status ?? offer.status ?? offer.fest_offer_status2 ?? "active"
  ).toLowerCase();
  if (status === "inactive" || status === "disabled" || offer.isActive === false) {
    return false;
  }
  if (offer.fest_offer_status2 && String(offer.fest_offer_status2).toLowerCase() === "inactive") {
    return false;
  }

  // 2. Channel check: store-only offers excluded from online best price
  if (offer.isStoreOnly === true || offer.channel === "store" || offer.storeOnly === true) {
    return false;
  }

  // 3. Auto-applicable check: manually entered coupon codes excluded unless marked auto-applicable
  const hasCode = Boolean(offer.code && String(offer.code).trim() !== "");
  const isNoCodeRequired = String(offer.code || "").trim().toUpperCase() === "NO CODE REQUIRED";
  const isAuto =
    offer.isAutoApplicable === true ||
    offer.autoApply === true ||
    offer.is_auto_applicable === true ||
    isNoCodeRequired ||
    !hasCode;

  if (offer.requiresCoupon === true || (!isAuto && hasCode)) {
    return false;
  }

  // 4. Date validity check
  const now = context.currentDate ? new Date(context.currentDate) : new Date();
  const fromRaw = offer.from_date ?? offer.startDate ?? offer.valid_from;
  if (fromRaw) {
    const fromDate = new Date(fromRaw);
    if (!isNaN(fromDate.getTime()) && now < fromDate) {
      return false;
    }
  }
  const toRaw = offer.to_date ?? offer.endDate ?? offer.valid_to;
  if (toRaw) {
    const toDate = new Date(toRaw);
    if (!isNaN(toDate.getTime())) {
      // Set to end of day if time is 00:00:00
      if (toDate.getHours() === 0 && toDate.getMinutes() === 0 && toDate.getSeconds() === 0) {
        toDate.setHours(23, 59, 59, 999);
      }
      if (now > toDate) {
        return false;
      }
    }
  }

  // 5. Minimum order/product value check
  const minSpend = Number(
    offer.min_order_value ??
      offer.minOrderValue ??
      offer.minCartValue ??
      offer.min_amount ??
      offer.minPurchaseAmount ??
      0
  );
  if (!isNaN(minSpend) && minSpend > 0 && sellingPrice < minSpend) {
    return false;
  }

  // 6. User restriction check (if present)
  if (offer.selected_user_type === "custom") {
    const userId = context.userId ? String(context.userId) : null;
    const allowed = Array.isArray(offer.selected_users)
      ? offer.selected_users.map(String)
      : [];
    if (!userId || !allowed.includes(userId)) {
      return false;
    }
  }

  // 7. Limit check (if present)
  if (offer.limit_enabled === true) {
    const limit = Number(offer.offer_limit) || 0;
    const used = Number(offer.used_by) || 0;
    if (limit > 0 && used >= limit) {
      return false;
    }
  }

  // 8. Product-level targeting
  const prodTargetType = offer.offer_product_category ?? offer.targetType;
  const prodList = offer.offer_product ?? offer.applicableProductIds ?? offer.products;
  if (
    prodTargetType === "product" ||
    (Array.isArray(prodList) && prodList.length > 0 && prodTargetType !== "category")
  ) {
    if (!product) return false;
    const pId = String(product._id || "");
    const pCode = String(product.item_code || product.product_code || "");
    const pSlug = String(product.slug || "");
    const allowedProds = Array.isArray(prodList) ? prodList.map(String) : [];
    if (
      allowedProds.length > 0 &&
      !allowedProds.includes(pId) &&
      !allowedProds.includes(pCode) &&
      !allowedProds.includes(pSlug)
    ) {
      return false;
    }
  }

  // 9. Category-level targeting
  const catList = offer.offer_category ?? offer.applicableCategoryIds ?? offer.categories;
  if (
    prodTargetType === "category" ||
    (Array.isArray(catList) && catList.length > 0 && prodTargetType !== "product")
  ) {
    if (!product) return false;
    const allowedCats = Array.isArray(catList) ? catList.map(String) : [];
    if (allowedCats.length > 0) {
      const pCat = String(product.category || "");
      const pSubCat = String(product.sub_category || "");
      const pSubCatOne = String(product.sub_category_one || "");
      const pCatName = String(product.categoryName || "");
      const match =
        allowedCats.includes(pCat) ||
        allowedCats.includes(pSubCat) ||
        allowedCats.includes(pSubCatOne) ||
        allowedCats.includes(pCatName);
      if (!match) return false;
    }
  }

  // 10. Brand-level targeting
  const brandList = offer.offer_brand ?? offer.applicableBrands ?? offer.brands;
  if (Array.isArray(brandList) && brandList.length > 0) {
    if (!product || !product.brand || !brandList.map(String).includes(String(product.brand))) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate the discount amount an offer produces on a given selling price
 */
export function calculateOfferDiscount(offer, sellingPrice) {
  if (!offer || sellingPrice <= 0) return 0;

  const type = String(offer.type ?? offer.offer_type ?? "").toLowerCase();
  const cap = Number(
    offer.maxDiscount ?? offer.max_discount ?? offer.discountCap ?? offer.discount_cap ?? 0
  );

  let discount = 0;

  if (type === "percentage" || type === "percent") {
    const pct = Number(
      offer.percentage ?? offer.percent ?? offer.discountValue ?? offer.discount_percentage ?? 0
    );
    if (pct > 0) {
      const raw = (sellingPrice * pct) / 100;
      discount = cap > 0 ? Math.min(raw, cap) : raw;
    }
  } else if (type === "fixed" || type === "fixed_price" || type === "fixed_amount" || type === "amount") {
    const fixed = Number(
      offer.fixedAmount ?? offer.fixed_price ?? offer.amount ?? offer.discountValue ?? 0
    );
    if (fixed > 0) {
      discount = Math.min(fixed, sellingPrice);
      if (cap > 0) {
        discount = Math.min(discount, cap);
      }
    }
  }

  return roundToTwoDecimals(Math.max(0, Math.min(discount, sellingPrice)));
}

/**
 * Generate and evaluate valid offer combinations respecting stacking/exclusivity rules.
 * Returns the combination that yields the highest total discount.
 */
export function findBestOfferCombination(eligibleOffers, sellingPrice) {
  if (!Array.isArray(eligibleOffers) || eligibleOffers.length === 0 || sellingPrice <= 0) {
    return {
      bestCombination: [],
      maxDiscount: 0,
    };
  }

  // Map each eligible offer with its calculated discount amount
  const offersWithDiscount = eligibleOffers
    .map((offer) => {
      const discount = calculateOfferDiscount(offer, sellingPrice);
      return {
        offer,
        discount,
        category: String(offer.category || "general").toLowerCase(),
        isExclusive: offer.exclusive === true || offer.isExclusive === true,
        isStackable: offer.stackable !== false && offer.isStackable !== false,
      };
    })
    .filter((o) => o.discount > 0);

  if (offersWithDiscount.length === 0) {
    return {
      bestCombination: [],
      maxDiscount: 0,
    };
  }

  // Rule 5: Stacking / Exclusivity rules:
  // - Any offer with isExclusive === true can only be used alone.
  // - Category 'bank' offers are mutually exclusive (only 1 bank card per payment).
  // - Non-stackable offers can only be used alone.
  // - Compatible stackable offers can combine.

  let bestCombination = [];
  let maxDiscount = 0;

  // 1. Single offer candidates (always valid)
  for (const item of offersWithDiscount) {
    if (item.discount > maxDiscount) {
      maxDiscount = item.discount;
      bestCombination = [item.offer];
    }
  }

  // 2. Multi-offer combinations (only non-exclusive, stackable offers)
  const stackableCandidates = offersWithDiscount.filter(
    (item) => !item.isExclusive && item.isStackable
  );

  // Group by category to enforce category-level exclusivity (e.g. 1 bank offer max)
  if (stackableCandidates.length > 1) {
    // Generate power set (up to a reasonable limit, typically < 6 offers)
    const n = Math.min(stackableCandidates.length, 6);
    const subsetsCount = 1 << n;

    for (let i = 1; i < subsetsCount; i++) {
      const combo = [];
      const categoriesSeen = new Set();
      let valid = true;
      let comboDiscount = 0;

      for (let j = 0; j < n; j++) {
        if ((i & (1 << j)) !== 0) {
          const cand = stackableCandidates[j];
          // Enforce 1 offer per exclusive category (e.g. bank)
          if (cand.category === "bank" || cand.category === "payment") {
            if (categoriesSeen.has(cand.category)) {
              valid = false;
              break;
            }
          }
          categoriesSeen.add(cand.category);
          combo.push(cand);
          comboDiscount += cand.discount;
        }
      }

      if (valid && combo.length > 1) {
        // Total discount cannot exceed selling price
        const totalDiscount = roundToTwoDecimals(Math.min(comboDiscount, sellingPrice));
        if (totalDiscount > maxDiscount) {
          maxDiscount = totalDiscount;
          bestCombination = combo.map((c) => c.offer);
        }
      }
    }
  }

  return {
    bestCombination,
    maxDiscount: roundToTwoDecimals(maxDiscount),
  };
}

/**
 * Main Best Price Resolver
 *
 * @param {Object} product - Product object
 * @param {Object} [options] - Optional calculation options
 * @param {Array} [options.offers] - Custom offers list (defaults to DEFAULT_ONLINE_OFFERS)
 * @param {Date|string} [options.currentDate] - Date context for validity checks
 * @param {string} [options.userId] - Optional user ID context
 * @returns {Object} Structured calculation metadata
 */
export function calculateBestPrice(product, options = {}) {
  const sellingPrice = getSellingPrice(product);

  if (sellingPrice <= 0) {
    return {
      sellingPrice: 0,
      bestPrice: 0,
      bestPriceDisplay: 0,
      totalAdditionalDiscount: 0,
      appliedOffers: [],
      hasDiscount: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  // Combine available offers:
  // If options.offers is provided, use it; otherwise use default online offers.
  // If product.applicableOffers is provided, merge it.
  const rawOffers = Array.isArray(options.offers)
    ? options.offers
    : Array.isArray(product?.applicableOffers)
    ? product.applicableOffers
    : [];

  const context = {
    sellingPrice,
    currentDate: options.currentDate || new Date(),
    userId: options.userId || null,
  };

  // 1. Filter eligible offers
  const eligibleOffers = rawOffers.filter((offer) =>
    isOfferEligible(offer, product, context)
  );

  // 2. Select optimal combination
  const { bestCombination, maxDiscount } = findBestOfferCombination(
    eligibleOffers,
    sellingPrice
  );

  // 3. Calculate final Best Price: max(0, sellingPrice - maxDiscount)
  const bestPrice = roundToTwoDecimals(Math.max(0, sellingPrice - maxDiscount));
  const bestPriceDisplay = Math.round(bestPrice);

  const appliedOffers = bestCombination.map((offer) => {
    const discountAmount = calculateOfferDiscount(offer, sellingPrice);
    return {
      id: String(offer.id || offer._id || offer.code || ""),
      name: offer.name || offer.title || offer.offer_code || "Special Offer",
      code: offer.code || "",
      type: offer.type || offer.offer_type || "percentage",
      percentage: Number(offer.percentage ?? offer.percent ?? 0) || null,
      fixedAmount: Number(offer.fixedAmount ?? offer.fixed_price ?? 0) || null,
      discountAmount,
      badge: offer.badge || null,
      description: offer.description || "",
    };
  });

  return {
    sellingPrice,
    bestPrice,
    bestPriceDisplay,
    totalAdditionalDiscount: maxDiscount,
    appliedOffers,
    hasDiscount: maxDiscount > 0,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Server-side helper to fetch active DB offers and calculate Best Price
 */
const g = globalThis;
if (!g.__sathyaBestPriceDbCache) {
  g.__sathyaBestPriceDbCache = { offers: null, at: 0 };
}
const DB_OFFERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function resolveBestPriceForProduct(product, options = {}) {
  let dbOffers = [];

  // If in Node/server environment and mongoose is available
  if (typeof window === "undefined") {
    try {
      const now = Date.now();
      const cache = g.__sathyaBestPriceDbCache;

      if (cache.offers && now - cache.at < DB_OFFERS_CACHE_TTL) {
        dbOffers = cache.offers;
      } else {
        const mongoose = (await import("mongoose")).default;
        if (mongoose.connection?.readyState === 1) {
          const Offer =
            mongoose.models.ecom_offer_info ||
            mongoose.model(
              "ecom_offer_info",
              new mongoose.Schema({}, { collection: "ecom_offer_info" })
            );

          const docs = await Offer.find({
            fest_offer_status: /^active$/i,
          }).lean();

          dbOffers = (docs || []).map((doc) => ({
            id: String(doc._id),
            name: doc.offer_code,
            category: "promo",
            type: doc.offer_type === "fixed_price" ? "fixed" : "percentage",
            percentage: Number(doc.percentage) || 0,
            fixedAmount: Number(doc.fixed_price) || 0,
            maxDiscount: Number(doc.max_discount || doc.discount_cap || 0),
            minOrderValue: Number(doc.min_order_value || doc.min_amount || 0),
            from_date: doc.from_date,
            to_date: doc.to_date,
            status: "active",
            fest_offer_status: doc.fest_offer_status,
            fest_offer_status2: doc.fest_offer_status2,
            isAutoApplicable: true,
            applicableProductIds: Array.isArray(doc.offer_product)
              ? doc.offer_product.map(String)
              : [],
            applicableCategoryIds: Array.isArray(doc.offer_category)
              ? doc.offer_category.map(String)
              : [],
            targetType: doc.offer_product_category,
            limit_enabled: doc.limit_enabled,
            offer_limit: doc.offer_limit,
            used_by: doc.used_by,
            stackable: true,
            channel: "online",
            description: doc.notes || doc.offer_code,
          }));

          cache.offers = dbOffers;
          cache.at = now;
        }
      }
    } catch {
      // In case of any DB error, proceed with default online offers
      dbOffers = [];
    }
  }

  const combinedOffers = [
    ...dbOffers,
    ...(Array.isArray(options.offers) ? options.offers : []),
  ];

  return calculateBestPrice(product, {
    ...options,
    offers: combinedOffers,
  });
}
