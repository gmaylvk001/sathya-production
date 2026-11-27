import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HelpCallback from "@/models/help_callback";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const rawPhone = String(body?.phone || "").replace(/\D/g, "");
    const phone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
    const topic = String(body?.topic || "Order & Delivery").trim();
    const timeSlot = String(body?.timeSlot || "ASAP (Within 30 mins)").trim();
    const orderId = String(body?.orderId || "").trim().slice(0, 60);
    const notes = String(body?.notes || "").trim().slice(0, 500);

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, message: "Please enter your full name." },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const referenceId = `CB-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const created = await HelpCallback.create({
      referenceId,
      name,
      phone,
      topic,
      timeSlot,
      orderId,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        referenceId: created.referenceId,
        timeSlot: created.timeSlot,
        topic: created.topic,
        message: "Callback request submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Callback request error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to submit callback request. Please try again." },
      { status: 500 }
    );
  }
}
