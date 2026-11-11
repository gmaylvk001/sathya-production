import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";
import ecom_brand_info from "@/models/ecom_brand_info";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_SLIDERS_CONFIG = [
  {
    id: "tv-accessories",
    title: "TV & ACCESSORIES",
    viewAllHref: "/category/televisions",
    primarySlugs: [
      "tv-audio",
      "televisions",
      "smart-tv",
      "android-tv",
      "audio",
      "speakers",
      "bluetooth-speakers",
      "portable-speakers",
      "soundbar",
      "qledtv",
    ],
  },
  {
    id: "appliances",
    title: "APPLIANCES",
    viewAllHref: "/category/large-appliances",
    primarySlugs: [
      "appliances",
      "large-appliances",
      "small-appliances",
      "kitchen-appliances",
      "utility-appliances",
      "utility-appliance",
      "washing-machine",
      "refrigerator",
      "air-conditioner",
      "air-cooler",
      "side-by-side-refrigerator",
      "deep-freezer",
      "mini-fridge",
      "dishwasher",
      "microwave-oven",
      "vacuum-cleaner",
    ],
  },
  {
    id: "mobiles-wearables",
    title: "MOBILES & WEARABLES",
    viewAllHref: "/category/mobiles-accessories",
    primarySlugs: [
      "mobiles-wearables",
      "mobiles-accessories",
      "mobiles",
      "wearables",
      "smart-watch",
      "keypad-phones",
      "iphone",
      "headphones-headsets",
      "mobile-screen-guards",
      "screenguards-mobile-covers",
      "mobile-chargers",
      "gadgets",
    ],
  },
];

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch brand map
    let brandMap = {};
    try {
      const brands = await ecom_brand_info.find().lean();
      brands.forEach((b) => {
        if (b?._id) brandMap[b._id.toString()] = b.brand_name || b.name || "";
      });
    } catch (bErr) {
      console.warn("Could not fetch brands for deals category slider:", bErr);
    }

    // 2. Fetch all categories once to build hierarchy lookup
    const allCategories = await Category.find(
      {},
      { _id: 1, category_name: 1, category_slug: 1, parentid: 1 }
    ).lean();

    // Map by slug and parentid for fast traversal
    const slugMap = new Map();
    const childrenByParent = new Map();

    allCategories.forEach((cat) => {
      const idStr = cat._id.toString();
      if (cat.category_slug) slugMap.set(cat.category_slug.toLowerCase(), cat);
      const pId =
        cat.parentid && cat.parentid !== "none" ? cat.parentid.toString() : null;
      if (pId) {
        if (!childrenByParent.has(pId)) childrenByParent.set(pId, []);
        childrenByParent.get(pId).push(idStr);
      }
    });

    // Helper to resolve all descendant category IDs for a set of slugs
    function resolveCategoryIds(slugs) {
      const resolvedIds = new Set();
      const queue = [];

      slugs.forEach((slug) => {
        const cat = slugMap.get(slug.toLowerCase());
        if (cat) {
          const idStr = cat._id.toString();
          if (!resolvedIds.has(idStr)) {
            resolvedIds.add(idStr);
            queue.push(idStr);
          }
        }
      });

      // BFS to find all subcategories & grandchildren
      while (queue.length > 0) {
        const currentId = queue.shift();
        const children = childrenByParent.get(currentId) || [];
        for (const childId of children) {
          if (!resolvedIds.has(childId)) {
            resolvedIds.add(childId);
            queue.push(childId);
          }
        }
      }

      return Array.from(resolvedIds);
    }

    // 3. For each slider section, query 12 random products using MongoDB $sample
    const sections = await Promise.all(
      CATEGORY_SLIDERS_CONFIG.map(async (config) => {
        const targetCatIds = resolveCategoryIds(config.primarySlugs);

        let products = [];
        if (targetCatIds.length > 0) {
          try {
            products = await Product.aggregate([
              {
                $match: {
                  status: "Active",
                  name: { $not: /^gift/i },
                  $or: [
                    { category: { $in: targetCatIds } },
                    { sub_category: { $in: targetCatIds } },
                  ],
                  $and: [
                    {
                      $or: [
                        { quantity: { $gt: 0 } },
                        { stock_status: { $regex: /^in stock$/i } },
                      ],
                    },
                    {
                      $or: [
                        { special_price: { $gt: 99 } },
                        { price: { $gt: 99 } },
                      ],
                    },
                    {
                      images: { $exists: true, $not: { $size: 0 } },
                    },
                  ],
                },
              },
              { $sample: { size: 12 } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  price: 1,
                  special_price: 1,
                  images: 1,
                  brand: 1,
                  quantity: 1,
                  stock_status: 1,
                  movement: 1,
                  lsp: 1,
                  model_number: 1,
                  item_code: 1,
                  rating: 1,
                  reviews_count: 1,
                },
              },
            ]);
          } catch (aggErr) {
            console.error(`Error querying products for ${config.title}:`, aggErr);
          }
        }

        // Fallback: If $sample returned 0, retrieve up to 12 active products by find
        if (!products || products.length === 0) {
          try {
            products = await Product.find({
              status: "Active",
              $or: [
                { category: { $in: targetCatIds } },
                { sub_category: { $in: targetCatIds } },
              ],
              $and: [
                {
                  $or: [
                    { special_price: { $gt: 0 } },
                    { price: { $gt: 0 } },
                  ],
                },
              ],
            })
              .select(
                "_id name slug price special_price images brand quantity stock_status movement lsp model_number item_code rating reviews_count"
              )
              .limit(12)
              .lean();
          } catch (findErr) {
            console.error(`Fallback find failed for ${config.title}:`, findErr);
          }
        }

        return {
          id: config.id,
          title: config.title,
          viewAllHref: config.viewAllHref,
          products: products || [],
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        brandMap,
        sections,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/deals-offer/category-products:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deals category products",
        message: error?.message,
      },
      { status: 500 }
    );
  }
}
