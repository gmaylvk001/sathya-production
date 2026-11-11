import dbConnect from "@/lib/db";
import ecom_category_info from "@/models/ecom_category_info";
import { resolveCategoryBySlug } from "@/lib/resolveCategorySlug";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Brand from "@/models/ecom_brand_info"; 
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import CategoryFilter from "@/models/ecom_categoryfilters_infos"; // <-- new import
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await dbConnect();

    const {sub_slug, sub_slug_one} = await params;
    const parentSlug =
      new URL(req.url).searchParams.get("parent") || sub_slug;

    const category = await resolveCategoryBySlug(sub_slug_one, parentSlug);
    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
    
    const categoryIdStr = category._id.toString();
    const catClauses = [
      { sub_category: categoryIdStr },
      { category: categoryIdStr },
    ];
    if (mongoose.Types.ObjectId.isValid(categoryIdStr)) {
      const objId = new mongoose.Types.ObjectId(categoryIdStr);
      catClauses.push({ sub_category: objId }, { category: objId });
    }
    if (category.md5_cat_name) {
      catClauses.push({
        sub_category_new: { $regex: category.md5_cat_name, $options: "i" },
      });
      catClauses.push({
        category_new: category.md5_cat_name,
      });
    }

    const products = await Product.find({
      status: "Active",
      $or: catClauses,
    }).sort({ createdAt: -1, _id: -1 });

    if (!products || products.length === 0) {
      return Response.json({ category, products: [], brands: [], filters: [] });
    }
    
     // ✅ 3. Extract valid brand IDs (skip empty/null)
    const brandIds = [
      ...new Set(
        products
          .map((p) => p.brand)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    let brandsWithCount = [];
    if (brandIds.length > 0) {
      // Fetch valid brands only
      const brands = await Brand.find({ _id: { $in: brandIds } });
       // Count products per brand
      const brandCountMap = products.reduce((acc, product) => {
        const brandId = product.brand?.toString();
        if (brandId) acc[brandId] = (acc[brandId] || 0) + 1;
        return acc;
      }, {});

      // Attach count to each brand
      brandsWithCount = brands.map((b) => ({
        ...b.toObject(),
        count: brandCountMap[b._id.toString()] || 0,
      }));
    }
    
    
    // ✅ Fetch category-level filters (new logic)
    const categoryFilters = await CategoryFilter.find({
      category_id: category._id,
    });

    const filterIds = [
      ...new Set(categoryFilters.map((cf) => cf.filter_id)),
    ];

    /* const filters = await Filter.find({ _id: { $in: filterIds } })
      .populate({
        path: "filter_group",
        select: "filtergroup_name -_id",
        model: FilterGroup,
      })
      .lean();

    const formattedFilters = filters.map((filter) => ({
      ...filter,
      filter_group_name: filter.filter_group?.filtergroup_name || "No Group",
      filter_group: filter.filter_group?._id,
    })); */

    
    /* // Extract product IDs for filtering
    const productIds = products.map(product => product._id);
    const productFilters = await ProductFilter.find({ product_id: { $in: productIds } });

    // Extract unique filter IDs
    const filterIds = [...new Set(productFilters.map(pf => pf.filter_id))]; */ 
    const filters = await Filter.find({ _id: { $in: filterIds } }).populate({
            path: 'filter_group',
            select: 'filtergroup_name filtergroup_slug',
            model: FilterGroup
          })
          .lean();
    // Add filter_group_name to filters
    const enrichedFilters = filters.map(filter => ({
        ...filter,
        filtergroup_name: filter.filter_group?.filtergroup_name || "Unknown",
        filtergroup_slug: filter.filter_group?.filtergroup_slug || "",
      }));

      const formattedFilters = filters.map(filter => ({
        ...filter,
        filter_group_name: filter.filter_group?.filtergroup_name || 'No Group',
        filter_group_slug: filter.filter_group?.filtergroup_slug || '',
        filter_group: filter.filter_group?._id // Keep original ID
      }));
    return Response.json({ category, products, brands: brandsWithCount,  filters: formattedFilters });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
