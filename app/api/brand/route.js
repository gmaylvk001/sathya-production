import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ecom_brand_info from "@/models/ecom_brand_info";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "true" || searchParams.get("admin") === "true";
    const includeZero = searchParams.get("includeZero") === "true";

    const filter = includeAll
      ? {}
      : includeZero
        ? { status: { $regex: /^active$/i } }
        : {
          status: { $regex: /^active$/i },
          product_count: { $gt: 0 },
        };

    const brands = await ecom_brand_info.find(filter).sort({ position: 1, brand_name: 1 }).lean();
    return NextResponse.json({ success: true, data: brands || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/brand:", error);
    return NextResponse.json({ success: false, error: "Error fetching brands", message: error?.message }, { status: 500 });
  }
}
