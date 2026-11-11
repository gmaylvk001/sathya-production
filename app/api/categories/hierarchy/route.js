import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    await dbConnect();

    const categories = await Category.find({ status: "Active" })
      .select("_id category_name category_slug parentid position")
      .sort({ position: 1, category_name: 1 })
      .lean();

    // Separate parent categories (parentid === "none") from children
    const parents = categories
      .filter(c => !c.parentid || c.parentid === "none")
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    const children = categories.filter(c => c.parentid && c.parentid !== "none");

    // Build map: parentId → [active child categories]
    const childrenMap = {};
    for (const child of children) {
      const pid = child.parentid.toString();
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push({
        _id: child._id,
        category_name: child.category_name,
        category_slug: child.category_slug,
        position: child.position,
      });
    }

    Object.keys(childrenMap).forEach((pid) => {
      childrenMap[pid].sort(
        (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)
      );
    });

    // Attach children to each parent
    const hierarchy = parents.map(p => ({
      _id: p._id,
      category_name: p.category_name,
      category_slug: p.category_slug,
      children: childrenMap[p._id.toString()] || [],
    }));

    return NextResponse.json({ success: true, categories, hierarchy }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
