import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ecom_category_info from "@/models/ecom_category_info";

/**
 * GET /api/category-topbanner/category-options?pageType=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const pageType = new URL(req.url).searchParams.get("pageType") || "category";

    const all = await ecom_category_info
      .find({ status: "Active" })
      .select("_id category_name category_slug parentid")
      .sort({ position: 1, category_name: 1 })
      .lean();

    const byId = new Map(all.map((c) => [String(c._id), c]));
    const isRoot = (c) => !c.parentid || c.parentid === "none";

    let options = [];
    if (pageType === "category") {
      options = all.filter(isRoot);
    } else if (pageType === "sub_category") {
      options = all.filter((c) => {
        if (isRoot(c)) return false;
        const parent = byId.get(String(c.parentid));
        return parent && isRoot(parent);
      });
    } else {
      options = all.filter((c) => {
        if (isRoot(c)) return false;
        const parent = byId.get(String(c.parentid));
        if (!parent || isRoot(parent)) return false;
        const grand = byId.get(String(parent.parentid));
        return grand && isRoot(grand);
      });
    }

    return NextResponse.json({
      success: true,
      options: options.map((c) => ({
        _id: c._id,
        category_name: c.category_name,
        category_slug: c.category_slug,
        parent_name: byId.get(String(c.parentid))?.category_name || null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
