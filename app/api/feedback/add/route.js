import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import FeedbackModel from "@/models/feedback_info";
import Notification from "@/models/Notification";
import { appendToFeedbackSheet } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      name,
      email_address,
      mobile_number,
      invoice_number,
      products,
      feedback,
      city,
      status,
      _hp,
    } = body;

    // Honeypot check — bots fill this hidden field, humans don't
    if (_hp) {
      return NextResponse.json({ success: false, message: "Spam detected" }, { status: 400 });
    }

    // Validation
    if (!name || !email_address || !mobile_number || !feedback || !city || !invoice_number || !products) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate name and city — only letters, spaces, dots, hyphens (blocks random bot strings)
    const namePattern = /^[a-zA-Z\s.'\-]{2,60}$/;
    if (!namePattern.test(name.trim())) {
      return NextResponse.json({ success: false, message: "Invalid name format" }, { status: 400 });
    }
    if (!namePattern.test(city.trim())) {
      return NextResponse.json({ success: false, message: "Invalid city format" }, { status: 400 });
    }

    // Validate phone — Indian mobile number format
    if (!/^[6-9]\d{9}$/.test(mobile_number)) {
      return NextResponse.json({ success: false, message: "Invalid phone number" }, { status: 400 });
    }

    /* // Prevent duplicate feedback
    const existingFeedback = await FeedbackModel.findOne({ email_address });
    if (existingFeedback) {
      return NextResponse.json(
        { success: false, message: "Already you have submitted the feedback" },
        { status: 400 }
      );
    } */

    // Save feedback
    const newFeedback = await FeedbackModel.create({
      name,
      email_address,
      mobile_number,
      invoice_number,
      products,
      feedback,
      city,
      status,
    });

    // 🔔 CREATE NOTIFICATION
    await Notification.create({
      type: "feedback",
      feedbackId: newFeedback._id,
      message: `New feedback received from ${name}`,
      read: false,
    });

    // 📊 APPEND TO GOOGLE SHEET
    appendToFeedbackSheet(newFeedback).catch((err) =>
      console.error("Google Sheets feedback append failed:", err.message)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Your feedback submitted successfully!",
        data: newFeedback,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error adding feedback:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
