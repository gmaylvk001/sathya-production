import { NextResponse } from "next/server";
import HomeSection from "@/models/homeSection";
import dbConnect from "@/lib/db";

// ✅ GET all ACTIVE home sections (ordered by position ASC)
export async function GET() {
  try {
    await dbConnect();

    const sections = await HomeSection.find({ status: "active" }) // only active
      .sort({ position: 1 }); // order by position ascending

    return NextResponse.json({ success: true, data: sections || [] });
  } catch (error) {
    console.error("Error in GET /api/home-sections:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ✅ POST - Add a new home section
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const newSection = await HomeSection.create(body);

    return Response.json({ success: true, data: newSection }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
