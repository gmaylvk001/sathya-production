import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import { getFiltersForProductIds } from "@/lib/availableProductFilters";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
   // console.log(searchParams);
   // const categoryId = searchParams.get('categoryId');
    const sub_category_new = searchParams.get('sub_category_new');
    const brandIds = searchParams.get('brands')?.split(',') || [];
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 1000000;
    const filterIds = searchParams.get('filters')?.split(',') || [];
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 5;
    const sort = searchParams.get('sort') || 'featured';
    // Base query - always filter by category
   let query = { sub_category_new: {
        $regex: sub_category_new,
        $options: "i"
      }, status: "Active", quantity: { $gt: 0 }
 };


    // Add brand filters if any
    if (brandIds.length > 0) {
      query.brand = { $in: brandIds };
    }
    
    // Price range filter 
query.$or = [
  // special_price 
  { 
    special_price: { $ne: null, $gt: 0, $gte: minPrice, $lte: maxPrice }
  },
  // special_price
  { 
    $and: [
      { $or: [{ special_price: null }, { special_price: 0 }] },
      { price: { $gte: minPrice, $lte: maxPrice } }
    ]
  }
];
    
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
      
    //   // Group filters by product
    //   const filtersByProduct = productFilters.reduce((acc, pf) => {
    //     const productId = pf.product_id.toString();
    //     if (!acc[productId]) acc[productId] = new Set();
    //     acc[productId].add(pf.filter_id.toString());
    //     return acc;
    //   }, {});
      
    //   // Filter products to only those that have ALL selected filters
    //   products = products.filter(product => {
    //     const productId = product._id.toString();
    //     const productFilterIds = filtersByProduct[productId] || new Set();
    //     //return filterIds.every(fid => productFilterIds.has(fid));
    //     return filterIds.some(fid => productFilterIds.has(fid));
    //   });
    // }
    
    // return Response.json(products);


       let productsQuery = Product.find(query)
        .populate('brand', 'brand_name brand_slug');
      
      // Apply additional filters if any
      if (filterIds.length > 0) {
        const productIds = await productsQuery.distinct('_id');
        
        const productFilters = await ProductFilter.find({
          product_id: { $in: productIds },
          filter_id: { $in: filterIds }
        });
        
        const filtersByProduct = productFilters.reduce((acc, pf) => {
          const productId = pf.product_id.toString();
          if (!acc[productId]) acc[productId] = new Set();
          acc[productId].add(pf.filter_id.toString());
          return acc;
        }, {});
        
        // Get only product IDs that match all filters
        const filteredProductIds = productIds.filter(id => {
          const productId = id.toString();
          const productFilterIds = filtersByProduct[productId] || new Set();
          return filterIds.some(fid => productFilterIds.has(fid));
        });
        
        // Update the query to only include filtered products
        query._id = { $in: filteredProductIds };
        productsQuery = Product.find(query).populate('brand', 'brand_name brand_slug');
      }

   
    const skip = (page - 1) * limit;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

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
    
    const allProductIds = await Product.distinct('_id', query);
    const filters = await getFiltersForProductIds(allProductIds);

    return Response.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNext: page < totalPages,
        hasPrev: page > 1,
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