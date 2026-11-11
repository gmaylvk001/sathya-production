import { NextResponse, after } from "next/server";
import dbConnect from "@/lib/db";
import { verifyPayuHash, verifyPayuTransaction } from "@/lib/payu";
import OrderNew from "@/models/orders_new";
import OrderHistoryNew from "@/models/order_history_new";
import PaymentNewLive from "@/models/payment_new_live";
import Cart from "@/models/ecom_cart_info";
import { sendOrderConfirmationSms } from "@/lib/orderConfirmSms";
import mongoose from "mongoose";
import { markOrdersPaid } from "@/lib/orderPayment";

// The request body can only be read once, so pick the parser up front.
async function readPayuParams(req) {
  const params = {};
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) params[key] = String(value);
    } else {
      const text = await req.text();
      for (const [key, value] of new URLSearchParams(text).entries()) params[key] = String(value);
    }
  } catch (err) {
    console.error("[PayU Callback] Failed to parse request body:", err);
  }
  for (const [key, value] of new URL(req.url).searchParams.entries()) {
    if (!(key in params)) params[key] = String(value);
  }
  return params;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PAYU_FAILED_STATUSES = ["failure", "failed", "usercancelled", "cancelled", "dropped", "bounced"];

/**
 * POST /api/payu/status
 * Handles PayU payment callback/webhook for Unilet orders.
 */
export async function POST(req) {
  return handlePayuReturn(req);
}

export async function GET(req) {
  return handlePayuReturn(req);
}

async function handlePayuReturn(req) {
  try {
    await dbConnect();

    const params = await readPayuParams(req);

    let {
      status = "",
      txnid = "",
      amount,
      mihpayid = "",
      udf1 = "", // order_number
      udf2 = "", // user_id
      error_Message = "",
    } = params;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    let isValid = params.hash ? verifyPayuHash(params).isValid : false;

    // PayU's posted data missing or unsigned: ask PayU for the real transaction status.
    if (!isValid && txnid) {
      const verified = await verifyPayuTransaction(txnid);
      if (!verified || !(verified.status === "success" || PAYU_FAILED_STATUSES.includes(verified.status))) {
        console.warn("[PayU Callback] Could not confirm transaction with PayU:", txnid, verified?.status || "no response");
        return NextResponse.redirect(
          new URL(`/checkout?error=${encodeURIComponent("We could not confirm your payment yet. Please check My Orders before paying again.")}`, baseUrl),
          303
        );
      }
      status = verified.status;
      mihpayid = verified.mihpayid || mihpayid;
      amount = verified.amount || amount;
      udf1 = verified.udf1 || udf1;
      udf2 = verified.udf2 || udf2;
      error_Message = verified.error_Message || error_Message;
      isValid = true;
    }

    const isSuccess = String(status || "").toLowerCase() === "success";

    const baseOrderNumber = String(udf1 || txnid.replace(/^TXN_/, "").replace(/_\d+$/, "")).trim();

    if (!baseOrderNumber || !txnid) {
      console.error("[PayU Callback] Missing order number / txnid; no orders updated. Keys:", Object.keys(params));
      return NextResponse.redirect(
        new URL(`/checkout?error=${encodeURIComponent("Payment response was empty. Please check your order status before retrying.")}`, baseUrl),
        303
      );
    }

    // Exact / checkout-group / legacy sibling match — never loose prefix
    const baseNoUl = baseOrderNumber.replace(/-UL$/i, "");
    const orders = await OrderNew.find({
      $or: [
        { online_pay_refid: txnid },
        { checkout_group_id: baseOrderNumber },
        { checkout_group_id: baseNoUl },
        { order_number: baseOrderNumber },
        { order_number: baseNoUl },
        { order_number: `${baseNoUl}-UL` },
        {
          order_number: {
            $regex: new RegExp(`^${escapeRegex(baseNoUl)}-\\d+(-UL)?$`),
          },
        },
      ],
    });

    if (!orders.length) {
      console.warn(`[PayU Callback] No orders found for txnid=${txnid} baseOrder=${baseOrderNumber}`);
      return NextResponse.redirect(
        new URL(
          `/checkout?error=${encodeURIComponent("Payment response was empty. Please check your order status before retrying.")}`,
          baseUrl
        ),
        303
      );
    }

    const allAlreadyPaid = orders.every(
      (o) => String(o.payment_status).toLowerCase() === "paid"
    );
    if (allAlreadyPaid && isSuccess) {
      return NextResponse.redirect(
        new URL(
          `/orders?payment=success&order_number=${encodeURIComponent(baseOrderNumber)}&payment_id=${encodeURIComponent(mihpayid || txnid)}`,
          baseUrl
        ),
        303
      );
    }

    if (isSuccess && isValid) {
      const expectedTotal = orders.reduce(
        (sum, o) => sum + (Number(o.order_amount) || 0),
        0
      );
      const paidAmount = parseFloat(amount) || 0;
      if (expectedTotal > 0 && Math.abs(paidAmount - expectedTotal) > 1) {
        console.error(
          `[PayU Callback] Amount mismatch paid=${paidAmount} expected=${expectedTotal} order=${baseOrderNumber}`
        );
        return NextResponse.redirect(
          new URL(
            `/checkout?error=${encodeURIComponent("Payment amount mismatch. Please contact support.")}`,
            baseUrl
          ),
          303
        );
      }

      const markResult = await markOrdersPaid({
        orderNumber: baseOrderNumber,
        userId: udf2 || orders[0]?.user_id,
        paymentId: mihpayid,
        paymentMethod: "online",
        paymentType: "PayU",
        paidAmountPaise: Math.round(paidAmount * 100),
      });

      if (!markResult.success) {
        console.error(`[PayU Callback] markOrdersPaid failed: ${markResult.error}`);
      }

      await OrderNew.updateMany(
        {
          _id: { $in: orders.map((o) => o._id) },
        },
        {
          $set: {
            online_pay_refid: txnid,
            online_pay_ref_status: "success",
          },
        }
      );

      // Record payment transaction
      try {
        await PaymentNewLive.create({
          payment_id: String(mihpayid || txnid),
          order_number: baseOrderNumber,
          orderId: orders[0]?._id || null,
          userId: udf2 && mongoose.isValidObjectId(udf2) ? new mongoose.Types.ObjectId(udf2) : null,
          amount: parseFloat(amount) || 0,
          status: "success",
          method: "PayU",
          payment_mode: "PayU",
        });
      } catch (payErr) {
        console.warn("[PayU Callback] Payment record create warning:", payErr.message);
      }

      // Clear customer cart
      if (udf2 && mongoose.isValidObjectId(udf2)) {
        await Cart.deleteOne({ userId: udf2 }).catch(() => {});
      }

      return NextResponse.redirect(
        new URL(
          `/orders?payment=success&order_number=${encodeURIComponent(baseOrderNumber)}&payment_id=${encodeURIComponent(mihpayid)}`,
          baseUrl
        ),
        303
      );
    } else {
      // Payment Failed or Cancelled
      const failReason = error_Message || (isValid ? "Payment was declined by bank" : "Signature verification failed");

      for (const order of orders) {
        order.order_status = "failure";
        order.payment_status = "failed";
        order.online_pay_ref_status = "failure";
        await order.save();

        await OrderHistoryNew.create({
          order_id: String(order._id),
          order_number: order.order_number,
          order_status: "failure",
          notify: 0,
          comment: `PayU payment failed: ${failReason}`,
        });
        // Stock remains untouched because it was never prematurely deducted
      }

      return NextResponse.redirect(
        new URL(
          `/checkout?error=${encodeURIComponent(failReason)}&order_number=${encodeURIComponent(baseOrderNumber)}`,
          baseUrl
        ),
        303
      );
    }
  } catch (error) {
    console.error("[PayU Status Callback Error]:", error);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/checkout?error=${encodeURIComponent(error.message || "Payment processing error")}`, baseUrl),
      303
    );
  }
}
