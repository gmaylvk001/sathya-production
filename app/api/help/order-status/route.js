import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const orderNumber = String(body?.orderNumber || "").trim();
    const contact = String(body?.contact || "").trim();

    if (!orderNumber || !contact) {
      return NextResponse.json(
        { success: false, message: "Please enter both Order Number and Mobile / Email." },
        { status: 400 }
      );
    }

    const cleanPhone = contact.replace(/\D/g, "").slice(-10);
    const isEmail = contact.includes("@");

    const query = {
      order_number: { $regex: new RegExp(`^${orderNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    };

    if (isEmail) {
      query.email_address = { $regex: new RegExp(`^${contact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
    } else if (cleanPhone.length === 10) {
      query.order_phonenumber = { $regex: new RegExp(`${cleanPhone}$`) };
    } else {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 10-digit mobile number or email address." },
        { status: 400 }
      );
    }

    const order = await OrderNew.findOne(query)
      .select("order_number order_status payment_status delivery_type order_amount createdAt order_details")
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "No matching order found. Please check your Order Number and Mobile / Email." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        status: order.order_status || "Pending",
        paymentStatus: order.payment_status || "Pending",
        deliveryType: order.delivery_type || "home",
        totalAmount: Number(order.order_amount || 0),
        itemCount: Array.isArray(order.order_details) ? order.order_details.length : 0,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to check order status right now." },
      { status: 500 }
    );
  }
}
