import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Filter from "@/models/ecom_filter_infos";

export async function POST(req) {
  await dbConnect();

  try {
    const { filterId } = await req.json();

    if (!filterId) {
      return NextResponse.json({ error: "Filter ID is required" }, { status: 400 });
    }

    // Set status to "Inactive" instead of deleting
    const filter = await Filter.findByIdAndUpdate(
      filterId,
      { status: "Inactive", updatedAt: new Date() },
      { new: true }
    );

    if (!filter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Filter marked as inactive successfully" });
  } catch (error) {
    console.error("Error updating filter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
