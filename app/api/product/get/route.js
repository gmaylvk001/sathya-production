import dbConnect from "@/lib/db";
import Product from "@/models/product";
import { NextResponse } from "next/server";
import Wishlist from "@/models/ecom_wishlist_info";
import Filter from '@/models/ecom_filter_infos';
import FilterGroup from '@/models/ecom_filter_group_infos';
import ProductFilter from '@/models/ecom_productfilter_info';

/**
 * GET /api/product/get
 * - With ?field=a,b,c → light projection only (fast; used by search cache helpers)
 * - Without field → full catalog + wishlist + filters (existing behavior)
 */
export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const fieldParam = searchParams.get("field");

    // Fast path: only requested fields, Active products, no wishlist/filter joins
    if (fieldParam) {
      const fields = fieldParam
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const projection = { _id: 1 };
      for (const f of fields) {
        projection[f] = 1;
      }
      // Common search/display extras if callers ask for images/name/slug
      if (!projection.slug) projection.slug = 1;
      if (!projection.status) projection.status = 1;

      const products = await Product.find({ status: "Active" })
        .select(projection)
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json(products, { status: 200 });
    }

    const products            = await Product.find({}) .sort({ createdAt: -1 }) .lean();
    const wishlistedItems     = await Wishlist.find({}, 'productId userId').lean();

    const ProductFilteritems  = await ProductFilter.find({}).lean();
    const Filteritems         = await Filter.find({}).lean();

    const FilterGroups        = await FilterGroup.find({}).lean();
    const sizeGroup           = FilterGroups.find(group => group.filtergroup_name.toLowerCase() === "size");


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
      const wishlist          = wishlistMap.get(product._id.toString()) || null;
      const filtersdata       = filterMap.get(product._id.toString()) || [];

      // Full filter details
      const filterDetails     = filtersdata.map(f => filtersMap.get(f.filter_id?.toString())).filter(Boolean);
      const sizeFilterDetails = filterDetails.filter(f => {
        return f.filter_group?.toString() === sizeGroup?._id.toString();
      });

      return {
        ...product,
        wishlist,
        filterDetails,
        sizeFilterDetails,
      };
    });

    return NextResponse.json(productsWithWishlist, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
