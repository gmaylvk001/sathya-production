import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ContactModel from "@/models/ecom_contact_info";

export async function GET() {
  await dbConnect();

  try {
    const contacts = await ContactModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: contacts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error fetching contacts" }, { status: 500 });
  }
}
