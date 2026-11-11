import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import CategoryPage from "@/models/categoryPage";

function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreProduct(product, q) {
  const query = String(q || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  const itemCode = String(product.item_code || "").toLowerCase();
  const model = String(product.model_number || "").toLowerCase();
  const keywords = String(product.search_keywords || "").toLowerCase();

  if (name === query) return 100;
  if (name.startsWith(query)) return 90;
  if (itemCode === query || model === query) return 85;
  if (name.includes(` ${query}`) || name.includes(`${query} `)) return 75;
  if (name.includes(query)) return 60;
  if (itemCode.includes(query) || model.includes(query)) return 50;
  if (keywords.includes(query)) return 40;
  return 10;
}

async function collectCategoryTree(rootId) {
  let root = null;

  if (mongoose.Types.ObjectId.isValid(rootId)) {
    root = await Category.findById(rootId)
      .select("_id md5_cat_name category_name category_slug parentid")
      .lean();
  }

  if (!root && mongoose.Types.ObjectId.isValid(rootId)) {
    try {
      const page = await CategoryPage.findById(rootId).lean();
      if (page) {
        if (page.categoryId && mongoose.Types.ObjectId.isValid(page.categoryId)) {
          root = await Category.findById(page.categoryId)
            .select("_id md5_cat_name category_name category_slug parentid")
            .lean();
        }
        if (!root && page.categorySlug) {
          root = await Category.findOne({ category_slug: page.categorySlug })
            .select("_id md5_cat_name category_name category_slug parentid")
            .lean();
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!root) {
    root = await Category.findOne({
      $or: [
        { category_slug: String(rootId) },
        { md5_cat_name: String(rootId) },
        { category_name: new RegExp(`^${escapeRegExp(String(rootId))}$`, "i") },
      ],
    })
      .select("_id md5_cat_name category_name category_slug parentid")
      .lean();
  }

  if (!root) return [];

  const tree = [root];
  const queue = [root];
  const seen = new Set([String(root._id)]);

  while (queue.length) {
    const parent = queue.shift();
    const parentIdStr = String(parent._id);
    const parentConditions = [
      { parentid: parentIdStr },
      ...(parent.md5_cat_name ? [{ parentid: parent.md5_cat_name }] : []),
      ...(parent.category_slug ? [{ parentid: parent.category_slug }] : []),
    ];
    if (mongoose.Types.ObjectId.isValid(parentIdStr)) {
      parentConditions.push({ parentid: new mongoose.Types.ObjectId(parentIdStr) });
    }

    const children = await Category.find({ $or: parentConditions })
      .select("_id md5_cat_name category_name category_slug parentid")
      .lean();

    for (const child of children) {
      const id = String(child._id);
      if (seen.has(id)) continue;
      seen.add(id);
      tree.push(child);
      queue.push(child);
    }
  }

  return tree;
}

/**
 * GET /api/category-product-carousel/search?categoryId=&q=
 * Search Active products within the category tree (with flexible fallback).
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const childCategoryId = searchParams.get("childCategoryId");
    const movement = searchParams.get("movement");
    const q = (searchParams.get("q") || "").trim();
    const ownerType = searchParams.get("ownerType") || "category";
    const brandIdParam = searchParams.get("brandId");

    // The most specific category selected
    const targetCategory =
      childCategoryId ||
      subCategoryId ||
      (categoryId && categoryId !== "all" ? categoryId : null);

    console.log("[SEARCH API]", {
      categoryId,
      subCategoryId,
      childCategoryId,
      movement,
      q,
      ownerType,
      brandIdParam,
      targetCategory
    });

    // If no query and no filters provided, return empty
    if (!q && !targetCategory && !movement && ownerType !== "brand") {
      return NextResponse.json({ success: true, products: [] });
    }

    const filters = [];

    // 1. Text Search Filter (optional)
    if (q.length > 0) {
      const terms = q.split(/\s+/).filter(Boolean);
      const termConditions = terms.map((term) => {
        const rx = new RegExp(escapeRegExp(term), "i");
        return {
          $or: [
            { name: rx },
            { item_code: rx },
            { model_number: rx },
            { search_keywords: rx },
            { sub_category_new_name: rx },
            { brand: rx },
            { slug: rx },
          ],
        };
      });
      filters.push(
        termConditions.length === 1
          ? termConditions[0]
          : { $and: termConditions }
      );
    }

    // 2. Movement Filter (optional)
    if (movement && movement !== "all") {
      if (movement.toUpperCase() === "FAST") {
        filters.push({ movement: { $regex: /^fast|^focus/i } });
      } else {
        filters.push({
          movement: { $regex: new RegExp(`^${escapeRegExp(movement)}$`, "i") },
        });
      }
    }

    // 3. Brand Handling (independent of category)
    let brandCondition = null;
    if (ownerType === "brand" || (ownerType === "category_brand" && brandIdParam)) {
      let brand = null;
      const brandKey = brandIdParam || (ownerType === "brand" ? categoryId : null);
      if (brandKey) {
        if (mongoose.Types.ObjectId.isValid(brandKey)) {
          brand = await Brand.findById(brandKey)
            .select("brand_name _id")
            .lean();
        }
        if (!brand) {
          brand = await Brand.findOne({
            $or: [
              { brand_slug: brandKey },
              { brand_name: new RegExp(`^${escapeRegExp(brandKey)}$`, "i") },
            ],
          })
            .select("brand_name _id")
            .lean();
        }
      }
      if (brand) {
        const brandName = String(brand.brand_name || "").trim();
        brandCondition = {
          $or: [
            { brand: brandName },
            { brand: new RegExp(`^${escapeRegExp(brandName)}$`, "i") },
            { brand: String(brand._id) },
          ],
        };
        filters.push(brandCondition);
      }
    }

    // 4. Category Tree Match
    let catTree = [];
    let catNamesList = [];
    if (targetCategory && targetCategory !== "all") {
      catTree = await collectCategoryTree(targetCategory);
      if (catTree.length > 0) {
        const catIds = catTree.map((c) => String(c._id));
        const catObjectIds = catIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        const catNames = catTree
          .map((c) => String(c.category_name || "").trim())
          .filter(Boolean);
        catNamesList = catNames;
        const catSlugs = catTree
          .map((c) => String(c.category_slug || "").trim())
          .filter(Boolean);
        const md5List = catTree
          .map((c) => String(c.md5_cat_name || "").trim())
          .filter(Boolean);

        const nameRegexes = catNames.map(
          (n) => new RegExp(`^${escapeRegExp(n)}$`, "i")
        );
        const slugRegexes = catSlugs.map(
          (s) => new RegExp(`^${escapeRegExp(s)}$`, "i")
        );
        const md5Regex =
          md5List.length > 0
            ? new RegExp(md5List.map(escapeRegExp).join("|"), "i")
            : null;

        // Flexible token regex for ## delimited category strings (e.g. "TV & Audio##Speakers##Sound Bars")
        const tokenRegexes = catNames.map((n) => {
          const base = n.replace(/s$/i, "").trim();
          return new RegExp(`(?:^|##)\\s*${escapeRegExp(base)}s?\\s*(?:##|$)`, "i");
        });

        filters.push({
          $or: [
            { category: { $in: [...catIds, ...catObjectIds, ...catNames, ...catSlugs] } },
            { sub_category: { $in: [...catIds, ...catObjectIds, ...catNames, ...catSlugs] } },
            { child_category: { $in: [...catIds, ...catObjectIds, ...catNames, ...catSlugs] } },
            ...(nameRegexes.length ? [{ category: { $in: nameRegexes } }] : []),
            ...(nameRegexes.length ? [{ sub_category: { $in: nameRegexes } }] : []),
            ...(nameRegexes.length ? [{ child_category: { $in: nameRegexes } }] : []),
            ...(slugRegexes.length ? [{ category: { $in: slugRegexes } }] : []),
            ...(slugRegexes.length ? [{ sub_category: { $in: slugRegexes } }] : []),
            ...(slugRegexes.length ? [{ child_category: { $in: slugRegexes } }] : []),
            ...(tokenRegexes.length ? [{ sub_category_new_name: { $in: tokenRegexes } }] : []),
            ...(md5List.length ? [{ category_new: { $in: md5List } }] : []),
            ...(md5Regex ? [{ sub_category_new: md5Regex }] : []),
          ],
        });
      }
    }

    const activeStatusCondition = {
      $or: [
        { status: "Active" },
        { status: "active" },
        { status: { $regex: /^active$/i } },
        { status: { $exists: false } },
        { status: null },
      ],
    };

    const queryObj = {
      ...activeStatusCondition,
      ...(filters.length > 0 ? { $and: filters } : {}),
    };

    let products = await Product.find(queryObj)
      .select(
        "name slug images price special_price model_number item_code movement stock_status quantity brand search_keywords category sub_category sub_category_new_name createdAt"
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(60)
      .lean();

    // FALLBACK 1: If 0 products found, but a child category was selected,
    // fallback to subcategory or category level if available
    if (products.length === 0 && childCategoryId && (subCategoryId || categoryId)) {
      console.log("[SEARCH API] 0 products in child category, falling back to parent category tree...");
      const parentTree = await collectCategoryTree(subCategoryId || categoryId);
      if (parentTree.length > 0) {
        const pIds = parentTree.map((c) => String(c._id));
        const pNames = parentTree.map((c) => String(c.category_name || "").trim()).filter(Boolean);
        const pTokens = pNames.map((n) => {
          const base = n.replace(/s$/i, "").trim();
          return new RegExp(`(?:^|##)\\s*${escapeRegExp(base)}s?\\s*(?:##|$)`, "i");
        });

        const fallbackFilters = [
          ...filters.filter((f) => f !== filters[filters.length - 1]),
          {
            $or: [
              { category: { $in: pIds } },
              { sub_category: { $in: pIds } },
              { child_category: { $in: pIds } },
              ...(pTokens.length ? [{ sub_category_new_name: { $in: pTokens } }] : []),
            ],
          },
        ];

        products = await Product.find({
          ...activeStatusCondition,
          ...(fallbackFilters.length > 0 ? { $and: fallbackFilters } : {}),
        })
          .select(
            "name slug images price special_price model_number item_code movement stock_status quantity brand search_keywords category sub_category sub_category_new_name createdAt"
          )
          .sort({ createdAt: -1, _id: -1 })
          .limit(60)
          .lean();
      }
    }

    // FALLBACK 2: If still 0 products, try searching product name matching category names
    // (handles categories like Android TV, Sound Bar, Air Purifier where product.name has it)
    if (products.length === 0 && catNamesList.length > 0) {
      console.log("[SEARCH API] 0 products by ID/tokens, attempting name-based fallback for:", catNamesList);
      const nameOrConditions = catNamesList.map((n) => {
        const base = n.replace(/s$/i, "").trim();
        return { name: new RegExp(escapeRegExp(base), "i") };
      });

      const nameFallbackFilters = [
        ...filters.filter((f) => f !== filters[filters.length - 1]),
        { $or: nameOrConditions },
      ];

      products = await Product.find({
        ...activeStatusCondition,
        ...(nameFallbackFilters.length > 0 ? { $and: nameFallbackFilters } : {}),
      })
        .select(
          "name slug images price special_price model_number item_code movement stock_status quantity brand search_keywords category sub_category sub_category_new_name createdAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .limit(60)
        .lean();
    }

    console.log("[SEARCH API RESULT] filter count:", filters.length, "products found:", products.length);

    // If search text was entered, rank by relevance score while keeping latest on ties
    if (q.length > 0) {
      products = products
        .map((p) => ({ ...p, _score: scoreProduct(p, q) }))
        .sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score;
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        })
        .map(({ _score, ...rest }) => rest);
    }

    return NextResponse.json({ success: true, products });
  } catch (err) {
    console.error("category-product-carousel/search:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

