import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeSection from "@/models/homeSection";

// ✅ GET: Fetch all sections
export async function GET() {
  try {
    await dbConnect();
    const sections = await HomeSection.find().sort({ position: 1 });
    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

// ✅ POST: Save reordered sections
export async function POST(request) {
  try {
    await dbConnect();
    const { sections } = await request.json();

    const bulkOps = sections.map((section) => ({
      updateOne: {
        filter: { _id: section._id },
        update: { $set: { position: section.position } },
      },
    }));

    await HomeSection.bulkWrite(bulkOps);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
