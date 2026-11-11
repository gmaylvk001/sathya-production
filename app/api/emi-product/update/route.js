import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, emiFinance, status, itemCode, schemeCode } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Missing _id" },
        { status: 400 }
      );
    }

    const existing = await EmiProduct.findById(_id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    existing.emiFinance = emiFinance || null;
    existing.status = status || "true";
    if (itemCode) existing.itemCode = itemCode.trim();
    if (schemeCode) existing.schemeCode = schemeCode.trim();

    await existing.save();

    return NextResponse.json({ success: true, data: existing });
  } catch (error) {
    console.error("Error updating Emi Product:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Scheme Code must be unique" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
