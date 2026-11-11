import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/models/ecom_order_info";
import jwt from "jsonwebtoken";

export async function GET(req) {
  await dbConnect();

  try {
    console.log("hai");
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const status = searchParams.get("status");
    const order_number = searchParams.get("order_number");
    console.log(order_number);
    let query = {};

    if (status && status !== "all") {
      query.order_status = status;
    }

    if (order_number) {
      query.order_number = order_number;
    }

    console.log(query);
    const orders = await Order.find(query).sort({ createdAt: -1 });
    
    if (order_number && orders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}