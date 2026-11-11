import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import FeedbackModel from "@/models/feedback_info";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query = {};

    /* 🔍 SEARCH */
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email_address: { $regex: search, $options: "i" } },
        { invoice_number: { $regex: search, $options: "i" } },
        { mobile_number: { $regex: search, $options: "i" } },
      ];
    }

    /* 🟢 STATUS FILTER */
    if (status && status !== "All") {
      query.status = status;
    }

    /* 📅 DATE RANGE */
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const feedbacks = await FeedbackModel.find(query)
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
