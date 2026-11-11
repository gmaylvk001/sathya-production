import dbConnect from "@/lib/db";
import EmiScheme from "@/models/EmiScheme";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, schemeCode, emiFinanceName, tenure, advanceEmi, dbd, pf } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Missing _id" },
        { status: 400 }
      );
    }

    const existing = await EmiScheme.findById(_id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    if (schemeCode) existing.schemeCode = schemeCode.trim();
    if (emiFinanceName !== undefined) existing.emiFinanceName = emiFinanceName;
    if (tenure !== undefined) existing.tenure = Number(tenure);
    if (advanceEmi !== undefined) existing.advanceEmi = Number(advanceEmi);
    if (dbd !== undefined) existing.dbd = Number(dbd);
    if (pf !== undefined) existing.pf = Number(pf);

    await existing.save();

    return NextResponse.json({ success: true, data: existing });
  } catch (error) {
    console.error("Error updating Emi Scheme:", error);
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
