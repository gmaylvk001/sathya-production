import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import OrderHistoryComments from "@/models/order_history_comments";

function getUserIdFromRequest(req) {
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

export async function POST(req) {
  try {
    await dbConnect();

    const users_id = getUserIdFromRequest(req);
    if (!users_id) {
      return NextResponse.json(
        { success: false, message: "Authorization token required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const order_number = String(body.order_number || "").trim();
    const order_status = String(body.order_status || "").trim();
    const comment = String(body.comment || "").trim();
    const order_history_id = body.order_history_id
      ? String(body.order_history_id).trim()
      : null;
    const order_id = body.order_id ? String(body.order_id).trim() : null;

    if (!order_number) {
      return NextResponse.json(
        { success: false, message: "order_number is required" },
        { status: 400 }
      );
    }
    if (!order_status) {
      return NextResponse.json(
        { success: false, message: "order_status is required" },
        { status: 400 }
      );
    }
    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment is required" },
        { status: 400 }
      );
    }
    if (comment.length > 255) {
      return NextResponse.json(
        { success: false, message: "Comment max length is 255" },
        { status: 400 }
      );
    }

    const row = await OrderHistoryComments.create({
      order_number,
      order_status,
      users_id,
      comment,
      order_history_id,
      order_id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Comment saved",
        data: row,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("order_history_comments POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save comment" },
      { status: 500 }
    );
  }
}
