import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";
import { isUniletView } from "@/lib/storeView";

export const dynamic = "force-dynamic";

/** Sathya mode only — single lead for edit view */
export async function GET(req, { params }) {
  try {
    await dbConnect();

    if (await isUniletView(req)) {
      return NextResponse.json(
        { success: false, message: "Leads are available in Sathya view only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const lead = await Lead.findOne({ _id: id, deleted: { $ne: 1 } }).lean();
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
