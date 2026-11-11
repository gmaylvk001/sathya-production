import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    const fullName = String(data.fullName || "").trim();
    const mobile = String(data.mobile || "").trim();
    const email = String(data.email || "").trim() || `${mobile}@livedemo.sathya.store`;
    const category = String(data.category || "").trim();
    const requirement = String(data.requirement || "").trim();
    const preferredDate = String(data.preferredDate || "").trim();
    const preferredTime = String(data.preferredTime || "").trim();
    const connectMethod = String(data.connectMethod || "").trim();
    const additionalInfo = String(data.additionalInfo || "").trim();

    if (!fullName || !mobile || mobile.length < 10) {
      return NextResponse.json(
        { success: false, message: "Name and valid mobile are required" },
        { status: 400 }
      );
    }

    const ip_address =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";

    const messageParts = [
      category && `Category: ${category}`,
      requirement && `Requirement: ${requirement}`,
      preferredDate && `Date: ${preferredDate}`,
      preferredTime && `Time: ${preferredTime}`,
      connectMethod && `Connect via: ${connectMethod}`,
      additionalInfo && `Notes: ${additionalInfo}`,
    ].filter(Boolean);

    await Lead.create({
      name: fullName,
      email,
      mobile,
      message: messageParts.join(" | "),
      preferred_time: [preferredDate, preferredTime].filter(Boolean).join(" "),
      lead_title: "Live Video Demo",
      lead_type: "Live Demo",
      product_looking_for: category || requirement || "",
      lead_source: "website_live_demo",
      ip_address,
    });

    const waText = encodeURIComponent(
      `Hi, I requested a Live Demo.\nName: ${fullName}\nMobile: ${mobile}\nCategory: ${category || "-"}\nPreferred: ${preferredDate || "-"} ${preferredTime || ""}`
    );
    const whatsappUrl = `https://wa.me/919840800800?text=${waText}`;

    return NextResponse.json({
      success: true,
      message: "Your live demo request has been submitted.",
      whatsappUrl,
    });
  } catch (error) {
    console.error("Live demo submit error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
