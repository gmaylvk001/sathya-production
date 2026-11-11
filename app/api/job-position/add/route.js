import connectDB from "@/lib/db";
import JobPosition from "@/models/jobposition";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();

    const data = await req.json();
    const { position_name, status } = data;

    if (!position_name) {
      return NextResponse.json({ error: "Position name is requireds" }, { status: 400 });
    }

    let position_slug = position_name.toLowerCase().replace(/\s+/g, "-");

    const exists = await JobPosition.findOne({ position_slug });
    if (exists) {
      return NextResponse.json({ error: "Job position already exists!" }, { status: 400 });
    }

    const newPosition = new JobPosition({
      position_name,
      position_slug,
      status,
    });

    await newPosition.save();

    return NextResponse.json(
      { message: "Job position added successfully", data: newPosition },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error adding job position:", error);
    return NextResponse.json(
      { error: "Failed to add job position", details: error.message },
      { status: 500 }
    );
  }
}
