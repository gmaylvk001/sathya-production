import dbConnect from "@/lib/db";
import EmiProduct from "@/models/EmiProduct";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Missing _id" },
        { status: 400 }
      );
    }

    const deleted = await EmiProduct.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Error deleting Emi Product:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
