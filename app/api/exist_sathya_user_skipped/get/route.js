import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaUserSkipped from "@/models/ExistSathyaUserSkipped";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const data = await ExistSathyaUserSkipped.find()
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching skipped exist sathya users:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
