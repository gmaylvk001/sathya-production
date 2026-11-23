import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import jwt from "jsonwebtoken";

function toOrderResponse(doc) {
  const order = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const created = order.created_at || order.createdAt || null;
  const updated = order.updated_at || order.updatedAt || null;
  const items = Array.isArray(order.order_item) ? order.order_item : [];
  const orderDetails =
    Array.isArray(order.order_details) && order.order_details.length > 0
      ? order.order_details
      : items.map((item) => ({
          product_name: item?.name || item?.product_name || "",
          product_price: Number(item?.price ?? item?.product_price ?? 0),
          quantity: Number(item?.quantity ?? 1),
          item_code: item?.item_code || null,
          model: item?.model || null,
        }));

  return {
    ...order,
    createdAt: created,
    updatedAt: updated,
    order_details: orderDetails,
  };
}

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    jwt.verify(token, process.env.JWT_SECRET);
    const status = searchParams.get("status");
    const order_number = searchParams.get("order_number");
    const query = {};

    if (status && status !== "all") {
      query.order_status = status;
    }

    if (order_number) {
      query.order_number = order_number;
    }

    const orders = await OrderNew.find(query)
      .sort({ created_at: -1, _id: -1 })
      .lean();

    if (order_number && orders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, orders: orders.map(toOrderResponse) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}