import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mapbox from "@/models/mapbox";

export async function GET() {
  await dbConnect();
  try {
    const stores = await mapbox.find(
      { status: "Active" },
      {
        organisation_name: 1,
        address: 1,
        city: 1,
        phone: 1,
        website: 1,
        businessHours: 1,
        store_images: 1,
        location: 1,
        location_map: 1,
      }
    ).lean();
    return NextResponse.json({ success: true, data: stores }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch stores" }, { status: 500 });
  }
}
