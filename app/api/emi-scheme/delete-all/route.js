import dbConnect from "@/lib/db";
import EmiScheme from "@/models/EmiScheme";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();

    // Delete all records
    await EmiScheme.deleteMany({});

    return NextResponse.json({ success: true, message: "All EMI Schemes deleted successfully" });
  } catch (error) {
    console.error("Error deleting all EMI Schemes:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
