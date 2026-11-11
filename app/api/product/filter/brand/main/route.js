import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Brand from "@/models/ecom_brand_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import ecom_category_info from "@/models/ecom_category_info";
import mongoose from "mongoose";
import { getFiltersForProductIds } from "@/lib/availableProductFilters";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const categoryIds = (searchParams.get('categoryIds')?.split(',') || []).filter(Boolean);
    const subcategoryIds = (searchParams.get('subcategoryIds')?.split(',') || []).filter(Boolean);
    const brandIds = (searchParams.get('brands')?.split(',') || []).filter(Boolean);
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 1000000;
    const filterIds = (searchParams.get('filters')?.split(',') || []).filter(Boolean);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const sort = searchParams.get('sort') || 'featured';

    // Base query
    let query = { status: "Active" };
    const andClauses = [];

    let expandedCategoryIds = [...categoryIds, ...subcategoryIds];
    if (categoryIds.length > 0 && subcategoryIds.length === 0) {
      const children = await ecom_category_info.find({
        parentid: { $in: categoryIds },
        status: "Active",
      }).lean();
      const childIds = children.map((c) => c._id.toString());
      const grand = childIds.length
        ? await ecom_category_info.find({
            parentid: { $in: childIds },
            status: "Active",
          }).lean()
        : [];
      expandedCategoryIds = [
        ...new Set([
          ...categoryIds,
          ...childIds,
          ...grand.map((c) => c._id.toString()),
        ]),
      ];
    }

    if (expandedCategoryIds.length > 0) {
      andClauses.push({
        $or: [
          { category: { $in: expandedCategoryIds } },
          { sub_category: { $in: expandedCategoryIds } },
        ],
      });
    }

    // Add brand filters if any (products store brand as ObjectId string or name)
    if (brandIds.length > 0) {
      const validIds = brandIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const brandDocs = validIds.length
        ? await Brand.find({ _id: { $in: validIds } }).select("brand_name").lean()
        : [];
      const brandNames = brandDocs
        .map((b) => String(b.brand_name || "").trim())
        .filter(Boolean);
      andClauses.push({
        $or: [
          { brand: { $in: brandIds } },
          ...(brandNames.length ? [{ brand: { $in: brandNames } }] : []),
        ],
      });
    }
    
    // Price range filter (considers both price and special_price)
    andClauses.push({
      $or: [
        { 
          $and: [
            { special_price: { $ne: null, $ne: 0 } },
            { special_price: { $gte: minPrice, $lte: maxPrice } }
          ]
        },
        { 
          $and: [
            { $or: [{ special_price: null }, { special_price: 0 }] },
            { price: { $gte: minPrice, $lte: maxPrice } }
          ]
        }
      ]
    });
    query.$and = andClauses;
    
    let productsQuery = Product.find(query);
  
    // Apply additional filters if any
    if (filterIds.length > 0) {
      const productIds = await productsQuery.distinct('_id');
      const productIdStrings = productIds.map((id) => id.toString());

      const selectedFilterDocs = await Filter.find({ _id: { $in: filterIds } })
        .populate({ path: "filter_group", select: "filtergroup_name", model: FilterGroup })
        .lean();

      const filtersByGroup = {};
      selectedFilterDocs.forEach((f) => {
        const groupId = f.filter_group?._id?.toString() || f.filter_group || "other";
        if (!filtersByGroup[groupId]) filtersByGroup[groupId] = [];
        filtersByGroup[groupId].push(f._id.toString());
      });

      let matchingProductIds = new Set(productIdStrings);

      for (const groupFilterIds of Object.values(filtersByGroup)) {
        const groupProductFilters = await ProductFilter.find({
          $or: [
            { product_id: { $in: productIdStrings } },
            { product_id: { $in: productIds } },
          ],
          filter_id: { $in: groupFilterIds },
        }).lean();

        const groupMatchingIds = new Set(
          groupProductFilters.map((pf) => pf.product_id.toString())
        );

        matchingProductIds = new Set(
          [...matchingProductIds].filter((id) => groupMatchingIds.has(id))
        );

        if (matchingProductIds.size === 0) break;
      }

      // Update the query to only include filtered products
      query._id = { $in: [...matchingProductIds] };
      productsQuery = Product.find(query);
    }
    
    // Apply pagination
    const skip = (page - 1) * limit;
    let products;

    if (sort === 'price-low-high' || sort === 'price-high-low') {
      const sortDir = sort === 'price-low-high' ? 1 : -1;
      products = await Product.aggregate([
        { $match: query },
        {
          $addFields: {
            effective_price: {
              $cond: {
                if: { $and: [{ $gt: ["$special_price", 0] }, { $lt: ["$special_price", "$price"] }] },
                then: "$special_price",
                else: "$price"
              }
            }
          }
        },
        { $sort: { stock_status: 1, effective_price: sortDir, _id: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
    } else {
      const sortObj =
        sort === 'name-a-z' ? { stock_status: 1, name: 1, _id: -1 } :
        sort === 'name-z-a' ? { stock_status: 1, name: -1, _id: -1 } :
        sort === 'quantity-low-to-high' ? { stock_status: 1, quantity: 1, _id: -1 } :
        sort === 'quantity-high-to-low' ? { stock_status: 1, quantity: -1, _id: -1 } :
        { stock_status: 1, createdAt: -1, _id: -1 };

      products = await productsQuery
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
    }
    
    // Get total count for pagination info
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    const matchingIds = await Product.distinct("_id", query);
    const filters = await getFiltersForProductIds(matchingIds);
    
    return Response.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters,
    });
  } catch (error) {
    console.error('Error in /api/product/filter:', error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}