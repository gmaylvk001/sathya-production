import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Brand from "@/models/ecom_brand_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const categoryIds = (searchParams.get('categoryIds')?.split(',') || []).filter(
      (id) => id && id.trim()
    );
    const objectIdCategoryIds = categoryIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const brandIds = searchParams.get('brands')?.split(',') || [];
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 1000000;
    const filterIds = searchParams.get('filters')?.split(',') || [];
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 5;

    // Match both string and ObjectId forms — combo products store sub_category as string
    const categoryClauses = [];
    if (categoryIds.length > 0) {
      categoryClauses.push({ sub_category: { $in: categoryIds } });
      categoryClauses.push({ category: { $in: categoryIds } });
    }
    if (objectIdCategoryIds.length > 0) {
      categoryClauses.push({ sub_category: { $in: objectIdCategoryIds } });
      categoryClauses.push({ category: { $in: objectIdCategoryIds } });
    }

    const priceCondition = {
      $or: [
        {
          $and: [
            { special_price: { $ne: null, $gt: 0 } },
            { special_price: { $gte: minPrice, $lte: maxPrice } }
          ]
        },
        {
          $and: [
            {
              $or: [
                { special_price: null },
                { special_price: { $exists: false } },
                { special_price: 0 }
              ]
            },
            { price: { $gte: minPrice, $lte: maxPrice } }
          ]
        }
      ]
    };

    let query = {
      status: "Active",
      $and: [
        ...(categoryClauses.length
          ? [{ $or: categoryClauses }]
          : [{ _id: null }]), // no category ids → match nothing
        priceCondition,
      ],
    };
    // Add brand filters if any
    if (brandIds.length > 0) {
      query.brand = { $in: brandIds };
    }
    
    // First fetch products matching brand and price filters
    // let products = await Product.find(query)
    //   .populate('brand', 'brand_name brand_slug')
    //   .lean();
    
    // // Apply additional filters if any
    // if (filterIds.length > 0) {
    //   const productIds = products.map(p => p._id);
      
    //   // Get all product-filter relationships that match our criteria
    //   const productFilters = await ProductFilter.find({
    //     product_id: { $in: productIds },
    //     filter_id: { $in: filterIds }
    //   });
    //   console.log(productFilters);
    //   // Group filters by product
    //   const filtersByProduct = productFilters.reduce((acc, pf) => {
    //     const productId = pf.product_id.toString();

    //     if (!acc[productId]) acc[productId] = new Set();
    //     acc[productId].add(pf.filter_id.toString());
    //     return acc;
    //   }, {});
    //   console.log("filtersByProduct",filtersByProduct);
    //   console.log("products",products);
    //   // Filter products to only those that have ALL selected filters
    //   products = products.filter(product => {
    //     const productId = product._id.toString();
    //     const productFilterIds = filtersByProduct[productId] || new Set();
    //    // return filterIds.every(fid => productFilterIds.has(fid));
    //    return filterIds.some(fid => productFilterIds.has(fid));
    //   });
    // }
    
    // return Response.json(products);
    let productsQuery = Product.find(query)
    .populate('brand', 'brand_name brand_slug');
  
  // Apply additional filters if any
if (filterIds.length > 0) {
    const preFilterProductIds = await Product.distinct('_id', query);

    
    const selectedFilterDocs = await Filter.find({ _id: { $in: filterIds } })
      .populate({ path: "filter_group", select: "filtergroup_name", model: FilterGroup })
      .lean();

  
    const filtersByGroup = {};
    selectedFilterDocs.forEach(f => {
      const groupId = f.filter_group?._id?.toString() || "other";
      if (!filtersByGroup[groupId]) filtersByGroup[groupId] = [];
      filtersByGroup[groupId].push(f._id.toString());
    });

    // Step 3: OR within group, AND across groups
    const preFilterIdStrings = preFilterProductIds.map(id => id.toString());
    let matchingProductIds = new Set(preFilterIdStrings);

    for (const groupFilterIds of Object.values(filtersByGroup)) {
      const groupProductFilters = await ProductFilter.find({
        $or: [
          { product_id: { $in: preFilterIdStrings } },
          { product_id: { $in: preFilterProductIds } },
        ],
        filter_id: { $in: groupFilterIds }
      }).lean();

      const groupMatchingIds = new Set(
        groupProductFilters.map(pf => pf.product_id.toString())
      );

      matchingProductIds = new Set(
        [...matchingProductIds].filter(id => groupMatchingIds.has(id))
      );
    }

    query._id = { $in: [...matchingProductIds] };
    productsQuery = Product.find(query).populate('brand', 'brand_name brand_slug');
  }

 
    // Apply sorting: Products with quantity > 0 first, then quantity <= 0
const sort = searchParams.get('sort') || 'featured';
    
const skip = (page - 1) * limit;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    let products;

if (sort === 'price-low-high' || sort === 'price-high-low') {
      const sortDir = sort === 'price-low-high' ? 1 : -1;

       const aggregateMatch = {
        status: "Active",
        ...(categoryClauses.length ? { $or: categoryClauses } : {}),
      };

      if (brandIds.length > 0) {
        aggregateMatch.brand = { $in: brandIds.map(id => 
          mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
        )};
      }

      
      if (query._id) {
        const idList = query._id.$in;
        aggregateMatch._id = { 
          $in: idList.map(id => 
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
              { 
                special_price: { $gt: 0, $gte: minPrice, $lte: maxPrice } 
              },
              {
                $and: [
                  { $or: [{ special_price: { $exists: false } }, { special_price: null }, { special_price: 0 }] },
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

const brandAgg = await Product.aggregate([
      {
        $match: {
          status: "Active",
          ...(categoryClauses.length ? { $or: categoryClauses } : {}),
        },
      },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]);
    const brandCountMap = Object.fromEntries(
      brandAgg.map((b) => [b._id?.toString(), b.count])
    );
    const brandIdList = Object.keys(brandCountMap).filter(id => id && id !== "undefined");
    const brandDocs = await Brand.find({ _id: { $in: brandIdList } }).lean();
    const brandsWithCount = brandDocs
      .map((b) => ({ ...b, count: brandCountMap[b._id.toString()] || 0 }))
      .sort((a, b) => a.brand_name.localeCompare(b.brand_name));


    const finalFilteredProductIds = await Product.distinct('_id', query);
    const finalFilteredProductIdStrings = finalFilteredProductIds.map(id => id.toString());

    let selectedFiltersByGroup = {};
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
        let baseIds = await Product.distinct('_id', {
          status: "Active",
          $and: [
            ...(categoryClauses.length ? [{ $or: categoryClauses }] : []),
          ],
          ...(brandIds.length > 0 ? { brand: { $in: brandIds } } : {}),
        });

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

    filterAgg.forEach(item => {
      if (!filterAggMap[item._id.toString()]) {
        filterAggMap[item._id.toString()] = item.count;
      }
    });

    const filterIdList = filterAgg.map(f => f._id);
    const filterDocs = await Filter.find({ _id: { $in: filterIdList } })
      .populate({ path: "filter_group", select: "filtergroup_name filtergroup_slug", model: FilterGroup })
      .lean();

    const filtersWithGroup = filterDocs.map(f => ({
      ...f,
      filter_group_name: f.filter_group?.filtergroup_name || "Other",
      filter_group_slug: f.filter_group?.filtergroup_slug || "",
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
      hasPrev: page > 1,    
      hasMore: page < totalPages
    },
      brands: brandsWithCount,
      filters: filtersWithGroup,
  });
  } catch (error) {
    console.error('Error in /api/product/filter:', error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}