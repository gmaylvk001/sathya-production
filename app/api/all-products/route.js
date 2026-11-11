import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import Category from "@/models/ecom_category_info";
import User from "@/models/User";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

async function verifyAdminAuth(req) {
  try {
    let token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      token =
        req.cookies.get("admin_token")?.value ||
        req.cookies.get("token")?.value;
    }
    if (!token) return { ok: false, reason: "No token provided" };

    try {
      token = decodeURIComponent(token);
    } catch {}

    if (!process.env.JWT_SECRET) {
      return { ok: false, reason: "JWT_SECRET not configured" };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return { ok: false, reason: "Invalid token payload" };

    if (decoded.user_type === "admin" || decoded.role === "admin") {
      return { ok: true, userId: decoded.userId };
    }

    const user = await User.findById(decoded.userId).select("user_type").lean();
    if (user?.user_type === "admin") {
      return { ok: true, userId: decoded.userId };
    }

    return { ok: false, reason: "User is not an admin" };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export async function GET(req) {
  try {
    await dbConnect();

    // Verify Admin Authorization
    const authResult = await verifyAdminAuth(req);
    if (!authResult.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Admin access required to view All Products catalog.",
          reason: authResult.reason,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "15", 10)));
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const categoryParam = searchParams.get("category") || "";
    const brandParam = searchParams.get("brand") || "";
    const minPrice = parseFloat(searchParams.get("minPrice")) || 0;
    const maxPrice = parseFloat(searchParams.get("maxPrice")) || 1000000;
    const discount = parseInt(searchParams.get("discount") || "0", 10);
    const sort = searchParams.get("sort") || "featured";

    // Build base query conditions
    const andConditions = [{ status: "Active" }];

    // Keyword search
    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      andConditions.push({
        $or: [
          { name: searchRegex },
          { slug: searchRegex },
          { brand_name: searchRegex },
          { model_number: searchRegex },
          { item_code: searchRegex },
        ],
      });
    }

    // Category filter (includes descendant subcategories)
    if (categoryParam) {
      const catList = categoryParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (catList.length > 0) {
        // Find matching parent categories
        const catDocs = await Category.find({
          $or: [
            {
              _id: {
                $in: catList.filter((c) => mongoose.Types.ObjectId.isValid(c)),
              },
            },
            { category_slug: { $in: catList } },
            { category_name: { $in: catList } },
          ],
        })
          .select("_id category_name category_slug")
          .lean();

        const catIds = catDocs.map((c) => c._id.toString());
        const catObjIds = catDocs.map((c) => c._id);
        const catNames = catDocs.map((c) => c.category_name);
        const catSlugs = catDocs.map((c) => c.category_slug);

        // Fetch subcategories whose parentid matches any of these category IDs
        const subDocs = await Category.find({
          $or: [
            { parentid: { $in: [...catIds, ...catObjIds] } },
            { parentid_new: { $in: [...catIds, ...catObjIds] } },
          ],
        })
          .select("_id category_name category_slug")
          .lean();

        const subIds = subDocs.map((s) => s._id.toString());
        const subNames = subDocs.map((s) => s.category_name);
        const subSlugs = subDocs.map((s) => s.category_slug);

        // Fetch level-2 subcategories if any
        let grandSubIds = [];
        let grandSubNames = [];
        if (subIds.length > 0) {
          const grandSubDocs = await Category.find({
            $or: [
              { parentid: { $in: subIds } },
              { parentid_new: { $in: subIds } },
            ],
          })
            .select("_id category_name category_slug")
            .lean();
          grandSubIds = grandSubDocs.map((g) => g._id.toString());
          grandSubNames = grandSubDocs.map((g) => g.category_name);
        }

        const allMatched = [
          ...new Set([
            ...catList,
            ...catIds,
            ...catNames,
            ...catSlugs,
            ...subIds,
            ...subNames,
            ...subSlugs,
            ...grandSubIds,
            ...grandSubNames,
          ]),
        ];

        andConditions.push({
          $or: [
            { category: { $in: allMatched } },
            { sub_category: { $in: allMatched } },
            { main_category: { $in: allMatched } },
            { category_new: { $in: allMatched } },
          ],
        });
      }
    }

    // Brand filter
    if (brandParam) {
      const brandList = brandParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (brandList.length > 0) {
        const brandDocs = await Brand.find({
          $or: [
            {
              _id: {
                $in: brandList.filter((b) =>
                  mongoose.Types.ObjectId.isValid(b)
                ),
              },
            },
            { brand_slug: { $in: brandList } },
            { brand_name: { $in: brandList } },
          ],
        })
          .select("_id brand_name brand_slug")
          .lean();

        const brandIds = brandDocs.map((b) => b._id.toString());
        const brandNames = brandDocs.map((b) => b.brand_name);
        const brandSlugs = brandDocs.map((b) => b.brand_slug);

        const allBrandMatched = [
          ...new Set([
            ...brandList,
            ...brandIds,
            ...brandNames,
            ...brandSlugs,
          ]),
        ];

        // Also allow matching by brand name prefix in product name
        const brandRegexes = brandNames.map(
          (bn) =>
            new RegExp(`^${bn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
        );

        andConditions.push({
          $or: [
            { brand: { $in: allBrandMatched } },
            { brand_name: { $in: allBrandMatched } },
            ...(brandRegexes.length > 0
              ? [{ name: { $in: brandRegexes } }]
              : []),
          ],
        });
      }
    }

    // Price range filter
    const priceFilter = {
      $or: [
        {
          $and: [
            { special_price: { $ne: null, $gt: 0 } },
            { special_price: { $gte: minPrice, $lte: maxPrice } },
          ],
        },
        {
          $and: [
            { $or: [{ special_price: null }, { special_price: 0 }] },
            { price: { $gte: minPrice, $lte: maxPrice } },
          ],
        },
      ],
    };
    andConditions.push(priceFilter);

    // Discount filter (e.g. 10%, 20%, 30%, 40%, 50% and above)
    if (discount > 0) {
      const maxDiscountFactor = 1 - discount / 100;
      andConditions.push({
        $and: [
          { special_price: { $gt: 0 } },
          { price: { $gt: 0 } },
          {
            $expr: {
              $lte: [
                "$special_price",
                { $multiply: ["$price", maxDiscountFactor] },
              ],
            },
          },
        ],
      });
    }

    const query = { $and: andConditions };

    // Determine sorting
    let sortObj = { stock_status: 1, createdAt: -1, _id: -1 };
    switch (sort) {
      case "price-low-high":
        sortObj = { stock_status: 1, special_price: 1, price: 1, _id: -1 };
        break;
      case "price-high-low":
        sortObj = { stock_status: 1, special_price: -1, price: -1, _id: -1 };
        break;
      case "name-a-z":
        sortObj = { stock_status: 1, name: 1, _id: -1 };
        break;
      case "name-z-a":
        sortObj = { stock_status: 1, name: -1, _id: -1 };
        break;
      case "quantity-high-to-low":
        sortObj = { stock_status: 1, quantity: -1, _id: -1 };
        break;
      case "featured":
      default:
        sortObj = { stock_status: 1, createdAt: -1, _id: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    // Run count and products fetch in parallel
    const [totalProducts, rawProducts] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select(
          "name slug price special_price quantity stock_status brand category sub_category images key_specifications product_highlights description model_number item_code movement"
        )
        .lean(),
    ]);

    // Resolve brand names for display
    const activeBrands = await Brand.find({ status: "Active" })
      .select("_id brand_name brand_slug")
      .sort({ brand_name: 1 })
      .lean();

    const brandMap = {};
    activeBrands.forEach((b) => {
      brandMap[b._id.toString()] = b.brand_name;
      brandMap[b.brand_slug.toLowerCase()] = b.brand_name;
      brandMap[b.brand_name.toLowerCase()] = b.brand_name;
    });

    // Helper to extract clean highlights
    const extractHighlights = (p) => {
      let items = [];
      const rawHighlights = p.product_highlights;
      const rawSpecs = p.key_specifications;
      const rawDesc = p.description;

      const parseHtmlBullets = (str) => {
        if (!str || typeof str !== "string") return [];
        if (str.includes("<li")) {
          const matched = str.match(/<li[^>]*>(.*?)<\/li>/gis);
          if (matched && matched.length > 0) {
            return matched
              .map((m) =>
                m
                  .replace(/<[^>]*>/g, "")
                  .replace(/&nbsp;/g, " ")
                  .replace(/&amp;/g, "&")
                  .trim()
              )
              .filter(Boolean);
          }
        }
        return str
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .split(/[.\n•;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 4 && s.length < 120);
      };

      if (Array.isArray(rawHighlights) && rawHighlights.length > 0) {
        rawHighlights.forEach((item) => {
          if (typeof item === "string") {
            items.push(...parseHtmlBullets(item));
          }
        });
      }

      if (items.length === 0 && Array.isArray(rawSpecs) && rawSpecs.length > 0) {
        rawSpecs.forEach((item) => {
          if (typeof item === "string") {
            items.push(...parseHtmlBullets(item));
          }
        });
      }

      if (items.length === 0 && typeof rawDesc === "string" && rawDesc.trim()) {
        items.push(...parseHtmlBullets(rawDesc));
      }

      // Filter clean, non-empty highlights
      const clean = items
        .map((it) =>
          typeof it === "string"
            ? it.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
            : ""
        )
        .filter((it) => it.length > 2 && !it.toLowerCase().startsWith("http"));

      return clean.slice(0, 5);
    };

    // Normalize products for the list card
    const products = rawProducts.map((p) => {
      let brandDisplay = "";
      if (p.brand) {
        brandDisplay =
          brandMap[p.brand.toString()] ||
          brandMap[String(p.brand).toLowerCase()] ||
          (typeof p.brand === "string" && !mongoose.Types.ObjectId.isValid(p.brand)
            ? p.brand
            : "");
      }
      if (!brandDisplay && p.name) {
        const firstWord = p.name.split(" ")[0].toLowerCase();
        if (brandMap[firstWord]) {
          brandDisplay = brandMap[firstWord];
        }
      }

      // Calculate discount
      const origPrice = p.price || 0;
      const specPrice =
        p.special_price && p.special_price > 0 && p.special_price < origPrice
          ? p.special_price
          : origPrice;
      const hasDiscount = origPrice > 0 && specPrice > 0 && specPrice < origPrice;
      const discountPercent = hasDiscount
        ? Math.round(((origPrice - specPrice) / origPrice) * 100)
        : 0;

      // Extract bullet highlights
      const highlights = extractHighlights(p);

      // Resolve valid image
      const validImage = Array.isArray(p.images)
        ? p.images.find(
          (img) => img && typeof img === "string" && img.trim() !== ""
        )
        : typeof p.images === "string"
          ? p.images
          : "";

      return {
        _id: p._id.toString(),
        name: p.name || "",
        slug: p.slug || "",
        price: origPrice,
        special_price: specPrice,
        hasDiscount,
        discountPercent,
        brandName: brandDisplay,
        images: Array.isArray(p.images) ? p.images : validImage ? [validImage] : [],
        imgSrc: validImage,
        highlights,
        stock_status: p.stock_status || "In Stock",
        quantity: p.quantity ?? 10,
        inStock:
          p.stock_status !== "Out of Stock" &&
          (p.quantity === undefined || p.quantity > 0),
        movement: p.movement || "",
        model_number: p.model_number || "",
        item_code: p.item_code || "",
        category: p.category || "",
        sub_category: p.sub_category || "",
      };
    });

    // Fetch sidebar filter facets: Categories & Brands with counts
    // 1. Categories & Subcategories Tree
    const allActiveCategories = await Category.find({ status: "Active" })
      .select("_id category_name category_slug parentid position")
      .sort({ position: 1, category_name: 1 })
      .lean();

    const topCategories = allActiveCategories
      .filter((c) => !c.parentid || c.parentid === "none" || c.parentid === "")
      .map((parent) => {
        const pIdStr = parent._id.toString();
        const subs = allActiveCategories.filter(
          (s) =>
            s.parentid &&
            (s.parentid.toString() === pIdStr ||
              s.parentid === parent.category_name ||
              s.parentid === parent.category_slug)
        );
        return {
          _id: parent._id,
          category_name: parent.category_name,
          category_slug: parent.category_slug,
          subcategories: subs.map((sub) => {
            const sIdStr = sub._id.toString();
            const children = allActiveCategories.filter(
              (ch) =>
                ch.parentid &&
                (ch.parentid.toString() === sIdStr ||
                  ch.parentid === sub.category_name ||
                  ch.parentid === sub.category_slug)
            );
            return {
              _id: sub._id,
              category_name: sub.category_name,
              category_slug: sub.category_slug,
              children: children.map((c) => ({
                _id: c._id,
                category_name: c.category_name,
                category_slug: c.category_slug,
              })),
            };
          }),
        };
      });

    // 2. Active Brands with product counts
    const brandCountsRaw = await Product.aggregate([
      { $match: { status: "Active" } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]);
    const brandCountMap = {};
    brandCountsRaw.forEach((bc) => {
      if (bc._id) {
        brandCountMap[bc._id.toString()] = bc.count;
        brandCountMap[String(bc._id).toLowerCase()] = bc.count;
      }
    });

    const enrichedBrands = activeBrands
      .map((b) => ({
        ...b,
        count:
          brandCountMap[b._id.toString()] ||
          brandCountMap[b.brand_slug.toLowerCase()] ||
          brandCountMap[b.brand_name.toLowerCase()] ||
          0,
      }))
      .sort((a, b) => b.count - a.count);

    const totalPages = Math.ceil(totalProducts / limit);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: totalPages || 1,
        totalProducts,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      categories: topCategories,
      brands: enrichedBrands,
    });
  } catch (error) {
    console.error("Error in /api/all-products:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch all products" },
      { status: 500 }
    );
  }
}
