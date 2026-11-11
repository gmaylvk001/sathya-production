import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmiFinance from "@/models/EmiFinance";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { slugOrId } = await params;

    const query = isNaN(Number(slugOrId))
      ? { slug: slugOrId }
      : { $or: [{ id: Number(slugOrId) }, { slug: slugOrId }] };

    const record = await EmiFinance.findOne(query).lean();

    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/emi-finance/[slugOrId]:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching record", message: error?.message },
      { status: 500 }
    );
  }
}
