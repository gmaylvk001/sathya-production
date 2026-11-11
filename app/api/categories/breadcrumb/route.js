// app/api/categories/get/route.js
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single category
      const category = await Category.findById(id);
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json(category, { status: 200 });
    }

    // Fetch all categories if no ID provided
    const categories = await Category.find({ status: "Active" }).lean();

    // Normalize parentid and ensure _id is string for consistent comparison
    const normalized = categories.map(cat => ({
      ...cat,
      _id: cat._id.toString(), // Convert ObjectId to string
      parentid: (cat.parentid === "none" || !cat.parentid) ? 
        null : 
        (typeof cat.parentid === 'object' ? cat.parentid.toString() : cat.parentid)
    }));

    return NextResponse.json(normalized);

  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}