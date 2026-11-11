import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/product";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "products");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectDB();

    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Soft-delete: inactivate instead of hard delete
    const deletedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: { status: "Inactive", stock_status: "Out of Stock" } },
      { new: true }
    );

    if (!deletedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product inactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("🔥 Error inactivating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
