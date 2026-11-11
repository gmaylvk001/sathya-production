import dbConnect from "@/lib/db";
import Product from "@/models/Product_all";
import { NextResponse } from "next/server";
import Wishlist from "@/models/ecom_wishlist_info";
import Filter from '@/models/ecom_filter_infos';
import ProductFilter from '@/models/ecom_productfilter_info';
import Products from "@/models/product";

export async function GET() {
  try {
    await dbConnect();
    
    // Get all products from Products table to check existing item_codes
    const existingProducts = await Products.find({}, 'item_code').lean();
    
    // Create a Set of existing item_codes for faster lookup
    const existingItemCodes = new Set(existingProducts.map(p => p.item_code));
    
    // Get all products from Product table and filter out those with existing item_codes
    const allProducts = await Product.find({}).lean();
    const products = allProducts.filter(product => 
      !existingItemCodes.has(product.item_code)
    );

    const wishlistedItems = await Wishlist.find({}, 'productId userId').lean();
    const ProductFilteritems = await ProductFilter.find({}).lean();
    const Filteritems = await Filter.find({}).lean();

    // Create a map of productId => wishlist data
    const wishlistMap = new Map();
    wishlistedItems.forEach(item => {
      wishlistMap.set(item.productId.toString(), item);
    });

    // Map product_id => [ Product_filter items ]
    const filterMap = new Map();
    ProductFilteritems.forEach(item => {
      const key = item.product_id.toString();
      if (!filterMap.has(key)) {
        filterMap.set(key, []);
      }
      filterMap.get(key).push(item);
    });

    // Map filter_id => Filter details
    const filtersMap = new Map();
    Filteritems.forEach(item => {
      filtersMap.set(item._id.toString(), item);
    });

    // Add filters and wishlist to products
    const productsWithWishlist = products.map(product => {
      const wishlist = wishlistMap.get(product._id.toString()) || null;

      const filtersdata = filterMap.get(product._id.toString()) || [];

      // Full filter details
      const filterDetails = filtersdata
        .map(f => filtersMap.get(f.filter_id?.toString()))
        .filter(Boolean);

      return {
        ...product,
        wishlist,
        filterDetails, // ✅ all full filter info here
      };
    });

    return NextResponse.json(productsWithWishlist, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}