import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Filter from "@/models/ecom_filter_infos";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const { filterId, filter_name,filter_slug, filter_group, status } = body;

    if (!filterId) {
      return NextResponse.json({ error: "Filter ID is required" }, { status: 400 });
    }

    const updatedData = {
      updatedAt: new Date(),
    };

    if (filter_name !== undefined) updatedData.filter_name = filter_name;
    if (filter_slug !== undefined) updatedData.filter_slug = filter_slug;
    if (filter_group !== undefined) updatedData.filter_group = filter_group;
    if (status !== undefined) updatedData.status = status;

    const updatedFilter = await Filter.findByIdAndUpdate(
      filterId,
      updatedData,
      { new: true }
    );

    if (!updatedFilter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Filter updated successfully",
      data: updatedFilter,
    });
  } catch (error) {
    console.error("Error updating filter:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}