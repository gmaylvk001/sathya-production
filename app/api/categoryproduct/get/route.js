import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryProduct from "@/models/categoryproduct";

export async function GET() {
  try {
    await connectDB();
    const categoryProducts = await CategoryProduct.find({ status: "Active" });
    return NextResponse.json(categoryProducts, { status: 200 });
  } catch (err) {
    console.error("Error fetching category products:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
