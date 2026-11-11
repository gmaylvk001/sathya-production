import Razorpay from "razorpay";
import { NextResponse } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { payment_id,order_amount } = body;

    if (!payment_id) {
      return NextResponse.json(
        { success: false, message: "Payment ID required" },
        { status: 400 }
      );
    }

    // 🔥 Fetch payment from Razorpay
    const payment = await razorpay.payments.fetch(payment_id);

    console.log("Razorpay Payment:", payment);

    // ✅ Check payment status
    if (payment.status !== "captured" ||  payment.amount / 100 !== Number(order_amount)) {
      return NextResponse.json(
        { success: false, message: "Payment not completed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Verification failed",
      },
      { status: 500 }
    );
  }
}