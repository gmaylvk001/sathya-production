import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/adminRequest";
import OrderNew from "@/models/orders_new";
import PaymentRefund from "@/models/payment_refund";
import {
  attachRefundMeta,
  computeShowRefund,
  findPaymentForOrder,
  findRefundForOrder,
  resolveRazorpayPaymentId,
} from "@/lib/orderRefund";

function getRazorpay() {
  const key_id =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY || process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY;
  const key_secret = process.env.RAZORPAY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

/**
 * Exist: POST admin/refundpayment → AllordersController@refundpayment
 * Body: refund_type (partial|full), refund_amount (partial), paymentid, order_number
 */
export async function POST(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    await dbConnect();
    const { orderId } = await params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid order id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const refundType = String(body.refund_type || body.refundType || "")
      .trim()
      .toLowerCase();
    const isPartial = refundType === "partial";
    const isFull = refundType === "full";

    if (!isPartial && !isFull) {
      return NextResponse.json(
        { success: false, message: "Refund type must be Partial or Full" },
        { status: 400 }
      );
    }

    const order = await OrderNew.findById(orderId).lean();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const payment = await findPaymentForOrder(order);
    const existing = await findRefundForOrder(order);
    if (computeShowRefund(order, payment, existing) !== "yes") {
      return NextResponse.json(
        {
          success: false,
          message:
            existing
              ? "Refund already recorded for this order"
              : "Refund not available for this order (Online + paid + Cancelled required)",
        },
        { status: 400 }
      );
    }

    const razorpayPaymentId = resolveRazorpayPaymentId(order, payment);
    if (!razorpayPaymentId) {
      return NextResponse.json(
        { success: false, message: "Razorpay payment id not found" },
        { status: 400 }
      );
    }

    const actualPaidAmount = Number(order.order_amount);
    if (!Number.isFinite(actualPaidAmount) || actualPaidAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid order amount" },
        { status: 400 }
      );
    }

    let refundAmount = actualPaidAmount;
    if (isPartial) {
      refundAmount = Number(body.refund_amount ?? body.refundAmount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Enter a valid refund amount" },
          { status: 400 }
        );
      }
      // Soft guard (Exist gap #3); keep refund usable but block obvious bad values
      if (refundAmount > actualPaidAmount) {
        return NextResponse.json(
          { success: false, message: "Partial amount cannot exceed order amount" },
          { status: 400 }
        );
      }
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return NextResponse.json(
        { success: false, message: "Razorpay keys not configured" },
        { status: 500 }
      );
    }

    // Exist payment_refund.payment_id NOT NULL → payments.id
    const paymentsTableId =
      (payment?._id && String(payment._id)) ||
      (body.paymentid != null && String(body.paymentid).trim()) ||
      "";
    if (!paymentsTableId) {
      return NextResponse.json(
        { success: false, message: "payment_id is required" },
        { status: 400 }
      );
    }

    // Exist: INSERT payment_refund before Razorpay call
    // Columns: user_id, order_number, refund_id, refund_amount, actual_paid_amount, payment_id, error_msg
    const refundDoc = await PaymentRefund.create({
      user_id: order.user_id != null ? String(order.user_id) : null,
      order_number: order.order_number ? String(order.order_number) : null,
      refund_id: null,
      refund_amount: String(refundAmount),
      actual_paid_amount: String(actualPaidAmount),
      payment_id: paymentsTableId,
      error_msg: null,
    });

    const amountPaise = Math.round(refundAmount * 100);

    try {
      const rzResponse = await razorpay.payments.refund(razorpayPaymentId, {
        amount: amountPaise,
      });

      const refundId = rzResponse?.id ? String(rzResponse.id) : "";
      if (refundId) {
        await PaymentRefund.findByIdAndUpdate(refundDoc._id, {
          refund_id: refundId,
          error_msg: null,
        });

        const refreshed = await OrderNew.findById(orderId).lean();
        await attachRefundMeta(refreshed);

        return NextResponse.json({
          success: true,
          message: "Amount Refunded Successfully!",
          refund_id: refundId,
          show_refund: refreshed.show_refund,
          payment_refund: refreshed.payment_refund,
        });
      }

      const errMsg = "Refund response missing id";
      await PaymentRefund.findByIdAndUpdate(refundDoc._id, { error_msg: errMsg });
      return NextResponse.json(
        { success: false, message: "Please try again!", error_msg: errMsg },
        { status: 502 }
      );
    } catch (rzErr) {
      // Exist: payment_refund.error_msg = Razorpay error description
      const description =
        rzErr?.error?.description ||
        rzErr?.description ||
        rzErr?.message ||
        "Razorpay refund failed";
      await PaymentRefund.findByIdAndUpdate(refundDoc._id, {
        error_msg: String(description),
      });
      return NextResponse.json(
        {
          success: false,
          message: "Please try again!",
          error_msg: String(description),
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("refund payment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Refund failed" },
      { status: 500 }
    );
  }
}
