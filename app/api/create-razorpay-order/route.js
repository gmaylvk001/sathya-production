import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAuthUserId } from "@/lib/authRequest";
import { findRelatedOrders } from "@/lib/orderPayment";

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
    const { order_number, amount } = body;

    let amountPaise = null;

    // Prefer server-side order total when order_number is provided
    if (order_number) {
      await dbConnect();
      const related = await findRelatedOrders(order_number, authUserId);
      if (related.length) {
        const totalRupees = related.reduce(
          (sum, o) => sum + (Number(o.order_amount) || 0),
          0
        );
        if (totalRupees > 0) {
          amountPaise = Math.round(totalRupees * 100);
        }
      }
    }

    // Fallback: client amount only when no order yet (should be rare)
    if (amountPaise == null) {
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return NextResponse.json(
          { error: "Valid amount or order_number is required" },
          { status: 400 }
        );
      }
      amountPaise = Math.round(Number(amount));
    }

    if (amountPaise < 100) {
      return NextResponse.json(
        { error: "Order amount too low" },
        { status: 400 }
      );
    }

    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `rcpt_${String(order_number || Date.now()).slice(0, 32)}`,
      notes: {
        order_number: order_number ? String(order_number) : "",
        user_id: String(authUserId),
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
