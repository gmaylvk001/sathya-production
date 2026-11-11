import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductView from "@/models/productView";

// GET single product view
export async function GET(req, { params }) {
  await dbConnect();
  
  try {
    const { id } = params;
    
    const productView = await ProductView.findById(id)
      .populate("category")
      .populate("products", "name price");
    
    if (!productView) {
      return NextResponse.json(
        { success: false, message: "ProductView not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: productView
    });
  } catch (err) {
    console.error("Error fetching product view:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update product view
export async function PUT(req, { params }) {
  await dbConnect();
  
  try {
    const { id } = params;
    const body = await req.json();
    const { category, products, status } = body;

    if (!category || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "Category and products are required" },
        { status: 400 }
      );
    }

    const productView = await ProductView.findByIdAndUpdate(
      id,
      {
        category,
        products,
        status: status || "active",
      },
      { new: true, runValidators: true }
    )
      .populate("category", "category_name")
      .populate("products", "name price");

    if (!productView) {
      return NextResponse.json(
        { success: false, message: "ProductView not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ProductView updated successfully",
      data: productView,
    });
  } catch (err) {
    console.error("Error updating product view:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove product view
export async function DELETE(req, { params }) {
  await dbConnect();
  
  try {
    const { id } = params;
    
    const productView = await ProductView.findByIdAndDelete(id);
    
    if (!productView) {
      return NextResponse.json(
        { success: false, message: "ProductView not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "ProductView deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting product view:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}