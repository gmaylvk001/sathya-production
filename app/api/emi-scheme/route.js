import dbConnect from "@/lib/db";
import EmiScheme from "@/models/EmiScheme";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    let items = await EmiScheme.find().sort({ id: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching Emi Schemes:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
