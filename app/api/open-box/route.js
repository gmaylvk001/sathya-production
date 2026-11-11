import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import Category from "@/models/ecom_category_info"; 
import mongoose from "mongoose";
import ProductFilter from "@/models/ecom_productfilter_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const brands = searchParams.get("brands");
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "10000000");
    const sortBy = searchParams.get("sortBy") || "";
    const category = searchParams.get("category") || "";
    const filters = (searchParams.get("filters") || "")
  .split(",")
  .filter((v) => mongoose.Types.ObjectId.isValid(v));

    // Base query
    const query = {
      movement: { $in: ["EOL", "FOCUS"] },
      status: "Active",
      quantity: { $gte: 1 },
      special_price: { $gte: minPrice, $lte: maxPrice },
    };

    // Brand filter
    if (brands) {
      const brandIds = brands.split(",");
      query.brand = { $in: brandIds };
    }

    // Category filter
    if (category) {
      const categoryDoc = await Category.findOne({
        category_name: { $regex: `^${category}$`, $options: "i" },
      }).lean();

      if (categoryDoc) {
        // Recursively get all child IDs
        const getAllChildIds = async (parentId) => {
          const children = await Category.find({ parentid: parentId }).lean();
          let ids = [new mongoose.Types.ObjectId(parentId.toString())];
          for (const child of children) {
            const childIds = await getAllChildIds(child._id);
            ids = ids.concat(childIds);
          }
          return ids;
        };

        const allCategoryIds = await getAllChildIds(categoryDoc._id);

        query.$or = [
          { category: { $in: allCategoryIds } },
          { sub_category: { $in: allCategoryIds } },
        ];
      }
    }

    // Sort
    let sortQuery = {};
    switch (sortBy) {
      case "price-low-high":
        sortQuery = { effectivePrice: 1 };
        break;
      case "price-high-low":
        sortQuery = { effectivePrice: -1 };
        break;
      case "name-a-z":
        sortQuery = { name: 1 };
        break;
      case "name-z-a":
        sortQuery = { name: -1 };
        break;
      case "quantity-low-to-high":
        sortQuery = { quantity: 1 };
        break;
      case "quantity-high-to-low":
        sortQuery = { quantity: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const needsPriceSort =
      sortBy === "price-low-high" || sortBy === "price-high-low";

    let products;
    if (needsPriceSort) {
      products = await Product.aggregate([
        { $match: query },
        {
          $addFields: {
            effectivePrice: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$special_price", 0] },
                    { $lt: ["$special_price", "$price"] },
                  ],
                },
                then: "$special_price",
                else: "$price",
              },
            },
          },
        },
        { $sort: sortQuery },
        { $skip: skip },
        { $limit: limit },
      ]);
    } else {
      products = await Product.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean();
    }

      if (filters.length > 0) {
      const baseProductIds = await Product.distinct("_id", query);
      if (baseProductIds.length > 0) {
        const productFilterDocs = await ProductFilter.find({
          product_id: { $in: baseProductIds },
          filter_id: { $in: filters },
        });

        const filtersByProduct = productFilterDocs.reduce((acc, pf) => {
          const pid = pf.product_id.toString();
          if (!acc[pid]) acc[pid] = new Set();
          acc[pid].add(pf.filter_id.toString());
          return acc;
        }, {});

        const filteredIds = baseProductIds.filter((id) => {
          const productFilterIds = filtersByProduct[id.toString()] || new Set();
          return filters.some((fid) => productFilterIds.has(fid));
        });

        query._id = { $in: filteredIds };

        // Re-fetch filtered products
        if (needsPriceSort) {
          products = await Product.aggregate([
            { $match: query },
            {
              $addFields: {
                effectivePrice: {
                  $cond: {
                    if: { $and: [{ $gt: ["$special_price", 0] }, { $lt: ["$special_price", "$price"] }] },
                    then: "$special_price",
                    else: "$price",
                  },
                },
              },
            },
            { $sort: sortQuery },
            { $skip: skip },
            { $limit: limit },
          ]);
        } else {
          products = await Product.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .lean();
        }
      }
    }

    // ✅ FILTER SUMMARY 
 const filterAggBaseIds = await Product.distinct("_id", query);

    const filterAgg = await ProductFilter.aggregate([
      { $match: { product_id: { $in: filterAggBaseIds } } },
      { $group: { _id: "$filter_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const filterSummary = filterAgg.map((f) => ({
      filterId: f._id,
      count: f.count,
    }));

    // ✅ FILTER DEFINITIONS — filter names & groups
    const productFilterAllDocs = await ProductFilter.find({
      product_id: { $in: filterAggBaseIds },
    }).lean();

    const filterDefIds = [
      ...new Set(
        productFilterAllDocs
          .map((pf) => pf.filter_id?.toString())
          .filter(Boolean)
      ),
    ];

    const filterDefDocs = await Filter.find({ _id: { $in: filterDefIds } })
      .populate({
        path: "filter_group",
        select: "filtergroup_name",
        model: FilterGroup,
      })
      .lean();

    const formattedFilterDefs = filterDefDocs.map((f) => ({
      ...f,
      filter_group_name: f.filter_group?.filtergroup_name || "Other",
    }));

    // Brands list
const brandFilterQuery = {
  movement: { $in: ["EOL", "FOCUS"] },
  status: "Active",
  quantity: { $gte: 1 },
};

if (query.$or) {
  brandFilterQuery.$or = query.$or;
}

const allEOLProducts = await Product.find(
  brandFilterQuery,
  { brand: 1 },
).lean();

    const brandCountMap = {};
    allEOLProducts.forEach((p) => {
      if (p.brand) {
        const key = p.brand.toString();
        brandCountMap[key] = (brandCountMap[key] || 0) + 1;
      }
    });

    const brandIds = Object.keys(brandCountMap);
    const brandDocs = await Brand.find({ _id: { $in: brandIds } }).lean();
    const brandsWithCount = brandDocs.map((b) => ({
      ...b,
      count: brandCountMap[b._id.toString()] || 0,
    }));

    // Categories — header API logic use 
    const allProductsForCategories = await Product.find(
      {
        movement: { $in: ["EOL", "FOCUS"] },
        status: "Active",
        quantity: { $gte: 1 },
      },
      { category: 1, sub_category: 1 },
    ).lean();

    // EOL products category IDs collect
    const productCategoryIds = new Set();
    allProductsForCategories.forEach((p) => {
      if (p.category) productCategoryIds.add(p.category.toString());
      if (p.sub_category) productCategoryIds.add(p.sub_category.toString());
    });

  
    const allCategories = await Category.find().sort({ position: 1 }).lean();

    // Descendant IDs check — sync version
    const getDescendantIdsSync = (catId, allCats) => {
      const children = allCats.filter(
        (c) => c.parentid?.toString() === catId.toString()
      );
      let ids = [catId.toString()];
      for (const child of children) {
        ids = ids.concat(getDescendantIdsSync(child._id, allCats));
      }
      return ids;
    };

    // T(header API logic)
    const topLevelCategories = allCategories.filter((c) => {
      const pid = c.parentid?.toString();
      return !pid || pid === "0" || pid === "" || pid === "null" || pid === "none";
    });

    // Top level check
    const filteredTopLevel = topLevelCategories.filter((cat) => {
      const allIds = getDescendantIdsSync(cat._id, allCategories);
      return allIds.some((id) => productCategoryIds.has(id));
    });

    // Children build
    const categoryTree = filteredTopLevel.map((cat) => {
  // 2nd level (Air Conditioners)
  const children = allCategories
    .filter((c) => c.parentid?.toString() === cat._id.toString())
    .filter((c) => {
      const allIds = getDescendantIdsSync(c._id, allCategories);
      return allIds.some((id) => productCategoryIds.has(id));
    });

  return {
    _id: cat._id,
    category_name: cat.category_name,
    subCategories: children.map((c) => {
      // 3rd level (Inverter AC, Split AC)
      const grandChildren = allCategories
        .filter((g) => g.parentid?.toString() === c._id.toString())
        .filter((g) => productCategoryIds.has(g._id.toString()));

      return {
        _id: c._id,
        category_name: c.category_name,
        subCategories: grandChildren.map((g) => ({
          _id: g._id,
          category_name: g.category_name,
        })),
      };
    }),
  };
});

    // Flat list — parent names
    const flatCategoriesList = filteredTopLevel
      .map((c) => c.category_name)
      .sort()
      .reverse();

    // Price range
    const priceData = await Product.aggregate([
      { $match: { movement: { $in: ["EOL", "FOCUS"] }, status: "Active" } },
      {
        $addFields: {
          effectivePrice: {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$special_price", 0] },
                  { $lt: ["$special_price", "$price"] },
                ],
              },
              then: "$special_price",
              else: "$price",
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$effectivePrice" },
          maxPrice: { $max: "$effectivePrice" },
        },
      },
    ]);

    const priceRange = priceData[0] || { minPrice: 0, maxPrice: 100000 };

    return NextResponse.json({
      success: true,
      products,
      brands: brandsWithCount,
      categories: flatCategoriesList,
      categoryTree,
      priceRange,
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        totalProducts,
      },
      filterSummary,
      filterDefs: formattedFilterDefs,
    });
  } catch (error) {
    console.error(" Open Box error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}