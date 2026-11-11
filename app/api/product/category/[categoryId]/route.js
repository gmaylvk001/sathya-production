import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";

export async function GET(request, context) {
  await dbConnect();
  
  try {
    const { params } = context;
    const categoryId = params.categoryId;
    
    console.log("Fetching products for category:", categoryId);
    
    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "Category ID is required" },
        { status: 400 }
      );
    }
    
    // Find products by sub_category field
    const products = await Product.find({ 
      sub_category: categoryId,
      status: "Active" 
    }).select("name price").sort({ name: 1 });
    
    console.log(`Found ${products.length} products for category ${categoryId}`);
    
    return NextResponse.json({
      success: true,
      products
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}