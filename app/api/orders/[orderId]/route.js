import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/models/ecom_order_info";

export async function PUT(req, { params }) {
  await dbConnect();
  const { orderId } =await params;

  try {
    const { status, delivery_date } = await req.json();

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status is required" },
        { status: 400 }
      );
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = { order_status: status };
    
    // Add delivery date if provided
    if (delivery_date) {
      updateData.delivery_date = delivery_date;
    }

    // Add to order history
    updateData.$push = {
      order_history: {
        status: status.charAt(0).toUpperCase() + status.slice(1),
        date: new Date(),
        customer_notified: true
      }
    };

    // ✅ Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    return NextResponse.json(
      { success: true, order: updatedOrder },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}