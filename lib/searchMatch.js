export function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Common abbreviations → full product terms */
const QUERY_SYNONYMS = {
  ac: [
    "air conditioner",
    "air conditioners",
    "a/c",
    "split ac",
    "window ac",
    "inverter ac",
  ],
};

export function normalizeSearchText(value = "") {
  return (value || "")
    .replace(/\+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function expandSearchTerms(query) {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const terms = [q];
  if (QUERY_SYNONYMS[q]) {
    terms.push(...QUERY_SYNONYMS[q]);
  }
  return [...new Set(terms)];
}

function buildTextOrConditions(query, brands = []) {
  try {
    const terms = expandSearchTerms(query);
    if (!Array.isArray(terms) || terms.length === 0) return [];

    const conditions = [];

    for (const term of terms) {
      if (!term || typeof term !== "string") continue;
      const cleanTerm = term.replace(/\+/g, " ").trim();
      if (!cleanTerm) continue;

      const tokens = cleanTerm
        .replace(/[()[\]{}<>,;:'"!?\\/]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const safeWhole = escapeRegExp(cleanTerm);
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
      } else {
        // Single word query (e.g. "iphone"):
        conditions.push(
          { name: wholeRegex },
          { search_keywords: wholeRegex },
          { item_code: wholeRegex },
          { model_number: wholeRegex }
        );
      }
    }

    if (Array.isArray(brands) && brands.length > 0) {
      const matchedBrandIds = [];
      for (const term of terms) {
        const termLower = (term || "").replace(/\+/g, " ").toLowerCase().trim();
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
