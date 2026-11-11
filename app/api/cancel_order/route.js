import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import CancelOrders from "@/models/cancel_orders_live";
import OrderDetailsNew from "@/models/order_details_new";
import { cancelOrder } from "@/lib/cancelOrder";
import { ensureAppCancelsMoved } from "@/lib/cancelOrdersLive";
import { getAuthUserId } from "@/lib/authRequest";
import { getAdminUserId } from "@/lib/adminRequest";

export async function POST(req) {
  try {
    await dbConnect();

    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json(
        { result: "Unauthorized", message: "Please login to cancel an order." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const reason = String(body.reason || "").trim();
    const comments = body.comments != null ? String(body.comments).trim() : "";
    const cancel_order_number = String(body.cancel_order_number || "").trim();
    const cancel_order_id = String(body.cancel_order_id || "").trim();
    const order_status = String(body.order_status || "").trim();

    if (!reason) {
      return NextResponse.json(
        { result: "Please select a reason", message: "Please select a reason" },
        { status: 400 }
      );
    }
    if (!cancel_order_id || !mongoose.Types.ObjectId.isValid(cancel_order_id)) {
      return NextResponse.json(
        { result: "Invalid order id", message: "Invalid order id" },
        { status: 400 }
      );
    }
    if (!cancel_order_number) {
      return NextResponse.json(
        { result: "Order number is required", message: "Order number is required" },
        { status: 400 }
      );
    }

    const order = await OrderNew.findById(cancel_order_id).lean();
    if (!order) {
      return NextResponse.json(
        { result: "Order not found", message: "Order not found" },
        { status: 404 }
      );
    }

    // Ownership: only order owner or admin may cancel
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId && String(order.user_id) !== String(authUserId)) {
      return NextResponse.json(
        { result: "Forbidden", message: "You can only cancel your own orders." },
        { status: 403 }
      );
    }

    await ensureAppCancelsMoved();
    const existingCancel = await CancelOrders.findOne({
      $or: [
        { order_id: String(order._id) },
        ...(order.order_number ? [{ order_number: String(order.order_number).trim() }] : []),
      ],
    }).lean();
    if (existingCancel) {
      return NextResponse.json(
        {
          result: "Cancel request already exists",
          message: "A cancellation request already exists for this order.",
        },
        { status: 400 }
      );
    }

    // Exist My Orders: Pending/Processing (incl. Billed) can submit Request Cancel.
    // Billed is not a full cancel here — cancelOrder() saves waiting request only.
    const statusKey = String(order.order_status || "").trim().toLowerCase();
    const cancellableStatuses = new Set([
      "ordered",
      "order placed",
      "order accepted",
      "pending",
      "payment initiated",
      "payment initialized",
      "billed",
    ]);
    if (!cancellableStatuses.has(statusKey)) {
      return NextResponse.json(
        {
          result: "Order cannot be cancelled",
          message: "This order is not eligible for cancellation.",
        },
        { status: 400 }
      );
    }

    // Only block warranty when the line is a standalone warranty SKU purchase
    const orderDetails = await OrderDetailsNew.find({
      $or: [
        { order_id: order._id },
        ...(order.order_number ? [{ orderNumber: order.order_number }] : []),
      ],
    }).lean();
    const hasStandaloneWarranty = orderDetails.some(
      (item) =>
        Number(item.is_warranty) === 1 &&
        !item.product_id &&
        String(item.product_name || "").toLowerCase().includes("warranty")
    );
    if (hasStandaloneWarranty) {
      return NextResponse.json(
        {
          result: "Warranty orders cannot be cancelled",
          message: "Orders containing warranty items cannot be cancelled.",
        },
        { status: 400 }
      );
    }

    const outcome = await cancelOrder({
      order,
      reason,
      comments,
      customerId: String(order.user_id || authUserId),
      orderStatus: order_status || order.order_status || "",
    });

    const isSuccess = outcome.result === "Success";
    return NextResponse.json(
      {
        result: outcome.result,
        message: isSuccess
          ? "Thank you!. Your request has been sent."
          : outcome.result,
        order_status: outcome.order_status,
        branch: outcome.branch,
        wondersoft: outcome.wondersoft || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("cancel_order error:", error);
    return NextResponse.json(
      {
        result: "something is wrong. Please try again later!",
        message: error.message || "something is wrong. Please try again later!",
      },
      { status: 500 }
    );
  }
}
