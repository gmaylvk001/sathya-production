import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import { NextResponse } from "next/server";
import { getActiveBrandsForSearch } from "@/lib/brandSearch";
import {
  escapeRegExp,
  expandSearchTerms,
  parseSearchPriceIntent,
} from "@/lib/searchMatch";
import { applyRegionPrices, readRequestRegion } from "@/lib/priceResolver";

export const runtime = "nodejs";

function sanitizeInput(str = "") {
  return str.replace(/[^\w\s\-/+().,&]/gi, "").trim();
}

// In-process LRU cache for identical queries within 30s TTL
const suggestionsCache = new Map();
const CACHE_TTL_MS = 30 * 1000;
const MAX_CACHE_ENTRIES = 500;

function getCached(key) {
  const entry = suggestionsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    suggestionsCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (suggestionsCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = suggestionsCache.keys().next().value;
    if (firstKey) suggestionsCache.delete(firstKey);
  }
  suggestionsCache.set(key, { ts: Date.now(), data });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("q") || "").trim().slice(0, 100);
    const rawCategory = (searchParams.get("category") || "").trim().slice(0, 100);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit"), 10) || 8));
    const region = readRequestRegion(req);

    const priceIntent = parseSearchPriceIntent(rawQuery);
    const q = sanitizeInput(
      priceIntent.hasPriceIntent ? priceIntent.cleanedQuery : rawQuery
    ).replace(/\s+/g, " ");
    const category = rawCategory;
    const hasTextQuery = q.length >= 2;

    // Minimum 2 characters unless the query is only a price range.
    if (!hasTextQuery && !priceIntent.hasPriceIntent) {
      return NextResponse.json({
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    const cacheKey = `${region}|${q.toLowerCase()}|${category.toLowerCase()}|${priceIntent.minPrice ?? ""}|${priceIntent.maxPrice ?? ""}|p${page}|l${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
      });
    }

    await dbConnect();

    let qLower = "";
    let isShort = false;
    let escapedQ = "";
    let tokens = [];
    let brandId = null;
    let orConditions = null;
    let expandedTerms = [];

    if (hasTextQuery) {
    const brands = await getActiveBrandsForSearch();

    qLower = q.toLowerCase();
    isShort = q.length <= 2;
    escapedQ = escapeRegExp(q);
    tokens = qLower.split(/\s+/).filter(Boolean);

    // Detect matched brand
    const matchedBrand = (brands || []).find((b) => {
      const bName = (b?.brand_name || "").toLowerCase().trim();
      return (
        bName &&
        (bName === qLower ||
          qLower.startsWith(`${bName} `) ||
          (qLower.length >= 3 && bName.startsWith(qLower)) ||
          (bName.length >= 4 && qLower.startsWith(bName)))
      );
    });
    brandId = matchedBrand ? String(matchedBrand._id) : null;

    // Build database search conditions using indexed fields:
    // 1. Prefix regexes on indexed fields (name, item_code, model_number, sub_category_new_name)
    // 2. Matched brand lookup using indexed status_1_brand_1
    // 3. Text search using product_search_text_idx
    // 4. Synonym / plural expansions (phones → mobile, laptops → laptop, …)
    orConditions = [
      { status: "Active", name: new RegExp(`^${escapedQ}`, "i") },
      { status: "Active", item_code: new RegExp(`^${escapedQ}`, "i") },
      { status: "Active", model_number: new RegExp(`^${escapedQ}`, "i") },
      { status: "Active", sub_category_new_name: new RegExp(`^${escapedQ}`, "i") },
    ];

    if (brandId) {
      orConditions.push({ status: "Active", brand: brandId });
    }

    // MongoDB enforces AT MOST ONE $text expression per query
    const cleanSearchText = qLower.replace(/["']/g, " ").replace(/\s+/g, " ").trim();
    const cleanTokens = cleanSearchText.split(/\s+/).filter(Boolean);
    if (cleanTokens.length > 1) {
      orConditions.push({
        status: "Active",
        $text: { $search: `"${cleanTokens.join(" ")}" ${cleanSearchText}` },
      });
    } else if (cleanSearchText.length >= 2) {
      orConditions.push({ status: "Active", $text: { $search: cleanSearchText } });
    }

    expandedTerms = expandSearchTerms(q).filter(
      (term) => term && term.toLowerCase() !== qLower
    );
    // Prefix-only on indexed fields. Unanchored regex in the same $or as $text
    // makes Mongo reject the query, which is why "mobiles" / "mobile" showed an error.
    for (const term of expandedTerms.slice(0, 8)) {
      const safe = escapeRegExp(term);
      if (!safe || safe.length < 2) continue;
      const prefixRe = new RegExp(`^${safe}`, "i");
      orConditions.push(
        { status: "Active", name: prefixRe },
        { status: "Active", sub_category_new_name: prefixRe }
      );
    }
    }

    // Category filter mapping & exclude gift products
    const nonGiftCondition = {
      product_type: { $nin: ["gift", "Gift", "GIFT"] },
      movement: { $not: /gift/i },
    };
    const matchFilter = hasTextQuery
      ? { $and: [{ $or: orConditions }, nonGiftCondition] }
      : { $and: [{ status: "Active" }, nonGiftCondition] };
    const catLower = category.toLowerCase().trim();
    if (category && catLower !== "all category" && catLower !== "all categories") {
      const categoryDoc = await Category.findOne({
        category_name: { $regex: new RegExp(`^${escapeRegExp(category)}$`, "i") },
        status: "Active",
      }).select("_id md5_cat_name category_name");

      // Always include the selected category + all child categories (same as results page),
      // so "Mobiles & Wearables" still returns products filed under child "Mobile".
      if (categoryDoc?._id) {
        const collectChildren = async (parentId) => {
          const children = await Category.find({ parentid: parentId })
            .select("_id md5_cat_name")
            .lean();
          const docs = [];
          for (const child of children) {
            docs.push(child);
            docs.push(...(await collectChildren(child._id)));
          }
          return docs;
        };
        const allDocs = [categoryDoc, ...(await collectChildren(categoryDoc._id))];
        const idStrings = [];
        const md5s = [];
        const seen = new Set();
        for (const doc of allDocs) {
          const id = String(doc._id);
          if (!seen.has(id)) {
            seen.add(id);
            idStrings.push(id);
          }
          if (doc.md5_cat_name) md5s.push(doc.md5_cat_name);
        }
        const categoryOr = [
          { category: { $in: idStrings } },
          { sub_category: { $in: idStrings } },
        ];
        for (const md5 of [...new Set(md5s)]) {
          categoryOr.push({
            sub_category_new: { $regex: escapeRegExp(md5), $options: "i" },
          });
        }
        matchFilter.$and.push({ $or: categoryOr });
      } else {
        matchFilter.$and.push({
          sub_category_new_name: {
            $regex: escapeRegExp(category),
            $options: "i",
          },
        });
      }
    }

    if (priceIntent.hasPriceIntent) {
      const min = priceIntent.minPrice != null ? priceIntent.minPrice : 0;
      const max = priceIntent.maxPrice != null ? priceIntent.maxPrice : 1000000;
      matchFilter.$and.push({
        $or: [
          {
            $and: [
              { special_price: { $exists: true } },
              { special_price: { $ne: null } },
              { special_price: { $ne: 0 } },
              { special_price: { $gte: min, $lte: max } },
            ],
          },
          {
            $and: [
              { $or: [{ special_price: { $exists: false } }, { special_price: null }, { special_price: 0 }] },
              { price: { $gte: min, $lte: max } },
            ],
          },
        ],
      });
    }

    // Token relevance boosts
    const tokenScoreAdditions = tokens.map((t) => {
      const escT = escapeRegExp(t);
      return {
        $cond: [
          {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: `(^|[\\s\\-/,_(])${escT}`,
              options: "i",
            },
          },
          25,
          0,
        ],
      };
    });

    const skip = (page - 1) * limit;

    // Production single-roundtrip aggregation pipeline with relevance ranking and pagination
    const textPipeline = [
      { $match: matchFilter },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Exact name match
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $ifNull: ["$name", ""] },
                      regex: `^${escapedQ}$`,
                      options: "i",
                    },
                  },
                  100,
                  0,
                ],
              },
              // Prefix name match
              {
                $cond: [
                  isShort
                    ? {
                      $regexMatch: {
                        input: { $ifNull: ["$name", ""] },
                        regex: `^${escapedQ}([\\s\\-/,_.)]|$)`,
                        options: "i",
                      },
                    }
                    : {
                      $regexMatch: {
                        input: { $ifNull: ["$name", ""] },
                        regex: `^${escapedQ}`,
                        options: "i",
                      },
                    },
                  50,
                  0,
                ],
              },
              // Word boundary token match in name
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $ifNull: ["$name", ""] },
                      regex: `(^|[\\s\\-/,_(])${escapedQ}([\\s\\-/,_.)]|$)`,
                      options: "i",
                    },
                  },
                  40,
                  0,
                ],
              },
              // Matched Brand boost
              { $cond: [brandId ? { $eq: ["$brand", brandId] } : false, 45, 0] },
              // Subcategory name match boost
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $ifNull: ["$sub_category_new_name", ""] },
                      regex: escapedQ,
                      options: "i",
                    },
                  },
                  30,
                  0,
                ],
              },
              // Synonym / plural category boosts (phones → mobile, laptops → laptop, ac → air condition, …)
              ...(expandedTerms || []).slice(0, 8).map((term) => {
                const safeTerm = escapeRegExp(term);
                if (!safeTerm) return 0;
                return {
                  $cond: [
                    {
                      $or: [
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$name", ""] },
                            regex: safeTerm,
                            options: "i",
                          },
                        },
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$sub_category_new_name", ""] },
                            regex: safeTerm,
                            options: "i",
                          },
                        },
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$search_keywords", ""] },
                            regex: safeTerm,
                            options: "i",
                          },
                        },
                      ],
                    },
                    35,
                    0,
                  ],
                };
              }),
              // Token matches
              ...tokenScoreAdditions,
            ],
          },
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          items: [
            { $sort: { relevanceScore: -1, createdAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                price: 1,
                special_price: 1,
                images: 1,
                brand: 1,
                sub_category_new_name: 1,
                item_code: 1,
                model_number: 1,
                relevanceScore: 1,
              },
            },
          ],
        },
      },
    ];

    const pipeline = hasTextQuery
      ? textPipeline
      : [
          { $match: matchFilter },
          {
            $facet: {
              totalCount: [{ $count: "count" }],
              items: [
                { $sort: { createdAt: -1, _id: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    slug: 1,
                    price: 1,
                    special_price: 1,
                    images: 1,
                    brand: 1,
                    sub_category_new_name: 1,
                    item_code: 1,
                    model_number: 1,
                  },
                },
              ],
            },
          },
        ];

    const [aggResult] = await Product.aggregate(pipeline);
    const total = aggResult?.totalCount?.[0]?.count || 0;
    const items = aggResult?.items || [];
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    const pricedItems = await applyRegionPrices(items, region);
    const responsePayload = {
      success: true,
      results: pricedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };

    setCache(cacheKey, responsePayload);

    return NextResponse.json(responsePayload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch search suggestions",
        results: [],
        pagination: { page: 1, limit: 8, total: 0, totalPages: 0, hasMore: false },
      },
      { status: 500 }
    );
  }
}
