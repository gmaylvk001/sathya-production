import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    // Fetch only main categories (parentid === "none")
    const mainCategories = await Category.find({
      status: "Active",
      parentid: "none",
    }).lean();

    // Fetch all active products once
    const products = await Product.find({ status: "Active" }).lean();

    // Prepare category-wise product counts
    const chartData = mainCategories.map((category) => {

    //   const productCount = products.filter((product) => (product.category == category._id) ? category._id : '-'
    //   );
    let productCount = 0;
    products.map((product) =>{
      if(product.category == category._id){
        console.log(product.category);
        productCount=productCount+1;
      }
    })

      return {
        category: category.category_name,
        count: productCount,
      };
    });

    // Calculate total product count
    const totalProductCount = products.length;

    // Return both category data and total product count
    return NextResponse.json(
      { success: true, data: chartData, totalProductCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching category product counts:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
