import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";
import { isUniletView } from "@/lib/storeView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Sathya mode only — CRM Leads list from `leads` collection */
export async function GET(req) {
  try {
    await dbConnect();

    if (await isUniletView(req)) {
      return NextResponse.json(
        { success: false, message: "Leads are available in Sathya view only" },
        { status: 403 }
      );
    }

    const leads = await Lead.find({ deleted: { $ne: 1 } })
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json(
      { success: true, data: leads },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
