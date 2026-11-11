import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import PaymentNewLive from "@/models/payment_new_live";
import OrderNew from "@/models/orders_new";
import { getAuthUserId } from "@/lib/authRequest";

function toObjectId(value) {
  if (!value) return null;
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

export async function POST(req) {
  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = String(body.user_id || "");

    if (!userId || userId !== String(authUserId)) {
      return NextResponse.json(
        { error: "User ID is required and must match the logged-in user" },
        { status: 403 }
      );
    }

    const modevalue = body.modevalue ?? null;
    const payment_Date = body.payment_Date || null;
    const payment_id = body.payment_id || null;
    const payment_mode = body.payment_mode || null;
    const order_number = body.order_number ? String(body.order_number) : null;

    // Never trust browser "paid" for online gateways — derive from known offline modes only
    const offlineModes = new Set(["Cash on Delivery", "Pay at Store", "COD", "pay_at_store"]);
    let status = "pending";
    if (offlineModes.has(String(payment_mode))) {
      status = "pending";
    } else if (payment_id && String(payment_id).startsWith("pay_")) {
      // Razorpay ids — status already verified in /api/verify-payment
      status = "paid";
    } else if (payment_id && String(payment_id).startsWith("COD_")) {
      status = "pending";
    } else if (payment_id && String(payment_id).startsWith("PAS_")) {
      status = "pending";
    } else {
      status = "pending";
    }

    await connectDB();

    let targetOrder = null;
    if (order_number) {
      targetOrder = await OrderNew.findOne({
        order_number,
        user_id: String(userId),
      }).lean();
    }

    if (!targetOrder) {
      const recentCutoff = new Date(Date.now() - 10 * 60 * 1000);
      targetOrder = await OrderNew.findOne({
        user_id: String(userId),
        created_at: { $gte: recentCutoff },
      })
        .sort({ created_at: -1 })
        .lean();
    }

    const payload = {
      userId: toObjectId(userId),
      order_number: targetOrder?.order_number || order_number || null,
      amount: modevalue != null && modevalue !== "" ? Number(modevalue) : null,
      status,
      ModeType: payment_mode,
      PaymentMode: payment_mode,
      ModeValue: modevalue != null ? String(modevalue) : null,
      payment_id,
      payment_date: payment_Date ? String(payment_Date) : null,
      ReferenceDate: payment_Date ? new Date(payment_Date) : new Date(),
    };

    let paymentData;

    if (targetOrder?._id) {
      paymentData = await PaymentNewLive.findOneAndUpdate(
        { orderId: targetOrder._id },
        { $set: { ...payload, orderId: targetOrder._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      paymentData = await PaymentNewLive.create({
        ...payload,
        orderId: new mongoose.Types.ObjectId(),
      });
    }

    return NextResponse.json(
      {
        message: "Payment saved successfully",
        paymentData: {
          ...paymentData.toObject(),
          payment_id: paymentData.payment_id,
          status: paymentData.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
