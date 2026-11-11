import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { wondersoftAuthtoken, wondersoftGetSalesOrderStatus } from "@/lib/wondersoft";

/**
 * Exist AllordersController@checkStatus
 * Alert only — does NOT update DB.
 */
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { orderId } = await params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid order id" },
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

    // Exist checkStatus used production URL; we follow WordersSoftAPiMode from .env
    const tokenResult = await wondersoftAuthtoken();
    if (!tokenResult.ok) {
      return NextResponse.json({
        success: false,
        message: "Error...Access token generate issue in wondersoft api",
      });
    }

    const created = order.created_at ? new Date(order.created_at) : new Date();
    const orderdate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(created)
      .reduce((acc, part) => {
        if (part.type === "year" || part.type === "month" || part.type === "day") {
          acc[part.type] = part.value;
        }
        return acc;
      }, {});

    const payload = {
      SalesOrderStatus: {
        Order: {
          OrderNumber: String(order.order_number || "").trim(),
          OrderDate: `${orderdate.year}${orderdate.month}${orderdate.day}`,
          OrderLocation: String(order.pickup_type || "").trim(),
        },
      },
    };

    const posted = await wondersoftGetSalesOrderStatus(payload, tokenResult.accessToken);

    if (posted.result === "SUCCESS") {
      const statusText = posted.orderStatus || "Unknown";
      return NextResponse.json({
        success: true,
        message: `Order Status is ${statusText}`,
        order_status_wondersoft: statusText,
        wondersoft: {
          result: posted.result,
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: `Error...The reason is ${posted.failureReason || posted.statusMessage || "unknown"}`,
      wondersoft: {
        result: posted.result || "FAILURE",
        failureReason: posted.failureReason,
      },
    });
  } catch (error) {
    console.error("check-status error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Check status failed" },
      { status: 500 }
    );
  }
}
