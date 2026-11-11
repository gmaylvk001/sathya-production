import mongoose from "mongoose";
import User from "@/models/User";

/**
 * Customer Details phone = ecom_users_infos.mobile (current account phone).
 * Order Details phone = order.order_phonenumber (snapshot at place time).
 */
export async function attachCustomerCurrentPhone(order) {
  if (!order) return order;

  const userId = order.user_id != null ? String(order.user_id).trim() : "";
  let user = null;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).select("mobile name email exist_id").lean();
  }
  if (!user && userId) {
    user = await User.findOne({ exist_id: userId }).select("mobile name email exist_id").lean();
  }

  const mobile =
    user?.mobile != null && String(user.mobile).trim() !== ""
      ? String(user.mobile).trim()
      : null;

  order.customer_current_phone = mobile;
  if (user) {
    order.customer_name = user.name || null;
    order.customer_email = user.email || null;
  }
  return order;
}
