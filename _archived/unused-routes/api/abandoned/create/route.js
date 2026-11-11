import dbConnect from "@/lib/db";
import Abandoned from "@/models/ecom_abondant_details";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();

    const abandoned = await Abandoned.create({
      user_id: body.user_id,
      cart_items: body.cart_items,
      total_amount: body.total_amount,
      address: body.address,
      payment_mode: body.payment_mode,
      payment_status: "payment_initialized",
      order_status: "payment_initialized",
      payment_id: "",
      orderNumber : "ORD" + Date.now(),
      order_username: `${body.address.firstName} ${body.address.lastName}`
    });

    return NextResponse.json({
      success: true,
      data: abandoned
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}