import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const parentSlug = String(searchParams.get("parentSlug") || "").trim();

    if (!parentSlug) {
      return NextResponse.json(
        { success: false, message: "parentSlug is required", subcategories: [] },
        { status: 400 }
      );
    }

    const parent = await Category.findOne({
      category_slug: parentSlug,
      status: { $in: ["Active", "active"] },
    }).lean();

    if (!parent) {
      return NextResponse.json({ success: true, subcategories: [] });
    }

    const subcategories = await Category.find({
      parentid: String(parent._id),
      status: { $in: ["Active", "active"] },
    })
      .sort({ category_name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      parent: {
        _id: parent._id,
        category_name: parent.category_name,
        category_slug: parent.category_slug,
      },
      subcategories,
    });
  } catch (error) {
    console.error("subcategories error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", subcategories: [] },
      { status: 500 }
    );
  }
}
