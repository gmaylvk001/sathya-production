import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('categorySlug');

    console.log("=== CATEGORY FILTER API ===");
    console.log("Looking for category with slug/name:", categorySlug);

    // STEP 1: Find category by slug OR name (since slugs are empty)
    let category = null;
    
    // First try to find by slug (might be empty)
    if (categorySlug) {
      category = await Category.findOne({ slug: categorySlug });
    }
    
    // If not found by slug, try by name (convert slug back to name)
    if (!category && categorySlug) {
      // Convert slug-like string to readable name
      // "large-appliance" -> "Large Appliance"
      const categoryName = categorySlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      console.log("Trying to find category by name:", categoryName);
      
      category = await Category.findOne({ 
        name: { $regex: new RegExp(categoryName, 'i') } 
      });
    }
    
    // Last resort: get first category
    if (!category) {
      category = await Category.findOne({});
      console.log("Using first available category:", category?.name);
    }

    if (!category) {
      return Response.json({
        success: false,
        error: "No categories found in database",
        products: [],
        total: 0
      });
    }

    console.log("Using category:", {
      id: category._id,
      name: category.name,
      slug: category.slug || "No slug"
    });

    // STEP 2: Get all subcategories
    const getAllSubcategoryIds = async (parentId) => {
      const subcategories = await Category.find({ parent: parentId });
      let allIds = subcategories.map(cat => cat._id);
      
      for (const subcat of subcategories) {
        const nestedIds = await getAllSubcategoryIds(subcat._id);
        allIds = [...allIds, ...nestedIds];
      }
      
      return allIds;
    };

    const subcategoryIds = await getAllSubcategoryIds(category._id);
    const allCategoryIds = [category._id, ...subcategoryIds].map(id => id.toString());
    
    console.log("Category IDs to filter:", allCategoryIds);

    // STEP 3: Build the product query
    const query = {
      status: "Active",
      $or: [
        { category: { $in: allCategoryIds } },
        { sub_category: { $in: allCategoryIds } }
      ]
    };

    // Add brand filter
    const brandIds = searchParams.get('brands')?.split(',').filter(id => id) || [];
    if (brandIds.length > 0) {
      query.brand = { $in: brandIds };
    }

    // Add price filter
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || 1000000;
    
    if (minPrice > 0 || maxPrice < 1000000) {
      query.$and = [{
        $or: [
          {
            $and: [
              { special_price: { $gte: minPrice, $lte: maxPrice } },
              { special_price: { $gt: 0 } }
            ]
          },
          {
            $and: [
              { price: { $gte: minPrice, $lte: maxPrice } },
              {
                $or: [
                  { special_price: { $exists: false } },
                  { special_price: null },
                  { special_price: 0 },
                  { special_price: "" }
                ]
              }
            ]
          }
        ]
      }];
    }

    console.log("Product query:", JSON.stringify(query, null, 2));

    // STEP 4: Get products with pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate('brand', 'brand_name brand_slug')
        .populate('category', 'name')
        .populate('sub_category', 'name')
        .sort({ stock_status: 1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    console.log(`Found ${products.length} products out of ${totalProducts}`);

    return Response.json({
      success: true,
      category: {
        name: category.name,
        id: category._id,
        note: category.slug ? "Has slug" : "No slug in database"
      },
      products,
      total: totalProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        hasMore: page < Math.ceil(totalProducts / limit)
      }
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({
      success: false,
      error: error.message,
      products: [],
      total: 0
    }, { status: 500 });
  }
}