import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import { adminAddOrderHistory } from "@/lib/adminOrderHistory";

function getAdminUserId(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId ? String(decoded.userId) : null;
  } catch {
    return null;
  }
}

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { orderId } = await params;

    const adminUserId = getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: "Authorization token required" },
        { status: 401 }
      );
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid order id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const status = String(body.status || "").trim();
    const comment = body.comment != null ? String(body.comment).trim() : "";

    const order = await OrderNew.findById(orderId).lean();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const outcome = await adminAddOrderHistory({
      order,
      status,
      comment,
      adminUserId,
    });

    return NextResponse.json(
      {
        success: outcome.success,
        message: outcome.message,
        order_status: outcome.order_status,
        branch: outcome.branch,
        wondersoft: outcome.wondersoft || null,
      },
      { status: outcome.statusCode || (outcome.success ? 200 : 400) }
    );
  } catch (error) {
    console.error("add-history error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to add history" },
      { status: 500 }
    );
  }
}
