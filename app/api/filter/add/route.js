import dbConnect from "@/lib/db";
import Filter from "@/models/ecom_filter_infos";
import { NextResponse } from "next/server";
 
export async function POST(req) {
  try {
    await dbConnect();
    // console.log(req.json());
    const formData = await req.json();
    console.log(formData);
    const {filter_name,status,filter_group } = formData;
    // const formData = await req.formData();
    // const filter_name = formData.get("filter_name");
    // const status = formData.get("status") || "Active";
    // const filter_group =formData.get('filter_group');
 
    if (!filter_name) {
      return NextResponse.json({ error: "filter name is required" }, { status: 400 });
    }
 
    let filter_slug = filter_name.toLowerCase().replace(/\s+/g, "-");
 
    // Check if filter already exists in the same filter group
    let existingFilter = await Filter.findOne({ filter_slug, filter_group });
    if (existingFilter) {
      return NextResponse.json({ error: "filter already exists in this group" }, { status: 400 });
    }
 
    const newFilter = new Filter({
      filter_name,
      filter_slug,
      status,
      filter_group,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
 
    await newFilter.save();
    return NextResponse.json({ message: "filter added successfully", filter: newFilter }, { status: 201 });
 
  } catch (error) {
    console.error("Error adding filter:", error);
    return NextResponse.json({ error: "Failed to add filter", details: error.message }, { status: 500 });
  }
}
 