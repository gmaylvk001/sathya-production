import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { emiFinance, status, itemCode, schemeCode } = body;

    if (!itemCode || !schemeCode) {
      return NextResponse.json(
        { success: false, error: "Item Code and Scheme Code are required" },
        { status: 400 }
      );
    }

    // Auto increment ID
    const lastRecord = await EmiProduct.findOne().sort({ id: -1 }).select("id").lean();
    const nextId = lastRecord && lastRecord.id ? lastRecord.id + 1 : 1;

    const newProduct = new EmiProduct({
      id: nextId,
      emiFinance: emiFinance || null,
      status: status || "true",
      itemCode: itemCode.trim(),
      schemeCode: schemeCode.trim(),
    });

    await newProduct.save();

    return NextResponse.json({ success: true, data: newProduct });
  } catch (error) {
    console.error("Error creating Emi Product:", error);
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
