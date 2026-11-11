import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import dbConnect from "@/lib/db";
import { markOrdersPaid } from "@/lib/orderPayment";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY || process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventName = event?.event || "";

    if (
      eventName !== "payment.captured" &&
      eventName !== "order.paid" &&
      eventName !== "payment.authorized"
    ) {
      return NextResponse.json({ received: true, ignored: eventName });
    }

    const paymentEntity =
      event?.payload?.payment?.entity ||
      event?.payload?.order?.entity ||
      null;

    if (!paymentEntity) {
      return NextResponse.json({ received: true, ignored: "no entity" });
    }

    let orderNumber = paymentEntity.notes?.order_number || "";
    const paymentId = paymentEntity.id || paymentEntity.payment_id;
    let paidAmountPaise = Number(paymentEntity.amount) || null;
    let userId = paymentEntity.notes?.user_id || null;

    if (!orderNumber && paymentEntity.order_id) {
      try {
        const rzOrder = await razorpay.orders.fetch(paymentEntity.order_id);
        orderNumber = rzOrder?.notes?.order_number || "";
        userId = userId || rzOrder?.notes?.user_id || null;
        if (!paidAmountPaise) paidAmountPaise = Number(rzOrder.amount) || null;
      } catch {
        // ignore
      }
    }

    if (!orderNumber || !paymentId) {
      return NextResponse.json({ received: true, ignored: "missing order_number" });
    }

    await dbConnect();
    const result = await markOrdersPaid({
      orderNumber,
      userId,
      paymentId,
      paymentMethod: "online",
      paymentType: "Razorpay",
      paidAmountPaise,
    });

    return NextResponse.json({
      received: true,
      success: result.success,
      error: result.error || null,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
