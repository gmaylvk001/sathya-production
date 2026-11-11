import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmiFinance from "@/models/EmiFinance";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, _id } = body;

    if (!id && !_id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const query = _id ? { _id } : { id: Number(id) };
    const deleted = await EmiFinance.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json({ success: false, error: "EMI Finance record not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "EMI Finance deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/emi-finance/delete:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting finance bank", message: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  return POST(req);
}
