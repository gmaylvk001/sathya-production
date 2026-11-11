import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import { getAuthUserId } from "@/lib/authRequest";
import { getAdminUserId } from "@/lib/adminRequest";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const order_id = searchParams.get("order_id");

  if (!order_id) {
    return NextResponse.json(
      { success: false, error: "Order ID is required" },
      { status: 400 }
    );
  }

  try {
    const authUserId = await getAuthUserId(request);
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const query = { order_number: order_id };
    if (/^[a-f\d]{24}$/i.test(order_id)) {
      query.$or = [{ order_number: order_id }, { _id: order_id }];
      delete query.order_number;
    }
    const order = await OrderNew.findOne(
      query.$or ? { $or: query.$or } : query
    ).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const adminUserId = await getAdminUserId(request);
    if (!adminUserId && String(order.user_id) !== String(authUserId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const order_details = await OrderDetailsNew.find({
      $or: [
        { order_id: order._id },
        { orderNumber: order.order_number },
      ],
    }).lean();

    return NextResponse.json({
      success: true,
      order: { ...order, order_details },
    });
  } catch (error) {
    console.error("get-single order error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
