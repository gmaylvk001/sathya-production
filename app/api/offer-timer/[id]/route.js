import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferTimer from "@/models/Offertimer";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    let timer = null;
    try {
      timer = await OfferTimer.findById(id).lean();
    } catch (e) {
      // Invalid ObjectId format, try custom_id / timerId
    }

    if (!timer) {
      const num = Number(id);
      if (!Number.isNaN(num)) {
        timer = await OfferTimer.findOne({ $or: [{ timerId: num }, { custom_id: num }] }).lean();
      }
    }

    if (!timer) {
      timer = await OfferTimer.findOne().sort({ createdAt: -1 }).lean();
    }

    if (!timer) {
      return NextResponse.json({ success: false, error: "Offer timer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: timer }, { status: 200 });
  } catch (error) {
    console.error("Error fetching offer timer:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch offer timer" }, { status: 500 });
  }
}
