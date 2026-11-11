import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();

    // Delete all records
    await EmiProduct.deleteMany({});

    return NextResponse.json({ success: true, message: "All EMI Products deleted successfully" });
  } catch (error) {
    console.error("Error deleting all EMI Products:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
