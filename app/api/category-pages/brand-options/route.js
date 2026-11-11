import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";

/** GET /api/category-pages/brand-options */
export async function GET() {
  try {
    await dbConnect();
    const brands = await Brand.find({ status: "Active" })
      .select("brand_name brand_slug")
      .sort({ brand_name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      options: brands.map((b) => ({
        _id: String(b._id),
        brand_name: b.brand_name,
        brand_slug: b.brand_slug,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
