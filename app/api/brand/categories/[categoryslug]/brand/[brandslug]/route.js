import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import ecom_category_info from "@/models/ecom_category_info";
import { brandMatchQuery } from "@/lib/brandMatchQuery";
 
async function getCategoryTree(parentId, productCategoryIds = null) {
  const categories = await ecom_category_info
    .find({ parentid: parentId })
    .sort({ position: 1, category_name: 1 })
    .lean();
 
  let filteredCategories = [];
  for (const category of categories) {
    if (productCategoryIds) {
      if (productCategoryIds.includes(category._id.toString())) {
        category.subCategories = await getCategoryTree(category._id, productCategoryIds);
        filteredCategories.push(category);
      } else {
        const children = await getCategoryTree(category._id, productCategoryIds);
        if (children.length > 0) {
          category.subCategories = children;
          filteredCategories.push(category);
        }
      }
    } else {
      category.subCategories = await getCategoryTree(category._id);
      filteredCategories.push(category);
    }
  }
 
  return filteredCategories;
}

// Helper function to get all subcategory IDs for a category
async function getAllSubCategoryIds(categoryId) {
  const subCategories = await ecom_category_info.find({ parentid: categoryId }).select('_id').lean();
  let allIds = [categoryId.toString()];
  
  for (const subCat of subCategories) {
    const childIds = await getAllSubCategoryIds(subCat._id);
    allIds = [...allIds, ...childIds];
  }
  
  return allIds;
}
 
export async function GET(request, { params }) {
  try {
    await dbConnect();
 
    const { categoryslug, brandslug } = await params;
    console.log("Fetching data for:", categoryslug, brandslug);
   
    // Fetch category and brand (supporting bidirectional URL order: category/brand or brand/category)
    let category = await ecom_category_info.findOne({
      $or: [
        { category_slug: categoryslug },
        { category_slug: { $regex: new RegExp(`^${categoryslug}$`, "i") } },
      ],
    });
    let brand = await Brand.findOne({
      $or: [
        { brand_slug: brandslug },
        { brand_slug: { $regex: new RegExp(`^${brandslug}$`, "i") } },
      ],
    });

    // If not found in direct order, try swapped order
    if (!category || !brand) {
      const swappedCategory = await ecom_category_info.findOne({
        $or: [
          { category_slug: brandslug },
          { category_slug: { $regex: new RegExp(`^${brandslug}$`, "i") } },
        ],
      });
      const swappedBrand = await Brand.findOne({
        $or: [
          { brand_slug: categoryslug },
          { brand_slug: { $regex: new RegExp(`^${categoryslug}$`, "i") } },
        ],
      });

      if (swappedCategory && swappedBrand) {
        category = swappedCategory;
        brand = swappedBrand;
      }
    }

    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
   
    if (!brand) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }

    // Get ALL category IDs in the current category tree
    const allCategoryIdsInTree = await getAllSubCategoryIds(category._id);
    console.log("Category tree IDs:", allCategoryIdsInTree);
 
    // Get products ONLY from the current category tree
    const products = await Product.find({
      status: "Active",
      $and: [
        brandMatchQuery(brand),
        {
          $or: [
            { category: { $in: allCategoryIdsInTree } },
            { sub_category: { $in: allCategoryIdsInTree } }
          ],
        },
      ],
    }).sort({ createdAt: -1, _id: -1 });
   
    if (!products || products.length === 0) {
      return Response.json({
        category,
        brand,
        products: [],
        categories: [],
        filters: [],
        allCategoryIds: allCategoryIdsInTree // Important for frontend filtering
      });
    }
   
    // Build category tree with only categories that have products
    const productSubCategoryIds = [...new Set(
      products.map(p => p.sub_category?.toString()).filter(Boolean)
    )];
    
    const categoryTree = await getCategoryTree(
      category._id,
      productSubCategoryIds
    );
   
    // Extract product IDs for filtering
    const productIds = products.map(product => product._id);
    
    // Get product filters ONLY for products in current category tree
    const productFilters = await ProductFilter.find({ 
      product_id: { $in: productIds } 
    });
   
    // Extract unique filter IDs
    const filterIds = [...new Set(productFilters.map(pf => pf.filter_id))];
    
    // Get filters and ensure they're scoped to current category tree
    const filters = await Filter.find({ 
      _id: { $in: filterIds },
      // Add category scoping to filters if your Filter model has category association
      $or: [
        { category: { $in: allCategoryIdsInTree } }, // If filters are category-specific
        { category: { $exists: false } }, // Include global filters
        { category: null } // Include filters without category association
      ]
    }).populate({
      path: 'filter_group',
      select: 'filtergroup_name filtergroup_slug',
      model: FilterGroup
    }).lean();
   
    // Format filters
    const formattedFilters = filters.map(filter => ({
      ...filter,
      filter_group_name: filter.filter_group?.filtergroup_name || 'No Group',
      filter_group_slug: filter.filter_group?.filtergroup_slug || '',
      filter_group: filter.filter_group?._id
    }));

    console.log(`Found ${formattedFilters.length} filters for category tree`);
    console.log("Filter groups:", [...new Set(formattedFilters.map(f => f.filter_group_name))]);
 
    return Response.json({
      category,
      brand,
      products,
      categories: categoryTree,
      filters: formattedFilters,
      allCategoryIds: allCategoryIdsInTree // Crucial for frontend filtering
    });
  } catch (error) {
    console.error("Error in category-brand API:", error);
    return Response.json({ error: "Error fetching category brand details" }, { status: 500 });
  }
}