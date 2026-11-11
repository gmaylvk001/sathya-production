import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";
import { isUniletView } from "@/lib/storeView";

export const dynamic = "force-dynamic";

/** Sathya mode only — soft-delete lead (deleted = 1) */
export async function DELETE(req) {
  try {
    await dbConnect();

    if (await isUniletView(req)) {
      return NextResponse.json(
        { success: false, message: "Leads are available in Sathya view only" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = body.id || body._id;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    const updated = await Lead.findByIdAndUpdate(
      id,
      { $set: { deleted: 1 } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
