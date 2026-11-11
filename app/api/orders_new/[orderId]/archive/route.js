import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";

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

// Only sets archive = 1: no status change, no order history, no Wondersoft, no SMS.
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { orderId } = await params;

    if (!getAdminUserId(req)) {
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

    const result = await OrderNew.updateOne(
      { _id: orderId },
      { $set: { archive: 1 } }
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Order has been successfully archived",
    });
  } catch (error) {
    console.error("archive order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to archive order" },
      { status: 500 }
    );
  }
}
