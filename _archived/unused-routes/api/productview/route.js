import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductView from "@/models/productView";

// GET all product views
export async function GET() {
  await dbConnect();

  try {
    const productViews = await ProductView.find()
      .populate("category", "category_name")
      .populate("products", "name price")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: productViews
    });
  } catch (err) {
    console.error("Error fetching product views:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new product view
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

    // Populate the saved data before returning
    await productView.populate("category", "category_name");
    await productView.populate("products", "name price");

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