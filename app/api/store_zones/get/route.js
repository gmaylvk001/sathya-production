import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreZone from "@/models/store_zones";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const rows = await StoreZone.find().sort({ created_at: -1, exist_id: -1 }).lean();
    return NextResponse.json(rows, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching store zones:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
