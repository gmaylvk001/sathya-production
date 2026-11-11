/* // api/categoryproduct/get/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryProduct from "@/models/categoryproduct";
import Category from "@/models/ecom_category_info"; // Import the Category model
import Product from "@/models/product";

export async function GET() {
  try {
    await connectDB();
    
    // First get all active category products
    const categoryProducts = await CategoryProduct.find({ status: "Active" })
      .sort({ position: 1 })
      .lean();

    // Get all subcategory IDs and product IDs
    const subcategoryIds = categoryProducts.map(cp => cp.subcategoryId);
    const allProductIds = categoryProducts.flatMap(cp => cp.products || []);
    
    // Fetch all subcategories in one query
    const subcategories = await Category.find({
      _id: { $in: subcategoryIds }
    })
    .select('category_name category_slug parentid')
    .lean();

    // Create a map for quick subcategory lookup
    const subcategoryMap = {};
    subcategories.forEach(cat => {
      subcategoryMap[cat._id.toString()] = cat;
    });

    // Fetch all products that meet the criteria in one query
    const validProducts = await Product.find({
      _id: { $in: allProductIds },
      quantity: { $gt: 2 },
      special_price: { $gt: 2 }
    })
    .select('name slug images price special_price quantity stock_status brand lsp')
    .lean();
    // Create a map for quick product lookup
    const productMap = {};
    validProducts.forEach(product => {
      productMap[product._id.toString()] = product;
    });

    // Combine the data
    const categoryProductsWithData = await Promise.all(
      categoryProducts.map(async (cp) => {
        const subcategory = subcategoryMap[cp.subcategoryId.toString()];
        const filteredProducts = await Product.find({
          _id: { $in: cp.products },
          quantity: { $gt: 0 },
          special_price: { $gt: 2 },
          $or: [
            { model_number: { $exists: false } },
            { model_number: { $exists: true, $ne: "" } }
          ]
        }).lean();
        return {
          ...cp,
          subcategoryId: subcategory,
          products: filteredProducts,
        };
      })
    );  


    // Filter out category products with no valid products
    const filteredCategoryProducts = categoryProductsWithData.filter(
      cp => cp.products && cp.products.length > 0
    );

    return NextResponse.json({ 
      ok: true, 
      data: filteredCategoryProducts ,
      validProducts:validProducts
    }, { status: 200 });
    
  } catch (err) {
    console.error("Error fetching category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} */

  // api/categoryproduct/get/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryProduct from "@/models/categoryproduct";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";

export async function GET() {
  try {
    await connectDB();

    // 1️⃣ Get active category products
    const categoryProducts = await CategoryProduct.find({ status: "Active" })
      .sort({ position: 1 })
      .lean();

    // 2️⃣ Collect IDs
    const subcategoryIds = categoryProducts.map(cp => cp.subcategoryId);
    const allProductIds = categoryProducts.flatMap(cp => cp.products || []);

    // 3️⃣ Get subcategories
    const subcategories = await Category.find({
      _id: { $in: subcategoryIds }
    })
      .select("category_name category_slug parentid")
      .lean();

    const subcategoryMap = {};
    subcategories.forEach(cat => {
      subcategoryMap[cat._id.toString()] = cat;
    });

    // 4️⃣ Get all valid products (single query)
    const allProducts = await Product.find({
      _id: { $in: allProductIds },
      status: "Active",
      $or: [
        { quantity: { $gt: 0 } },
        { stock_status: "In Stock" },
      ],
      $and: [
        {
          $or: [
            { special_price: { $gt: 2 } },
            { price: { $gt: 2 } }
          ]
        }
      ]
    })
      .select("name slug images price special_price quantity stock_status brand category sub_category lsp")
      .lean();

    // 4️⃣b Fetch fallback products for each subcategoryId in bulk
    const subcatObjectIds = subcategoryIds
      .map(id => id ? id.toString() : null)
      .filter(Boolean);

    const fallbackProducts = await Product.find({
      status: "Active",
      $or: [
        { sub_category: { $in: subcatObjectIds } },
        { category: { $in: subcatObjectIds } },
      ],
      $and: [
        {
          $or: [
            { quantity: { $gt: 0 } },
            { stock_status: "In Stock" },
          ]
        },
        {
          $or: [
            { special_price: { $gt: 2 } },
            { price: { $gt: 2 } }
          ]
        }
      ]
    })
      .select("name slug images price special_price quantity stock_status brand category sub_category lsp")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    const categoryFallbackProducts = {};
    fallbackProducts.forEach((p) => {
      const subKey = p.sub_category?.toString();
      const catKey = p.category?.toString();
      if (subKey) {
        if (!categoryFallbackProducts[subKey]) categoryFallbackProducts[subKey] = [];
        categoryFallbackProducts[subKey].push(p);
      }
      if (catKey && catKey !== subKey) {
        if (!categoryFallbackProducts[catKey]) categoryFallbackProducts[catKey] = [];
        categoryFallbackProducts[catKey].push(p);
      }
    });

    // 5️⃣ Product Map
    const productMap = {};
    allProducts.forEach(p => {
      productMap[p._id.toString()] = p;
    });

    // 6️⃣ Build response with BRAND UNIQUE LOGIC
    const categoryProductsWithData = categoryProducts.map(cp => {
      const subcategory = subcategoryMap[cp.subcategoryId.toString()];

      // Get products for this category
      let cpProducts = (cp.products || [])
        .map(id => productMap[id.toString()])
        .filter(Boolean);

      // If explicit configured product IDs yielded 0 items, fallback to category's active products
      if (cpProducts.length === 0 && cp.subcategoryId) {
        const subIdStr = cp.subcategoryId.toString();
        cpProducts = categoryFallbackProducts[subIdStr] || [];
      }

      // 🔥 GROUP BY BRAND (pick highest quantity product)
      /* const brandMap = {};

      cpProducts.forEach(product => {
        const brandId = product.brand?.toString();
        if (!brandId) return;

        if (
          !brandMap[brandId] ||
          product.quantity > brandMap[brandId].quantity
        ) {
          brandMap[brandId] = product;
        }
      });

      // Convert to array
      // const uniqueBrandProducts = Object.values(brandMap);
      const uniqueBrandProducts = Object.values(brandMap)
        .sort((a, b) => b.quantity - a.quantity); // ✅ ADD THIS */

        // 🔥 GROUP BY BRAND (pick highest quantity product)
        /* const brandMap = {};

        cpProducts.forEach(product => {
          const brandId = product.brand?.toString();
          if (!brandId) return;

          if (
            !brandMap[brandId] ||
            product.quantity > brandMap[brandId].quantity
          ) {
            brandMap[brandId] = product;
          }
        });

        // ✅ SORT BY HIGHEST QUANTITY
        const uniqueBrandProducts = Object.values(brandMap)
          .sort((a, b) => b.quantity - a.quantity);

      return {
        ...cp,
        subcategoryId: subcategory,
        products: uniqueBrandProducts, // ✅ FINAL OUTPUT
      }; */

      // 🔥 GROUP PRODUCTS BY BRAND
const brandGroups = {};

cpProducts.forEach(product => {
  const brandId = product.brand?.toString();
  if (!brandId) return;

  if (!brandGroups[brandId]) {
    brandGroups[brandId] = [];
  }

  brandGroups[brandId].push(product);
});

// ✅ Sort each brand's products (optional: by quantity)
Object.values(brandGroups).forEach(group => {
  group.sort((a, b) => b.quantity - a.quantity);
});

// 🔥 STEP 1: First round (1 per brand)
const finalProducts = [];
// const brandEntries = Object.entries(brandGroups);
const brandEntries = Object.entries(brandGroups).sort(
  (a, b) => (b[1][0]?.quantity || 0) - (a[1][0]?.quantity || 0)
);

// First round
brandEntries.forEach(([brandId, products]) => {
  if (products.length > 0) {
    finalProducts.push(products.shift());
  }
});

// 🔥 STEP 2: Continue based on remaining count (DESC)
let remainingBrands = brandEntries.filter(([_, products]) => products.length > 0);

while (remainingBrands.length > 0) {
  // sort brands by remaining product count
  remainingBrands.sort((a, b) => b[1].length - a[1].length);

  for (let i = 0; i < remainingBrands.length; i++) {
    const [brandId, products] = remainingBrands[i];

    if (products.length > 0) {
      finalProducts.push(products.shift());
    }
  }

  // remove empty brands
  remainingBrands = remainingBrands.filter(([_, products]) => products.length > 0);
}

// ✅ FINAL OUTPUT
return {
  ...cp,
  subcategoryId: subcategory,
  products: finalProducts,
};
    });

    // 7️⃣ Remove empty categories
    const filteredCategoryProducts = categoryProductsWithData.filter(
      cp => cp.products && cp.products.length > 0
    );

    return NextResponse.json(
      {
        ok: true,
        data: filteredCategoryProducts,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("Error fetching category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}