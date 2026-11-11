import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Brand from "@/models/ecom_brand_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

const mongoose = require('mongoose'); 

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
   // console.log('🔍 API Request Params:', Object.fromEntries(searchParams.entries()));
    
    const categoryIds = searchParams.get('categoryIds')?.split(',') || [];
    const sub_category_new = searchParams.get('sub_category_new');
    const brandIds = searchParams.get('brands')?.split(',') || [];
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 1000000;
    const filterGroupsParam = searchParams.get('filterGroups');
    let filterGroupsMap = {};
    if (filterGroupsParam) {
      try { filterGroupsMap = JSON.parse(filterGroupsParam); } catch (e) { filterGroupsMap = {}; }
    }
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const sort = searchParams.get('sort') || 'featured';

    //console.log('🎯 Category IDs:', categoryIds);
    //console.log('💰 Price Range:', minPrice, '-', maxPrice);

    // Build base query
    let query = { 
      status: "Active",
    };

    const categoryClauses = [];
    if (categoryIds.length > 0) {
      categoryClauses.push(
        { sub_category: { $in: categoryIds } },
        { category: { $in: categoryIds } },
        { main_category: { $in: categoryIds } }
      );
    }
    if (sub_category_new && typeof sub_category_new === "string") {
      categoryClauses.push({
        sub_category_new: { $regex: sub_category_new, $options: "i" },
      });
      categoryClauses.push({
        category_new: sub_category_new,
      });
    }

    if (categoryClauses.length > 0) {
      query.$or = categoryClauses;
    }
      

    // Brand filter
    if (brandIds.length > 0) {
      query.brand = { $in: brandIds };
    }

    // Price range filter - FIXED VERSION
    query.$and = [
      {
        $or: [
          // Products with special_price in range
          { 
            $and: [
              { special_price: { $ne: null, $ne: 0 } },
              { special_price: { $gte: minPrice, $lte: maxPrice } }
            ]
          },
          // Products without special_price but regular price in range
          { 
            $and: [
              { $or: [{ special_price: null }, { special_price: 0 }] },
              { price: { $gte: minPrice, $lte: maxPrice } }
            ]
          }
        ]
      }
    ];

    //console.log('📝 Final Query:', JSON.stringify(query, null, 2));

    // First, let's check what products exist with just basic query
    /*
    const testProducts = await Product.find({ 
      status: "Active",
      quantity: { $gt: 0 }
    }).limit(5).lean();
    
    console.log('🧪 Sample products in DB:', testProducts.map(p => ({
      id: p._id,
      name: p.name,
      category: p.category,
      sub_category: p.sub_category,
      main_category: p.main_category,
      price: p.price,
      special_price: p.special_price
    })));
    */

    let productsQuery = Product.find(query).populate('brand', 'brand_name brand_slug');

    // Apply sorting based on parameter
    switch(sort) {
      case 'price-low-high':
        productsQuery = productsQuery.sort({ stock_status: 1, price: 1, _id: -1 });
        break;
      case 'price-high-low':
        productsQuery = productsQuery.sort({ stock_status: 1, price: -1, _id: -1 });
        break;
      case 'name-a-z':
        productsQuery = productsQuery.sort({ stock_status: 1, name: 1, _id: -1 });
        break;
      case 'name-z-a':
        productsQuery = productsQuery.sort({ stock_status: 1, name: -1, _id: -1 });
        break;
      case 'quantity-low-to-high':
        productsQuery = productsQuery.sort({ stock_status: 1, quantity: 1, _id: -1 });
        break;
      case 'quantity-high-to-low':
        productsQuery = productsQuery.sort({ stock_status: 1, quantity: -1, _id: -1 });
        break;
      case 'featured':
      default:
        productsQuery = productsQuery.sort({ stock_status: 1, createdAt: -1, _id: -1 });
        break;
    }

    if (Object.keys(filterGroupsMap).length > 0) {
      let candidateIds = await productsQuery.distinct('_id');

      if (candidateIds.length > 0) {
        for (const groupFilterIds of Object.values(filterGroupsMap)) {
          const matchingProductIds = await ProductFilter.find({
            product_id: { $in: candidateIds },
            filter_id: { $in: groupFilterIds }
          }).distinct('product_id');

          const matchingSet = new Set(matchingProductIds.map(id => id.toString()));
          candidateIds = candidateIds.filter(id => matchingSet.has(id.toString()));

          if (candidateIds.length === 0) break; 
        }

        query._id = { $in: candidateIds };
        productsQuery = Product.find(query).populate('brand', 'brand_name brand_slug');

        // Re-apply sorting
          switch(sort) {
          case 'price-low-high':
            productsQuery = productsQuery.sort({ stock_status: 1, price: 1, _id: -1 });
            break;
          case 'price-high-low':
            productsQuery = productsQuery.sort({ stock_status: 1, price: -1, _id: -1 });
            break;
          case 'name-a-z':
            productsQuery = productsQuery.sort({ stock_status: 1, name: 1, _id: -1 });
            break;
          case 'name-z-a':
            productsQuery = productsQuery.sort({ stock_status: 1, name: -1, _id: -1 });
            break;
          case 'quantity-low-to-high':
            productsQuery = productsQuery.sort({ stock_status: 1, quantity: 1, _id: -1 });
            break;
          case 'quantity-high-to-low':
            productsQuery = productsQuery.sort({ stock_status: 1, quantity: -1, _id: -1 });
            break;
          case 'featured':
          default:
            productsQuery = productsQuery.sort({ stock_status: 1, createdAt: -1, _id: -1 });
            break;
        }
      }
    }
    // Apply pagination
const skip = (page - 1) * limit;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    let products;

    if (sort === 'price-low-high' || sort === 'price-high-low') {
      const sortDir = sort === 'price-low-high' ? 1 : -1;

      const aggregateMatch = {
        status: "Active",
      };

      if (categoryClauses.length > 0) {
        aggregateMatch.$or = categoryClauses;
      }

      if (brandIds.length > 0) {
        aggregateMatch.brand = { $in: brandIds };
      }

      if (query._id) {
        aggregateMatch._id = { 
          $in: query._id.$in.map(id => 
            mongoose.Types.ObjectId.isValid(id.toString()) 
              ? new mongoose.Types.ObjectId(id.toString()) 
              : id
          )
        };
      }

      products = await Product.aggregate([
        { $match: aggregateMatch },
        {
          $match: {
            $or: [
              { special_price: { $gt: 0, $gte: minPrice, $lte: maxPrice } },
              {
                $and: [
                  { $or: [{ special_price: null }, { special_price: 0 }] },
                  { price: { $gte: minPrice, $lte: maxPrice } }
                ]
              }
            ]
          }
        },
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
      products = await productsQuery
        .skip(skip)
        .limit(limit)
        .lean();
    }
      
          
    const brandFilterQuery = {
      status: "Active",
    };

    if (query.$or) {
      brandFilterQuery.$or = query.$or;
    }

    const allProductsForBrand = await Product.find(
      brandFilterQuery,
      { brand: 1 }
    ).lean();

    const brandCountMap = {};
    allProductsForBrand.forEach((p) => {
      if (p.brand) {
        const key = p.brand.toString();
        brandCountMap[key] = (brandCountMap[key] || 0) + 1;
      }
    });

    const brandIdList = Object.keys(brandCountMap).filter(
      (id) => id && id !== "undefined"
    );

    const brandDocs = await Brand.find({ _id: { $in: brandIdList } }).lean();

    const brandsWithCount = brandDocs
      .map((b) => ({
        ...b,
        count: brandCountMap[b._id.toString()] || 0,
      }))
      .sort((a, b) => a.brand_name.localeCompare(b.brand_name));

    const baseQuery = {
      status: "Active",
    };

    if (query.$or) {
      baseQuery.$or = query.$or;
    }

const finalFilteredProductIds = await Product.distinct('_id', query);
    const finalFilteredProductIdStrings = finalFilteredProductIds.map(id => id.toString());

    // Get selected filters grouped by filter_group
    let selectedFiltersByGroup = {};
    const filterIds = Object.values(filterGroupsMap).flat();
    if (filterIds.length > 0) {
      const selectedFilterDocs = await Filter.find({ _id: { $in: filterIds } })
        .populate({ path: "filter_group", select: "filtergroup_name", model: FilterGroup })
        .lean();
      selectedFilterDocs.forEach(f => {
        const groupId = f.filter_group?._id?.toString() || "other";
        if (!selectedFiltersByGroup[groupId]) selectedFiltersByGroup[groupId] = [];
        selectedFiltersByGroup[groupId].push(f._id.toString());
      });
    }

    const filterAggMap = {};

    if (filterIds.length > 0) {
      for (const [groupId, groupFilterIds] of Object.entries(selectedFiltersByGroup)) {
      
        let baseIds = await Product.distinct('_id', baseQuery);

        
        for (const [otherGroupId, otherGroupFilterIds] of Object.entries(selectedFiltersByGroup)) {
          if (otherGroupId === groupId) continue;

          const otherGroupPF = await ProductFilter.find({
            product_id: { $in: baseIds.map(id => id.toString()) },
            filter_id: { $in: otherGroupFilterIds }
          }).lean();

          const otherMatchIds = new Set(otherGroupPF.map(pf => pf.product_id.toString()));
          baseIds = baseIds.filter(id => otherMatchIds.has(id.toString()));
        }

        const agg = await ProductFilter.aggregate([
          {
            $match: {
              product_id: { $in: baseIds.map(id => id.toString()) },
              filter_id: { $in: groupFilterIds.map(id => new mongoose.Types.ObjectId(id)) }
            }
          },
          { $group: { _id: "$filter_id", count: { $sum: 1 } } }
        ]);

        agg.forEach(item => {
          filterAggMap[item._id.toString()] = item.count;
        });
      }
    }

    // Standard agg for all filters based on final filtered products
    const filterAgg = await ProductFilter.aggregate([
      {
        $match: {
          $or: [
            { product_id: { $in: finalFilteredProductIdStrings } },
            { product_id: { $in: finalFilteredProductIds } },
          ],
        },
      },
      { $group: { _id: "$filter_id", count: { $sum: 1 } } },
    ]);

    // Merge counts - selected group counts take priority
    filterAgg.forEach(item => {
      if (!filterAggMap[item._id.toString()]) {
        filterAggMap[item._id.toString()] = item.count;
      }
    });

    const filterIdList = filterAgg.map(f => f._id);
    const filterDocs = await Filter.find({ _id: { $in: filterIdList } })
      .populate({ path: "filter_group", select: "filtergroup_name", model: FilterGroup })
      .lean();

    const filtersWithGroup = filterDocs.map(f => ({
      ...f,
      filter_group_name: f.filter_group?.filtergroup_name || "Other",
      filter_group_id: f.filter_group?._id?.toString() || "other",
      count: filterAggMap[f._id.toString()] || 0,
    }));
    return Response.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      brands: brandsWithCount,
      filters: filtersWithGroup,
    });
    
  } catch (error) {
    console.error('❌ Error in /api/product/filter:', error);
    return Response.json(
      { 
        error: "Internal server error",
        message: error.message 
      },
      { status: 500 }
    );
  }
}