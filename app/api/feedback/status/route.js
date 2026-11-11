import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import FeedbackModel from "@/models/feedback_info";

export async function PUT(req) {
  try {
    await dbConnect();

    const { id, status } = await req.json();

    await FeedbackModel.findByIdAndUpdate(id, { status });

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update status" },
      { status: 500 }
    );
  }
}
