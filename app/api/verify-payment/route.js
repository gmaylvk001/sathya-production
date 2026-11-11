import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import { getAuthUserId } from "@/lib/authRequest";
import { markOrdersPaid } from "@/lib/orderPayment";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY || process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification parameters" },
        { status: 400 }
      );
    }

    if (!process.env.RAZORPAY_SECRET) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (String(payment.status).toLowerCase() !== "captured" && String(payment.status).toLowerCase() !== "authorized") {
      return NextResponse.json(
        { error: `Payment not successful (status: ${payment.status})` },
        { status: 400 }
      );
    }

    // Resolve order number from notes or request body
    let orderNumber =
      order_number ||
      payment.notes?.order_number ||
      "";

    if (!orderNumber && razorpay_order_id) {
      try {
        const rzOrder = await razorpay.orders.fetch(razorpay_order_id);
        orderNumber = rzOrder?.notes?.order_number || "";
      } catch {
        // ignore
      }
    }

    await dbConnect();

    let markResult = null;
    if (orderNumber) {
      markResult = await markOrdersPaid({
        orderNumber,
        userId: authUserId,
        paymentId: razorpay_payment_id,
        paymentMethod: "online",
        paymentType: "Razorpay",
        paidAmountPaise: Number(payment.amount),
      });

      if (!markResult.success) {
        return NextResponse.json(
          { error: markResult.error || "Failed to update order" },
          { status: 400 }
        );
      }
    }

    const isEmiPayment =
      payment.method === "emi" ||
      payment.method === "cardless_emi" ||
      (payment.method === "card" && payment.card?.emi === true);

    return NextResponse.json(
      {
        success: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        method: payment.method,
        isEmiPayment,
        amount: payment.amount,
        order_number: orderNumber || null,
        ordersUpdated: markResult?.orders?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
