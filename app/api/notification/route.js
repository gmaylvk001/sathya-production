import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";

export async function GET(req) {
  await dbConnect();
  try {
    // Only return unread notifications
    const notifications = await Notification.find({ read: false })
      .sort({ createdAt: -1 })
      .populate({
        path: 'userId',
        model: 'ecom_users_info',
        select: 'name email mobile user_type',
      })
      .populate({
        path: 'orderId',
        model: 'ecom_order_info',
        select: 'order_number order_amount order_status order_item order_details',
      })
      .populate({
          path: 'feedbackId',
          model: 'ecom_feedback_infos',
          select: 'name email_address mobile_number feedback invoice_number',
        })
        .populate({
          path: 'contactId',
          model: 'ecom_contactx_infos',
          select: 'name email_address mobile_number message city status',
        });
    return Response.json({ success: true, notifications });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
