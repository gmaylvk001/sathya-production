export function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bidirectional synonym groups for Indian electronics / appliance search.
 * Any term in a group expands to every other term in that group.
 */
const SYNONYM_GROUPS = [
  [
    "mobile",
    "mobiles",
    "phone",
    "phones",
    "smartphone",
    "smartphones",
    "cell phone",
    "cell phones",
    "cellphone",
    "cellphones",
    "mobile phone",
    "mobile phones",
    "handset",
    "handsets",
  ],
  [
    "laptop",
    "laptops",
    "notebook",
    "notebooks",
    "ultrabook",
    "ultrabooks",
    "laptop computer",
    "laptop computers",
  ],
  [
    "ac",
    "a/c",
    "air conditioner",
    "air conditioners",
    "air conditioning",
    "split ac",
    "window ac",
    "inverter ac",
  ],
  ["tv", "tvs", "television", "televisions", "led tv", "led tvs", "smart tv", "smart tvs"],
  ["fridge", "fridges", "refrigerator", "refrigerators", "ref"],
  [
    "washing machine",
    "washing machines",
    "washer",
    "washers",
    "wm",
  ],
  [
    "earphone",
    "earphones",
    "earbud",
    "earbuds",
    "ear bud",
    "ear buds",
    "headset",
    "headsets",
    "headphone",
    "headphones",
    "tws",
  ],
  ["speaker", "speakers", "bluetooth speaker", "bluetooth speakers"],
  ["soundbar", "soundbars", "sound bar", "sound bars"],
  ["tablet", "tablets", "ipad", "ipads", "tab", "tabs"],
  ["watch", "watches", "smartwatch", "smartwatches", "smart watch", "smart watches", "fitness band", "fitness bands"],
  ["microwave", "microwaves", "microwave oven", "microwave ovens", "otg"],
  ["chimney", "chimneys", "kitchen chimney", "kitchen chimneys", "hood", "hoods"],
  ["geyser", "geysers", "water heater", "water heaters"],
  ["fan", "fans", "ceiling fan", "ceiling fans", "table fan", "table fans"],
  ["cooler", "coolers", "air cooler", "air coolers"],
  ["iron", "irons", "steam iron", "steam irons", "dry iron", "dry irons"],
  ["mixer", "mixers", "mixer grinder", "mixer grinders", "juicer", "juicers"],
  ["induction", "inductions", "induction stove", "induction stoves", "induction cooktop", "induction cooktops"],
  ["camera", "cameras", "dslr", "dslrs", "mirrorless"],
  ["monitor", "monitors", "computer monitor", "computer monitors", "display", "displays"],
  ["printer", "printers"],
  ["router", "routers", "wifi router", "wifi routers", "wi-fi router"],
  ["power bank", "power banks", "powerbank", "powerbanks"],
  ["charger", "chargers", "adapter", "adapters"],
];

/** Legacy exact-key map kept for backward compatibility with older callers */
const QUERY_SYNONYMS = Object.fromEntries(
  SYNONYM_GROUPS.flatMap((group) =>
    group.map((term) => [term, group.filter((other) => other !== term)])
  )
);

const SYNONYM_LOOKUP = (() => {
  const map = new Map();
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      map.set(term, group);
    }
  }
  return map;
})();

export function normalizeSearchText(value = "") {
  return (value || "")
    .replace(/\+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Singular ↔ plural variants for a single English word token. */
export function getWordVariants(word = "") {
  const w = normalizeSearchText(word).replace(/[^a-z0-9+/.-]/gi, "");
  if (!w || w.length < 2) return w ? [w] : [];

  const variants = new Set([w]);

  if (w.endsWith("ies") && w.length > 4) {
    variants.add(`${w.slice(0, -3)}y`);
  } else if (/(?:ses|xes|zes|ches|shes)$/.test(w) && w.length > 4) {
    variants.add(w.slice(0, -2));
  } else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    variants.add(w.slice(0, -1));
  }

  if (!w.endsWith("s")) {
    if (w.endsWith("y") && w.length > 2 && !/[aeiou]y$/.test(w)) {
      variants.add(`${w.slice(0, -1)}ies`);
    } else if (/(?:s|x|z|ch|sh)$/.test(w)) {
      variants.add(`${w}es`);
    } else {
      variants.add(`${w}s`);
    }
  }

  return [...variants];
}

function addSynonymGroupTerms(terms, value) {
  const key = normalizeSearchText(value);
  if (!key) return;
  const group = SYNONYM_LOOKUP.get(key);
  if (!group) return;
  for (const term of group) terms.add(term);
}

/**
 * Parse Amazon-style price constraints from free-text search queries.
 * Examples:
 *   "under 15000 mobile phone 5g" → cleaned "mobile phone 5g", max 15000
 *   "phones above 10k" → cleaned "phones", min 10000
 *   "iphone above 64000" → cleaned "iphone", min 64000
 *   "iphone below 64000" / "iphone low 64000" → cleaned "iphone", max 64000
 *   "iphone high 64000" / "iphone rupees above 64000" → cleaned "iphone", min 64000
 *   "tv between 20000 and 40000" → cleaned "tv", min 20000, max 40000
 */
export function parseSearchPriceIntent(rawQuery = "") {
  const original = String(rawQuery || "")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!original) {
    return {
      cleanedQuery: "",
      minPrice: null,
      maxPrice: null,
      hasPriceIntent: false,
    };
  }

  const parseAmount = (numStr, kSuffix) => {
    if (numStr == null || numStr === "") return null;
    const n = Number(String(numStr).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return null;
    const value = kSuffix ? Math.round(n * 1000) : Math.round(n);
    // Guard against accidental model/spec numbers (e.g. "under 5")
    if (!kSuffix && value > 0 && value < 100) return null;
    return value;
  };

  const currency = "(?:(?:rs\\.?|inr|₹|rupees?)\\s*)?";
  const amount = "([\\d,]+(?:\\.\\d+)?)\\s*(k)?";

  let working = original;
  let minPrice = null;
  let maxPrice = null;

  const setMin = (value) => {
    if (value == null) return;
    minPrice = minPrice == null ? value : Math.max(minPrice, value);
  };
  const setMax = (value) => {
    if (value == null) return;
    maxPrice = maxPrice == null ? value : Math.min(maxPrice, value);
  };

  // between / from X to Y (most specific — run first)
  const betweenRe = new RegExp(
    `\\b(?:between|from)\\s+${currency}${amount}\\s*(?:and|to|-)\\s*${currency}${amount}\\b`,
    "gi"
  );
  working = working.replace(betweenRe, (_m, n1, k1, n2, k2) => {
    const a = parseAmount(n1, k1);
    const b = parseAmount(n2, k2);
    if (a != null && b != null) {
      setMin(Math.min(a, b));
      setMax(Math.max(a, b));
    }
    return " ";
  });

  // under / below / less than / upto / budget …
  const underRe = new RegExp(
    `\\b(?:under|below|low|less\\s+than|upto|up\\s+to|within|max(?:imum)?|cheaper\\s+than|budget(?:\\s+of)?)\\s+${currency}${amount}\\b`,
    "gi"
  );
  working = working.replace(underRe, (_m, n, k) => {
    setMax(parseAmount(n, k));
    return " ";
  });

  // "15000 under" / "15k below" / "rs 15000 or less"
  const postfixUnderRe = new RegExp(
    `\\b${currency}${amount}\\s*(?:and\\s+)?(?:under|below|low|or\\s+less)\\b`,
    "gi"
  );
  working = working.replace(postfixUnderRe, (_m, n, k) => {
    setMax(parseAmount(n, k));
    return " ";
  });

  // "<15000" / "<= 15,000"
  const ltRe = new RegExp(`(?:<=|<)\\s*${currency}${amount}\\b`, "gi");
  working = working.replace(ltRe, (_m, n, k) => {
    setMax(parseAmount(n, k));
    return " ";
  });

  // above / over / more than / starting from …
  const aboveRe = new RegExp(
    `\\b(?:above|over|high|more\\s+than|greater\\s+than|from|min(?:imum)?|starting\\s+(?:from|at)|at\\s+least)\\s+${currency}${amount}\\b`,
    "gi"
  );
  working = working.replace(aboveRe, (_m, n, k) => {
    setMin(parseAmount(n, k));
    return " ";
  });

  // "10000 above" / "10k or more"
  const postfixAboveRe = new RegExp(
    `\\b${currency}${amount}\\s*(?:and\\s+)?(?:above|over|high|or\\s+more)\\b`,
    "gi"
  );
  working = working.replace(postfixAboveRe, (_m, n, k) => {
    setMin(parseAmount(n, k));
    return " ";
  });

  // ">10000" / ">= 10k"
  const gtRe = new RegExp(`(?:>=|>)\\s*${currency}${amount}\\b`, "gi");
  working = working.replace(gtRe, (_m, n, k) => {
    setMin(parseAmount(n, k));
    return " ";
  });

  const hasPriceIntent = minPrice != null || maxPrice != null;

  let cleanedQuery = working.replace(/\s+/g, " ").trim();
  if (hasPriceIntent) {
    cleanedQuery = cleanedQuery
      .replace(/\b(?:rs\.?|inr|rupees?)\b/gi, " ")
      .replace(/[₹]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const tmp = minPrice;
    minPrice = maxPrice;
    maxPrice = tmp;
  }

  return {
    cleanedQuery,
    minPrice,
    maxPrice,
    hasPriceIntent,
  };
}

/**
 * Expand a free-text query into synonym + plural/singular variants.
 * Examples:
 *   "phones" → phones, phone, mobile, mobiles, smartphone, ...
 *   "laptops" → laptops, laptop, notebook, notebooks, ...
 *   "mobile phones" → mobile phones, mobiles, phones, smartphones, ...
 */
export function expandSearchTerms(query) {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const terms = new Set([q]);

  // Exact full-query synonym / legacy map hit
  addSynonymGroupTerms(terms, q);
  if (QUERY_SYNONYMS[q]) {
    for (const syn of QUERY_SYNONYMS[q]) terms.add(syn);
  }

  // Plural ↔ singular for the full query when it is a single token
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    for (const variant of getWordVariants(tokens[0])) {
      terms.add(variant);
      addSynonymGroupTerms(terms, variant);
    }
  } else {
    // Multi-word: expand each token, rebuild phrases, and add group terms
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const variants = getWordVariants(token);
      for (const variant of variants) {
        const rebuilt = tokens.map((t, idx) => (idx === i ? variant : t)).join(" ");
        terms.add(rebuilt);
        addSynonymGroupTerms(terms, variant);
        addSynonymGroupTerms(terms, rebuilt);
      }
    }

    // Also try 2-token sliding windows (e.g. "cell phones", "air conditioner")
    for (let i = 0; i < tokens.length - 1; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      addSynonymGroupTerms(terms, phrase);
      for (const left of getWordVariants(tokens[i])) {
        for (const right of getWordVariants(tokens[i + 1])) {
          addSynonymGroupTerms(terms, `${left} ${right}`);
        }
      }
    }
  }

  // Cap expansion so Mongo $or stays bounded
  const MAX_TERMS = 24;
  return [...terms].slice(0, MAX_TERMS);
}

function pushLooseTerm(conditions, cleanTerm) {
  const tokens = cleanTerm
    .replace(/[()[\]{}<>,;:'"!?\\/]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const safeWhole = escapeRegExp(cleanTerm);
  if (!safeWhole) return;
  const wholeRegex = new RegExp(safeWhole, "i");

  if (tokens.length > 1) {
    // Multi-word query (e.g. "iphone 15"):
    // Streamline to primary fields (name, search_keywords) to avoid catastrophic COLLSCAN
    const tokenAnds = tokens.map((token) => {
      const safeToken = escapeRegExp(token);
      const tokenRegex = new RegExp(safeToken, "i");
      return {
        $or: [
          { name: tokenRegex },
          { search_keywords: tokenRegex },
        ],
      };
    });

    conditions.push(
      { name: wholeRegex },
      { search_keywords: wholeRegex },
      { $and: tokenAnds }
    );
    return;
  }

  // Single word query (e.g. "iphone"):
  conditions.push(
    { name: wholeRegex },
    { search_keywords: wholeRegex },
    { item_code: wholeRegex },
    { model_number: wholeRegex },
    { sub_category_new_name: new RegExp(`^${safeWhole}`, "i") }
  );
}

function pushPrefixTerm(conditions, cleanTerm) {
  const safeWhole = escapeRegExp(cleanTerm);
  if (!safeWhole || safeWhole.length < 2) return;
  const prefixRe = new RegExp(`^${safeWhole}`, "i");
  conditions.push(
    { name: prefixRe },
    { sub_category_new_name: prefixRe }
  );
}

function buildTextOrConditions(query, brands = []) {
  try {
    const terms = expandSearchTerms(query);
    if (!Array.isArray(terms) || terms.length === 0) return [];

    const conditions = [];
    const original = normalizeSearchText(query);
    const originalTokens = original.split(/\s+/).filter(Boolean);
    const singleWord = originalTokens.length === 1;

    if (singleWord) {
      // Same match as the suggestion dropdown: the typed word via prefix fields
      // and one text search, plus up to 8 synonym prefixes. A loose "contains"
      // match on headset / headphone / tws is what added the extra page rows.
      const safeQ = escapeRegExp(original);
      if (safeQ) {
        const prefixRe = new RegExp(`^${safeQ}`, "i");
        conditions.push(
          { name: prefixRe },
          { item_code: prefixRe },
          { model_number: prefixRe },
          { sub_category_new_name: prefixRe }
        );
        if (original.length >= 2) {
          conditions.push({ $text: { $search: original } });
        }
      }
      const synonymTerms = [];
      const seenSyn = new Set();
      for (const term of terms) {
        const norm = normalizeSearchText(term);
        if (!norm || norm === original || seenSyn.has(norm)) continue;
        seenSyn.add(norm);
        synonymTerms.push(norm);
        if (synonymTerms.length >= 8) break;
      }
      for (const term of synonymTerms) pushPrefixTerm(conditions, term);
    } else {
      for (const term of terms) {
        if (!term || typeof term !== "string") continue;
        const cleanTerm = term.replace(/\+/g, " ").trim();
        if (!cleanTerm) continue;
        pushLooseTerm(conditions, cleanTerm);
      }
    }

    const brandTerms = singleWord ? [original] : terms;

    if (Array.isArray(brands) && brands.length > 0) {
      const matchedBrandIds = [];
      for (const term of brandTerms) {
        const termLower = normalizeSearchText(term);
        if (!termLower || termLower.length < 2) continue;
        for (const b of brands) {
          const bName = (b?.brand_name || "").toLowerCase().trim();
          if (
            bName &&
            (bName === termLower ||
              (termLower.length >= 3 && bName.startsWith(termLower)) ||
              (bName.length >= 4 && termLower.startsWith(bName)))
          ) {
            if (b._id) matchedBrandIds.push(String(b._id));
          }
        }
      }
      const uniqueBrandIds = [...new Set(matchedBrandIds.filter(Boolean))];
      if (uniqueBrandIds.length > 0) {
        conditions.push({ brand: { $in: uniqueBrandIds } });
      }
    }

    return conditions.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  } catch (err) {
    console.error("buildTextOrConditions error:", err);
    return [];
  }
}

export function detectBrandQuery(query, brands = []) {
  const q = normalizeSearchText(query);
  if (!q || !Array.isArray(brands) || brands.length === 0) return null;

  const activeBrands = brands
    .filter((b) => b?.brand_name && (!b.status || b.status === "Active"))
    .map((b) => ({
      id: String(b._id),
      name: normalizeSearchText(b.brand_name),
      rawName: b.brand_name,
    }))
    .sort((a, b) => b.name.length - a.name.length);

  for (const brand of activeBrands) {
    if (q === brand.name) {
      return { brandId: brand.id, brandName: brand.rawName, mode: "exact" };
    }
    if (q.startsWith(`${brand.name} `)) {
      const productQuery = q.slice(brand.name.length).trim();
      if (productQuery) {
        return {
          brandId: brand.id,
          brandName: brand.rawName,
          mode: "brand_product",
          productQuery,
        };
      }
    }
  }

  return null;
}

/** Build MongoDB $or field conditions for product text search */
export function buildSearchOrConditions(query, brands = []) {
  try {
    const brandMatch = detectBrandQuery(query, brands);

    if (brandMatch?.mode === "exact") {
      return [{ brand: brandMatch.brandId }];
    }

    if (brandMatch?.mode === "brand_product") {
      return buildTextOrConditions(brandMatch.productQuery, brands);
    }

    return buildTextOrConditions(query, brands);
  } catch (err) {
    console.error("buildSearchOrConditions error:", err);
    return [];
  }
}

/** Extra AND filters when user typed full brand + product phrase */
export function getBrandSearchConstraints(query, brands = []) {
  const brandMatch = detectBrandQuery(query, brands);
  if (!brandMatch) return null;

  if (brandMatch.mode === "exact") {
    return { brandId: brandMatch.brandId, mode: "exact" };
  }

  if (brandMatch.mode === "brand_product") {
    return {
      brandId: brandMatch.brandId,
      mode: "brand_product",
      productQuery: brandMatch.productQuery,
    };
  }

  return null;
}

function hasStrictTokenMatch(text, q) {
  if (!text || !q) return false;
  const escaped = escapeRegExp(q);
  const tokenRe = new RegExp(
    `(^|[\\s\\-/,_(])${escaped}($|[\\s\\-/,_.)])`,
    "i"
  );
  if (tokenRe.test(text)) return true;
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function isPrefixInsideWord(text, q) {
  const lower = (text || "").toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return false;
  const after = lower[idx + q.length];
  if (!after) return false;
  return /[a-z0-9]/i.test(after);
}

function scoreSingleTerm(product, term, strictShort) {
  if (!product || !term) return 0;
  try {
    const name = String(product.name || "").toLowerCase();
    const code = String(product.item_code || "").toLowerCase();
    const keywords = String(product.search_keywords || "").toLowerCase();
    const subCat = String(product.sub_category_new_name || "").toLowerCase();
    const model = String(product.model_number || "").toLowerCase();
    const termLower = String(term).replace(/\+/g, " ").toLowerCase();

    let score = 0;

    if (termLower.includes(" ")) {
      if (name.includes(termLower)) return 95;
      if (keywords.includes(termLower)) return 90;
      if (subCat.includes(termLower)) return 85;

      // Multi-token fallback: check if all or most tokens match across product fields
      const tokens = termLower
        .replace(/[()[\]{}<>,;:'"!?\\/]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      if (tokens.length > 1) {
        const fullText = `${name} ${code} ${keywords} ${subCat} ${model}`;
        const allTokensMatch = tokens.every((token) => {
          return (
            hasStrictTokenMatch(name, token) ||
            hasStrictTokenMatch(code, token) ||
            hasStrictTokenMatch(keywords, token) ||
            hasStrictTokenMatch(subCat, token) ||
            hasStrictTokenMatch(model, token) ||
            fullText.includes(token)
          );
        });

        if (allTokensMatch) {
          return 88;
        }

        // Partial keyword matches (e.g. 3 of 4 tokens match)
        const matchedTokensCount = tokens.filter((token) => fullText.includes(token)).length;
        if (tokens.length >= 3 && matchedTokensCount / tokens.length >= 0.7) {
          return 60;
        }
      }
      return score;
    }

    if (name === termLower) score = 100;
    else if (hasStrictTokenMatch(name, termLower)) score = 88;
    else if (code === termLower) score = 78;
    else if (code.startsWith(termLower)) score = strictShort ? 15 : 42;
    else if (keywords && hasStrictTokenMatch(keywords, termLower)) score = 72;
    else if (subCat && hasStrictTokenMatch(subCat, termLower)) score = 70;
    else if (model && (model === termLower || model.startsWith(termLower))) score = 65;
    else if (name.includes(termLower)) score = 28;
    else if (subCat.includes(termLower)) score = 25;

    if (score === 0) return 0;

    if (strictShort) {
      const strict =
        hasStrictTokenMatch(name, termLower) ||
        hasStrictTokenMatch(code, termLower) ||
        hasStrictTokenMatch(keywords, termLower) ||
        hasStrictTokenMatch(subCat, termLower);

      if (!strict) {
        if (isPrefixInsideWord(name, termLower)) return 0;
        if (name.includes(termLower) && !hasStrictTokenMatch(name, termLower)) {
          return 0;
        }
      }
    }

    return score;
  } catch (err) {
    console.error("scoreSingleTerm error:", err);
    return 0;
  }
}

function getProductBrandId(product) {
  if (!product) return "";
  return String(product.brand || product.brand_id || "");
}

function applyBrandBoost(product, query, brands, skipBrandDetection) {
  if (!product || skipBrandDetection || !brands?.length) return 0;

  const brandMatch = detectBrandQuery(query, brands);
  if (brandMatch) {
    const productBrandId = getProductBrandId(product);
    if (productBrandId === brandMatch.brandId) {
      if (brandMatch.mode === "exact") return 120;
      const productScore = scoreProductMatch(product, brandMatch.productQuery, {
        brands: [],
        skipBrandDetection: true,
      });
      return productScore > 0 ? 118 + productScore : 108;
    }
  }

  // Support partial brand prefix boost (e.g., "sam" -> Samsung, "viv" -> Vivo)
  const q = normalizeSearchText(query);
  if (q.length >= 2) {
    const matchedBrand = brands.find((b) => {
      const bName = normalizeSearchText(b?.brand_name);
      return bName && (bName.startsWith(q) || q.startsWith(bName));
    });
    if (matchedBrand && getProductBrandId(product) === String(matchedBrand._id)) {
      return 75;
    }
  }

  return 0;
}

/**
 * Score how well a product matches a search query.
 * Higher score = better match. Returns 0 when product should be excluded.
 */
export function scoreProductMatch(product, query, options = {}) {
  try {
    if (!product || !query) return 0;
    const { brands = [], skipBrandDetection = false } = options;
    const q = normalizeSearchText(query);
    if (!q) return 0;

    const brandMatch = !skipBrandDetection ? detectBrandQuery(query, brands) : null;
    const textQuery =
      brandMatch?.mode === "brand_product" ? brandMatch.productQuery : query;

    const terms = expandSearchTerms(textQuery);
    const isShort = normalizeSearchText(textQuery).length <= 2;
    let best = 0;

    for (const term of terms) {
      const termScore = scoreSingleTerm(product, term, isShort && term === normalizeSearchText(textQuery));
      if (term !== normalizeSearchText(textQuery) && termScore > 0) {
        best = Math.max(best, termScore + (isShort ? 25 : 8));
      } else {
        best = Math.max(best, termScore);
      }
    }

    if (normalizeSearchText(textQuery) === "ac") {
      const subName = (product.sub_category_new_name || "").toLowerCase();
      const catName = (product.category_new || "").toLowerCase();
      const keywords = (product.search_keywords || "").toLowerCase();
      if (
        subName.includes("air condition") ||
        catName.includes("air condition") ||
        keywords.includes("air condition")
      ) {
        best = Math.max(best, 110);
      }
    }

    const brandBoost = applyBrandBoost(product, query, brands, skipBrandDetection);
    best = Math.max(best, brandBoost);

    if (brandMatch?.mode === "exact" && brandBoost === 0) {
      return 0;
    }

    if (brandMatch?.mode === "brand_product" && brandBoost === 0) {
      return 0;
    }

    return best;
  } catch (err) {
    console.error("scoreProductMatch calculation error:", err);
    return 0;
  }
}

export function filterAndRankProducts(products, query, limit = 12, options = {}) {
  if (!Array.isArray(products) || !query?.trim()) return [];

  return products
    .map((product) => ({
      product,
      score: scoreProductMatch(product, query, options),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product);
}
