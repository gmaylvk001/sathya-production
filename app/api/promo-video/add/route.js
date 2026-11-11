import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ContactModel from "@/models/ecom_promo_video_info";
import Notification from "@/models/Notification";
import { appendToPromovideoFormSheet } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    await dbConnect(); // Ensure DB connection

    const body = await request.json();
    const { name, email_address, mobile_number, product, city, status, _hp } = body;

    // Honeypot check — bots fill this hidden field, humans don't
    if (_hp) {
      return NextResponse.json({ success: false, message: "Spam detected" }, { status: 400 });
    }

    // Validate fields
    if (!name || !email_address || !mobile_number || !product || !city) {
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

    // Check for existing contact (optional — usually check email instead of name)
    /* const existingContact = await ContactModel.findOne({ email_address });
    if (existingContact) {
      return NextResponse.json(
        { success: false, message: "This already exists" },
        { status: 400 }
      );
    } */

     // Create new contact
    const newContact = await ContactModel.create({
      name,
      email_address,
      mobile_number,
      product,
      city,
      status,
    });

   // 🔔 CREATE NOTIFICATION
    await Notification.create({
      type: "contact",
      contactId: newContact._id,
      message: `New Data received from ${name}`,
      read: false,
    });

    // 📊 APPEND TO GOOGLE SHEET
    appendToPromovideoFormSheet({ ...newContact.toObject(), products: newContact.product }).catch((err) =>
      console.error("Google Sheets promo-video append failed:", err.message)
    );

    return NextResponse.json(
      { success: true, message: "Added successfully", data: newContact },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding contact:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
