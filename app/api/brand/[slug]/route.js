import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import Product from "@/models/product";
import ProductFilter from "@/models/ecom_productfilter_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import ecom_category_info from "@/models/ecom_category_info";

async function getCategoryTree(parentId, productCategoryIds) {
  const categories = await ecom_category_info
    .find({ parentid: parentId })
    .sort({ position: 1, category_name: 1 })
    .lean();

  let filteredCategories = [];
  for (const category of categories) {
    // keep category only if it exists in product categories OR its children have products
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
  }
  return filteredCategories;
}

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { slug } = await params;
    
    // Fetch brand
    let brand = await Brand.findOne({
      $or: [
        { brand_slug: slug },
        { brand_slug: { $regex: new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }
      ]
    });

    if (!brand) {
      const decodedName = slug.replace(/-/g, " ").trim();
      brand = await Brand.findOne({
        brand_name: { $regex: new RegExp(`^${decodedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
      });
    }

    if (!brand) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }

    const brandName = String(brand.brand_name || "").trim();
    const brandId = String(brand._id);
    const brandMatch = {
      $or: [
        { brand: brandId },
        { brand: brand._id },
        ...(brandName
          ? [
              { brand: brandName },
              { brand: new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            ]
          : []),
      ],
    };

    // Get products for this brand (stored as ObjectId string or brand name)
    const products = await Product.find({
      status: "Active",
      ...brandMatch,
    }).sort({ createdAt: -1, _id: -1 });
    
    if (!products || products.length === 0) {
      return Response.json({ brand, products: [], categories: [], filters: [] });
    }
    
     // ✅ Collect product category + subcategory IDs
    // const categoryIds = [...new Set(products.map(p => p.category))];
    // const subCategoryIds = [...new Set(products.map(p => p.sub_category))];

    const categoryIds = [
  ...new Set(
    products
      .map(p => p.category)
      .filter(id => id && id.toString().trim() !== "")
  ),
];

const subCategoryIds = [
  ...new Set(
    products
      .map(p => p.sub_category)
      .filter(id => id && id.toString().trim() !== "")
  ),
];


    // Build tree starting from main categories (Air Conditioner in your case)
    let categoryTree = [];
    for (const catId of categoryIds) {
  if (!catId || catId.toString().trim() === "") continue; // skip invalid IDs
  
  const mainCategory = await ecom_category_info.findOne({ _id: catId }).lean();
  if (!mainCategory) continue;

  const subTree = await getCategoryTree(mainCategory._id, subCategoryIds);
  categoryTree.push({
    ...mainCategory,
    subCategories: subTree
  });
}


    
    // Extract product IDs for filtering
    const productIds = products.map(product => product._id);
    const productFilters = await ProductFilter.find({ product_id: { $in: productIds } });
    
    // Extract unique filter IDs
    const filterIds = [...new Set(productFilters.map(pf => pf.filter_id))];
    const filters = await Filter.find({ _id: { $in: filterIds } }).populate({
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

    return Response.json({ 
      brand, 
      products, 
      categories: categoryTree, 
      filters: formattedFilters 
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}