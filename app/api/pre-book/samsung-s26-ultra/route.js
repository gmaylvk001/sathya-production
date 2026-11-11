import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SamsungS26UltraModel from "@/models/ecom_pre_book_samsung_s26_ultra";
import Notification from "@/models/Notification";
import { appendToSamsungS26UltraFormSheet } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, email_address, mobile_number, product, city, status } = body;

    if (!name || !email_address || !mobile_number || !product || !city) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const newContact = await SamsungS26UltraModel.create({
      name,
      email_address,
      mobile_number,
      product,
      city,
      status,
    });

    await Notification.create({
      type: "contact",
      contactId: newContact._id,
      message: `New Pre-Book received from ${name}`,
      read: false,
    });

    appendToSamsungS26UltraFormSheet({ ...newContact.toObject(), products: newContact.product }).catch((err) =>
      console.error("Google Sheets samsung-s26-ultra append failed:", err.message)
    );

    return NextResponse.json(
      { success: true, message: "Added successfully", data: newContact },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding pre-book:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
