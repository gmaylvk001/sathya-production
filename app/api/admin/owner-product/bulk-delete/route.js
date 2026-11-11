import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import { requireAdmin } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/owner-product/bulk-delete
 * Body: { ids: [OwnerProduct _id, ...] }
 */
export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? [...new Set(body.ids.map((id) => String(id || "").trim()))].filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (!ids.length) {
      return NextResponse.json({ success: false, message: "Select at least one product to delete" }, { status: 400 });
    }

    await dbConnect();
    const result = await OwnerProduct.deleteMany({ _id: { $in: ids }, owner_id: "unilet" });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `${result.deletedCount || 0} Unilet product(s) deleted`,
    });
  } catch (error) {
    console.error("Unilet products bulk delete error:", error);
    return NextResponse.json({ success: false, message: error.message || "Bulk delete failed" }, { status: 500 });
  }
}
