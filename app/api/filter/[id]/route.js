import { NextResponse } from "next/server";
import connectDB from "@/lib/db"; // your mongo connect file
import Filter from "@/models/ecom_filter_infos";
import { ObjectId } from "mongodb";

export async function PUT(req, { params }) {
  try {
    await connectDB();

    // const { id } = params;
    const { id } = await params; // ✅ correct
    const body = await req.json();

    /* console.log("PUT ID:", id);
    console.log("BODY:", body); */

    const result = await Filter.findByIdAndUpdate(
      new ObjectId(id),
      { filter_slug: body.filter_slug },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Filter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
