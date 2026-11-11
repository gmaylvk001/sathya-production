import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { sendOrderData } from "@/lib/sendOrderData";

export async function POST(req, { params }) {
  const { orderId } = await params;

  try {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid order id" },
        { status: 400 }
      );
    }

    let remarks = null;
    try {
      const body = await req.json();
      if (body && body.remarks != null) {
        remarks = body.remarks;
      }
    } catch {
      remarks = null;
    }

    await dbConnect();
    const order = await OrderNew.findById(orderId).select("pickup_type").lean();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const assignedStore = String(order.pickup_type || "").trim();
    if (!assignedStore) {
      return NextResponse.json(
        {
          success: false,
          message: "Please assign store first before Place Order",
        },
        { status: 400 }
      );
    }

    const result = await sendOrderData(orderId, remarks);
    return NextResponse.json({
      success: result.api_status === "SUCCESS",
      api_status: result.api_status,
      api_reason: result.api_reason,
      skippedApi: result.skippedApi,
      payload: result.payload,
      response: result.response || null,
      usedAddressFallback: result.usedAddressFallback,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status || 500 }
    );
  }
}
