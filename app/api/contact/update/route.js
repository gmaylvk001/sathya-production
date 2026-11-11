import dbConnect from "@/lib/db";
import Contact from "@/models/ecom_contact_info";
import { NextResponse } from "next/server";

export async function PUT(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const contactId = body.id || body._id;

    if (!contactId) {
      return NextResponse.json({ success: false, message: "Missing contact ID" });
    }

    const updateFields = {};
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.email_address !== undefined) updateFields.email_address = body.email_address;
    if (body.mobile_number !== undefined) updateFields.mobile_number = body.mobile_number;
    if (body.city !== undefined) updateFields.city = body.city;
    if (body.enquiry_type !== undefined) updateFields.enquiry_type = body.enquiry_type;
    if (body.invoice_number !== undefined) updateFields.invoice_number = body.invoice_number;
    if (body.message !== undefined) updateFields.message = body.message;
    if (body.status !== undefined) updateFields.status = body.status;

    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      updateFields,
      { new: true }
    );

    if (!updatedContact) {
      return NextResponse.json({ success: false, message: "Contact not found" });
    }

    return NextResponse.json({ success: true, data: updatedContact });
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json({ success: false, message: "Server error" });
  }
}
