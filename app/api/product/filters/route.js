import connectToDatabase from "@/lib/db";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    
    // Get all parameters
    const categories = searchParams.get("categories");
    const brands = searchParams.get("brands");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const filtersParam = searchParams.get("filters");

    // Base query
    const query = {
      status: "Active",
      special_price: { 
        $gte: Number(minPrice) || 0, 
        $lte: Number(maxPrice) || 100000 
      }
    };

    // Handle category filter
    if (categories) {
      query.category = { $in: categories.split(',') };
    }

    // Handle brand filter
    if (brands) {
      query.brand = { $in: brands.split(',') };
    }

    // Handle custom filters
    if (filtersParam && filtersParam !== 'undefined') {
      try {
        const filters = JSON.parse(filtersParam);
        const filterIds = Object.values(filters).flat();
        
        if (filterIds.length > 0) {
          // Get product IDs that match filters
          const productFilters = await ProductFilter.find({
            filter_id: { $in: filterIds }
          }).distinct('product_id');

          if (productFilters.length > 0) {
            query._id = { $in: productFilters };
          }
        }
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }

    // Execute query
    const products = await Product.find(query)
      .populate('category', 'category_name')
      .populate('brand', 'brand_name')
      .sort({ stock_status: 1, createdAt: -1, _id: -1 })
      .lean();

    return NextResponse.json(products, { status: 200 });

  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}