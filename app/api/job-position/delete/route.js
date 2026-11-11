import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobPosition from "@/models/jobposition"; // <-- Change to your model name

export async function POST(req) {
  await dbConnect();

  try {
    const { positionId } = await req.json();

    if (!positionId) {
      return NextResponse.json(
        { error: "Position ID is required" },
        { status: 400 }
      );
    }

       // Set status to "Inactive" instead of deleting
        // const deletedPosition = await JobPosition.findByIdAndUpdate(
        //   positionId,
        //   { status: "Inactive", updatedAt: new Date() },
        //   { new: true }
        // );

    const deletedPosition = await JobPosition.findByIdAndDelete(positionId);

    if (!deletedPosition) {
      return NextResponse.json(
        { error: "Job position not founds" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job position deleted permanently",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
