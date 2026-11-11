import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    // Populate emiFinance to get its name if needed, but for listing we might just need it
    let items = await EmiProduct.find().populate("emiFinance", "name").sort({ id: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching Emi Products:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
