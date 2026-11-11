import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/ecom_order_info";

import jwt from "jsonwebtoken";


export async function GET(req) {
  try {
    await connectDB();

    // Get the token from headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const order = await Order.find({ user_id:userId });
      

    if (!order) {
      return NextResponse.json(
        { message: "Cart is empty", cart: { items: [], totalItems: 0, totalPrice: 0 } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        order: order
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Get cart error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get cart" },
      { status: 500 }
    );
  }
}
