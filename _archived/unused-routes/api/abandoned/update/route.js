import dbConnect from "@/lib/db";
import Abandoned from "@/models/ecom_abondant_details";
import { NextResponse } from "next/server";

export async function PUT(req) {
  await dbConnect();

  try {
    const { id, payment_status, order_status, payment_id, orderNumber, order_username } = await req.json();

    const updated = await Abandoned.findByIdAndUpdate(
      id,
      { payment_status, order_status, payment_id, orderNumber, order_username },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}