import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch active categories
    const allCategories = await Category.find({ status: "Active" })
      .select("_id category_name category_slug md5_cat_name parentid position")
      .sort({ position: 1, category_name: 1 })
      .lean();

    // Build lookup maps by _id and md5_cat_name
    const categoryById = new Map();
    const categoryByMd5 = new Map();

    for (const cat of allCategories) {
      categoryById.set(String(cat._id), cat);
      if (cat.md5_cat_name) {
        categoryByMd5.set(String(cat.md5_cat_name).trim(), cat);
      }
    }

    const isRoot = (cat) => !cat.parentid || cat.parentid === "none" || cat.parentid === "0";

    const getParent = (cat) => {
      if (isRoot(cat)) return null;
      const pid = String(cat.parentid).trim();
      return categoryById.get(pid) || categoryByMd5.get(pid) || null;
    };

    const rootCategories = [];
    const subCategories = [];
    const childCategories = [];

    for (const cat of allCategories) {
      if (isRoot(cat)) {
        rootCategories.push({
          _id: String(cat._id),
          name: cat.category_name,
          slug: cat.category_slug,
          md5: cat.md5_cat_name,
        });
      } else {
        const parent = getParent(cat);
        if (!parent || isRoot(parent)) {
          // Level 2 (Sub Category)
          subCategories.push({
            _id: String(cat._id),
            name: cat.category_name,
            slug: cat.category_slug,
            md5: cat.md5_cat_name,
            parentId: parent ? String(parent._id) : String(cat.parentid),
            parentName: parent?.category_name || null,
          });
        } else {
          // Level 3 (Child Category)
          childCategories.push({
            _id: String(cat._id),
            name: cat.category_name,
            slug: cat.category_slug,
            md5: cat.md5_cat_name,
            parentId: String(parent._id),
            parentName: parent.category_name,
            grandParentId: String(getParent(parent)?._id || ""),
          });
        }
      }
    }

    // 2. Fetch distinct movements from active products
    const rawMovements = await Product.distinct("movement", {
      status: "Active",
      movement: { $exists: true, $ne: "" },
    });

    const cleanMovements = rawMovements
      .filter((m) => typeof m === "string" && m.trim().length > 0)
      .map((m) => m.trim())
      .sort((a, b) => {
        // Sort Fast-* movements first
        const aFast = a.toLowerCase().startsWith("fast") || a.toLowerCase() === "focus";
        const bFast = b.toLowerCase().startsWith("fast") || b.toLowerCase() === "focus";
        if (aFast && !bFast) return -1;
        if (!aFast && bFast) return 1;
        return a.localeCompare(b);
      });

    return NextResponse.json({
      success: true,
      categories: rootCategories,
      subCategories,
      childCategories,
      movements: cleanMovements,
    });
  } catch (error) {
    console.error("category-product-carousel/filter-options error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
