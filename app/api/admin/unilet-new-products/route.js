import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProductAllU from "@/models/product_all_u";
import OwnerProduct from "@/models/OwnerProduct";
import { requireAdmin } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/unilet-new-products
 * product_all_u records not yet in owner_products (no vendor_item_code = item_code), newest first.
 */
export async function GET(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();

    // MySQL join compared case-insensitively and ignored trailing spaces, so match the same way.
    const normalize = (code) => String(code ?? "").trim().toLowerCase();
    const linkedCodes = await OwnerProduct.distinct("vendor_item_code", { vendor_item_code: { $nin: [null, ""] } });
    const linked = new Set(linkedCodes.map(normalize));

    const rows = await ProductAllU.find({}).sort({ created_at: -1, _id: -1 }).lean();
    const products = rows.filter((row) => !linked.has(normalize(row.item_code)));

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("[unilet-new-products] GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load Unilet new products" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/unilet-new-products?id=<product_all_u _id>
 * Removes one record from product_all_u.
 */
export async function DELETE(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Valid id is required" }, { status: 400 });
    }

    await dbConnect();
    const deleted = await ProductAllU.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Product removed" });
  } catch (error) {
    console.error("[unilet-new-products] DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to remove product" }, { status: 500 });
  }
}

/**
 * POST /api/admin/unilet-new-products  { ids: [<product_all_u _id>, ...] }
 * Bulk removes records from product_all_u.
 */
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => mongoose.isValidObjectId(id)) : [];
    if (!ids.length) {
      return NextResponse.json({ success: false, error: "Select at least one product" }, { status: 400 });
    }

    await dbConnect();
    const result = await ProductAllU.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} product(s) removed`,
    });
  } catch (error) {
    console.error("[unilet-new-products] bulk delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to remove products" }, { status: 500 });
  }
}
