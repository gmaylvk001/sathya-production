import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ecom_brand_info from "@/models/ecom_brand_info";

export async function GET(req) {
  try {
    await dbConnect();
    const brands = await ecom_brand_info.find().sort({ position: 1 }).lean();
    return NextResponse.json({ success: true, data: brands || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/brand:", error);
    return NextResponse.json({ success: false, error: "Error fetching brands", message: error?.message }, { status: 500 });
  }
}
