import { NextResponse } from "next/server";
import { buildSendOrderData } from "@/lib/sendOrderData";

export async function GET(req, { params }) {
  const { orderId } = await params;

  try {
    const built = await buildSendOrderData(orderId, null);
    return NextResponse.json({
      success: true,
      payload: built.payload,
      usedAddressFallback: built.usedAddressFallback,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status || 500 }
    );
  }
}
