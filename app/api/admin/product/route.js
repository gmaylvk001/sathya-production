import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ExtendedWarranty from "@/models/ecom_products_extended_warrent";
import Category from "@/models/ecom_category_info";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const subCategory = (searchParams.get("sub_category") || "").trim();
    const brand = (searchParams.get("brand") || "").trim();
    const stock = (searchParams.get("stock") || "").trim();

    const filterQuery = {};

    // 1. Status Filter
    if (status && status !== "All Statuses") {
      filterQuery.status = status;
    }

    // 2. Stock Filter
    if (stock === "In Stock" || stock === "Out of Stock") {
      filterQuery.stock_status = stock;
    }

    // 3. Brand Filter
    if (brand && brand !== "All Brands") {
      filterQuery.brand = brand;
    }

    // 4. Category / SubCategory Filter
    if (subCategory && subCategory !== "All Property") {
      filterQuery.$or = [
        { category: subCategory },
        { sub_category: subCategory },
        { category_new: subCategory }
      ];
    } else if (category && category !== "All Categories") {
      const allCategories = await Category.find({}, "_id parentid md5_cat_name").lean();
      
      const getAllChildIds = (parentId) => {
        let childIds = [];
        const children = allCategories.filter((cat) => cat.parentid === parentId);
        children.forEach((child) => {
          childIds.push(child._id.toString());
          childIds = [...childIds, ...getAllChildIds(child._id.toString())];
        });
        return childIds;
      };

      const childIds = getAllChildIds(category);
      const allRelatedIds = [category, ...childIds];
      const relatedMd5s = allRelatedIds
        .map((id) => allCategories.find((c) => c._id.toString() === id)?.md5_cat_name)
        .filter(Boolean)
        .map((m) => m.toLowerCase());

      filterQuery.$or = [
        { category: { $in: allRelatedIds } },
        { sub_category: { $in: allRelatedIds } },
        { sub_category_new: { $in: relatedMd5s } }
      ];
    }

    // 5. Multi-token Search Filter across Name, Item Code, Slug, Model, and Brand
    if (search) {
      const tokens = search.split(/\s+/).filter(Boolean);
      const andClauses = tokens.map((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        return {
          $or: [
            { name: regex },
            { item_code: regex },
            { slug: regex },
            { model_number: regex },
            { brand: regex }
          ]
        };
      });

      if (filterQuery.$and) {
        filterQuery.$and.push(...andClauses);
      } else {
        filterQuery.$and = andClauses;
      }
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (stock === "stock_low_high") {
      sortOptions = { quantity: 1, createdAt: -1 };
    } else if (stock === "stock_high_low") {
      sortOptions = { quantity: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filterQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery)
    ]);

    // Fetch Extended Warranties ONLY for these 25 products
    const itemCodes = products.map((p) => p.item_code).filter(Boolean);
    const warranties = itemCodes.length > 0
      ? await ExtendedWarranty.find({ item_code: { $in: itemCodes } }).lean()
      : [];

    const productsWithWarranty = products.map((prod) => {
      const w = warranties.find((item) => item.item_code === prod.item_code);
      return {
        ...prod,
        extend_warranty: w ? w.extend_warranty : (prod.extend_warranty || []),
        variants: Array.isArray(prod.variants) ? prod.variants : []
      };
    });

    return NextResponse.json({
      success: true,
      products: productsWithWarranty,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Admin products fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

