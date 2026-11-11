import connectDB from "@/lib/db";
import HomeSection from "@/models/homeSection";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const updatedSections = await req.json();

  for (const section of updatedSections) {
    await HomeSection.findByIdAndUpdate(section._id, { order: section.order });
  }

  return NextResponse.json({ success: true });
}
