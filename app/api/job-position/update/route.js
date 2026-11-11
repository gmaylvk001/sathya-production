import dbConnect from "@/lib/db";
import JobPosition from "@/models/jobposition";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();

  try {
    const { positionId, position_name, status } = await req.json();

    if (!positionId) {
      return NextResponse.json({ error: "Job position ID is requireds" }, { status: 400 });
    }

    const updateData = { updatedAt: new Date() };

    if (position_name !== undefined) {
      updateData.position_name = position_name;
      updateData.position_slug = position_name.toLowerCase().replace(/\s+/g, "-");
    }
    if (status !== undefined) updateData.status = status;

    const updatedPosition = await JobPosition.findByIdAndUpdate(positionId, updateData, { new: true });

    if (!updatedPosition) {
      return NextResponse.json({ error: "Job position not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Job position updated successfully",
      data: updatedPosition,
    });

  } catch (error) {
    console.error("Error updating job position:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
