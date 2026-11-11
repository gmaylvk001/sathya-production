import dbConnect from "@/lib/db";
import Filter from "@/models/ecom_filter_group_infos";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const filtergroupId = formData.get("filtergroupId");
    const filtergroup_name = formData.get("filtergroup_name");
    const status = formData.get("status") || "Active";

    if (!filtergroupId) {
      return NextResponse.json({ error: "Filter group ID is required" }, { status: 400 });
    }

    if (!filtergroup_name) {
      return NextResponse.json({ error: "Filter group name is required" }, { status: 400 });
    }

    // Find the existing filter group
    const existingFilterGroup = await Filter.findById(filtergroupId);
    if (!existingFilterGroup) {
      return NextResponse.json({ error: "Filter group not found" }, { status: 404 });
    }

    let filtergroup_slug = filtergroup_name.toLowerCase().replace(/\s+/g, "-");

    // Check if another filter group already has this slug (except the current one)
    const slugExists = await Filter.findOne({
      filtergroup_slug,
      _id: { $ne: filtergroupId }
    });
    
    if (slugExists) {
      return NextResponse.json({ error: "Another filter group already exists with this name" }, { status: 400 });
    }

    // Update the filter group
    const updatedFilterGroup = await Filter.findByIdAndUpdate(
      filtergroupId,
      {
        filtergroup_name,
        filtergroup_slug,
        status,
        updatedAt: new Date()
      },
      { new: true } // Return the updated document
    );

    return NextResponse.json(
      { 
        message: "Filter group updated successfully", 
        filtergroup: updatedFilterGroup 
      }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating Filter group:", error);
    return NextResponse.json(
      { error: "Failed to update Filter group", details: error.message }, 
      { status: 500 }
    );
  }
}