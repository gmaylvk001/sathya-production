import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductView from "@/models/productView";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const { category, products, status } = body;

    if (!category || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "Category and products are required" },
        { status: 400 }
      );
    }

    // Check if a ProductView already exists for this category
    let productView = await ProductView.findOne({ category });

    if (productView) {
      // Update existing ProductView
      productView.products = products;
      if (status) productView.status = status;
      await productView.save();
    } else {
      // Create new ProductView
      productView = new ProductView({
        category,
        products,
        status: status || "active",
      });
      await productView.save();
    }

    return NextResponse.json({
      success: true,
      message: "Products saved successfully",
      data: productView,
    });
  } catch (err) {
    console.error("Error saving products:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}