import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import StoreListing from "@/models/store_listings";
import { sendOrderData } from "@/lib/sendOrderData";
import { ownerFieldFilter } from "@/lib/storeView";

/**
 * Exist CallApi (admin PlaceOrder / Assign path):
 * save pickup_type = branchid → sendOrderData (Wondersoft only).
 * Invenzo is NOT called here (Exist: Invenso only in storeOrders checkout).
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

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Exist CallApi UI: empty branch → default SSSA
    let branchid = String(body.branchid || body.pickup_type || "").trim();
    if (!branchid) branchid = "SSSA";
    const remarks = body.remarks != null ? String(body.remarks) : "";

    const order = await OrderNew.findById(orderId).lean();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const uniletOrder = String(order.order_owner || "").trim().toLowerCase() === "unilet";
    if (branchid.toUpperCase() !== "SSSA") {
      const branchPattern = branchid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingStore = await StoreListing.findOne({
        branch_code: { $regex: new RegExp(`^${branchPattern}$`, "i") },
        ...ownerFieldFilter("store_owner", uniletOrder),
      })
        .select("_id")
        .lean();
      if (!matchingStore) {
        return NextResponse.json(
          {
            success: false,
            message: uniletOrder ? "Select a Unilet store" : "Select a Sathya store",
          },
          { status: 400 }
        );
      }
    }

    await OrderNew.updateOne(
      { _id: orderId },
      { $set: { pickup_type: branchid, pickup_store: branchid } }
    );

    const result = await sendOrderData(orderId, remarks);

    const ok = result.api_status === "SUCCESS";
    return NextResponse.json({
      success: ok,
      message: ok
        ? result.api_reason || "Order Placed Successfully"
        : result.api_reason || result.api_status || "Place order failed",
      api_status: result.api_status,
      api_reason: result.api_reason,
      pickup_type: branchid,
      skippedApi: result.skippedApi || false,
    });
  } catch (error) {
    console.error("home-place-order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Place order failed" },
      { status: 500 }
    );
  }
}
