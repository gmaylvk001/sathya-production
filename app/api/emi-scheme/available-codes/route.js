import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import EmiScheme from "@/models/EmiScheme";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    
    // Get all scheme codes that are already in EmiScheme
    const existingSchemes = await EmiScheme.find().select("schemeCode").lean();
    const existingCodes = existingSchemes.map((s) => s.schemeCode);

    // Find EmiProducts whose schemeCode is not in existingCodes
    const availableProducts = await EmiProduct.find({
      schemeCode: { $nin: existingCodes },
    })
      .populate("emiFinance", "name")
      .select("schemeCode emiFinance")
      .lean();

    const data = availableProducts.map(p => ({
      schemeCode: p.schemeCode,
      emiFinanceName: p.emiFinance ? p.emiFinance.name : ""
    }));

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching available scheme codes:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
