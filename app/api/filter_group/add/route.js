import dbConnect from "@/lib/db";
import Filter from "@/models/ecom_filter_group_infos";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const filtergroup_name = formData.get("filtergroup_name");
    const status = formData.get("status") || "Active";

    if (!filtergroup_name || filtergroup_name.trim() === "") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Filter group name is required",
          message: "Please provide a valid filter group name"
        }, 
        { status: 400 }
      );
    }

    // Trim the name
    const trimmedName = filtergroup_name.trim();
    
    // Generate slug from name
    let filtergroup_slug = trimmedName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Check if filter group already exists (by slug or name)
    let existingFilter = await Filter.findOne({ 
      $or: [
        { filtergroup_slug },
        { filtergroup_name: trimmedName }
      ]
    });
    
    if (existingFilter) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Filter group already exists",
          message: `A filter group with name "${trimmedName}" already exists`
        }, 
        { status: 400 }
      );
    }

    // Get the highest order number to place new item at the end
    const highestOrderFilter = await Filter.findOne({})
      .sort({ order: -1 }) // Get the item with highest order
      .select("order")
      .lean();

    const newOrder = highestOrderFilter ? highestOrderFilter.order + 1 : 1;

    // Create new filter group
    const newFilter = new Filter({
      filtergroup_name: trimmedName,
      filtergroup_slug,
      status,
      order: newOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newFilter.save();

    // Get all filter groups in correct order to return updated list
    const allFilterGroups = await Filter.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      { 
        success: true,
        message: "Filter group added successfully", 
        data: newFilter,
        allData: allFilterGroups,
        metadata: {
          totalCount: allFilterGroups.length,
          newOrder: newOrder
        }
      }, 
      { status: 201 }
    );

  } catch (error) {
    console.error("Error adding Filter group:", error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false,
          error: "Duplicate entry",
          message: "A filter group with this name or slug already exists. Please use a different name."
        }, 
        { status: 400 }
      );
    }
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: "Validation error",
          message: "Please check your input data",
          details: errors
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to add filter group",
        message: error.message || "An unexpected error occurred"
      }, 
      { status: 500 }
    );
  }
}