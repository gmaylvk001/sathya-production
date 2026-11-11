import dbConnect from "@/lib/db";
import EmiScheme from "@/models/EmiScheme";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { schemeCode, emiFinanceName, tenure, advanceEmi, dbd, pf } = body;

    if (!schemeCode) {
      return NextResponse.json(
        { success: false, error: "Scheme Code is required" },
        { status: 400 }
      );
    }

    // Auto increment ID
    const lastRecord = await EmiScheme.findOne().sort({ id: -1 }).select("id").lean();
    const nextId = lastRecord && lastRecord.id ? lastRecord.id + 1 : 1;

    const newScheme = new EmiScheme({
      id: nextId,
      schemeCode: schemeCode.trim(),
      emiFinanceName: emiFinanceName || "",
      tenure: tenure ? Number(tenure) : 0,
      advanceEmi: advanceEmi ? Number(advanceEmi) : 0,
      dbd: dbd ? Number(dbd) : 0,
      pf: pf ? Number(pf) : 0,
    });

    await newScheme.save();

    return NextResponse.json({ success: true, data: newScheme });
  } catch (error) {
    console.error("Error creating Emi Scheme:", error);
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
