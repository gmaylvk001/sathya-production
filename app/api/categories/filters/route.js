import dbConnect from "@/lib/db";
import CategoryFilter from "@/models/ecom_categoryfilters_infos";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    console.log("Fetching filters for category ID:", categoryId);

    if (!categoryId) {
      return NextResponse.json({ 
        success: false, 
        error: "Category ID is required" 
      }, { status: 400 });
    }

    // Fetch category filters from the database
    const categoryFilters = await CategoryFilter.find({ category_id: categoryId });
    
    console.log("Raw category filters from DB:", categoryFilters);

    // Extract just the filter_id values
    const filterIds = categoryFilters.map(cf => cf.filter_id);

    console.log(`Found ${filterIds.length} filters for category ${categoryId}:`, filterIds);

    return NextResponse.json({ 
      success: true,
      filters: filterIds 
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching category filters:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch category filters", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}