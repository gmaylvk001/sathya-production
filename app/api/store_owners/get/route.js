import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreOwners from "@/models/store_owners";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const rows = await StoreOwners.find({}).sort({ created_at: -1, _id: -1 }).lean();
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching store owners:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
