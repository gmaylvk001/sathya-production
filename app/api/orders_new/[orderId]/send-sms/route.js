import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { getAdminUserId } from "@/lib/adminRequest";
import { ORDER_SMS_MAX_LENGTH, normalizeSmsMobile, sendOrderFreeTextSms } from "@/lib/orderFreeTextSms";

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { orderId } = await params;

    if (!(await getAdminUserId(req))) {
      return NextResponse.json({ success: false, message: "Admin login required" }, { status: 401 });
    }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ success: false, message: "Please enter the Message" }, { status: 400 });
    }
    if (text.length > ORDER_SMS_MAX_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Maximum ${ORDER_SMS_MAX_LENGTH} Characters allowed` },
        { status: 400 }
      );
    }

    const order = await OrderNew.findById(orderId).select("order_number order_phonenumber").lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const mobile = normalizeSmsMobile(order.order_phonenumber);
    if (mobile.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Order has no valid phone number" },
        { status: 400 }
      );
    }

    const result = await sendOrderFreeTextSms({ mobile, text });
    if (!result.success) {
      console.error("order send-sms provider failure:", order.order_number, result.status, result.body);
      return NextResponse.json({ success: false, message: "SMS sending failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Your Message has been Sent Successfully" });
  } catch (error) {
    console.error("order send-sms error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "SMS sending failed" },
      { status: 500 }
    );
  }
}
