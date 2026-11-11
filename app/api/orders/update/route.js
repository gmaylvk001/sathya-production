import dbConnect from "@/lib/db";
import EcomOrderInfo from "@/models/ecom_order_info";

export async function POST(req) {
  await dbConnect();

  try {
    const { order_id, order_status, payment_status, payment_id } = await req.json();

    if (!order_id || !order_status) {
      return Response.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const updateFields = { order_status };
    if (payment_status) updateFields.payment_status = payment_status;
    if (payment_id) updateFields.payment_id = payment_id;

    const updatedOrder = await EcomOrderInfo.findOneAndUpdate(
      { _id: order_id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedOrder) {
      return Response.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return Response.json({ success: true, message: `Order marked as ${order_status}`, order: updatedOrder });

  } catch (error) {
    return Response.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
  }
}