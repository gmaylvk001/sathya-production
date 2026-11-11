import PaymentNewLive from "@/models/payment_new_live";
import PaymentsNew from "@/models/payments_new";
import PaymentRefund from "@/models/payment_refund";

function trimStr(v) {
  return v == null ? "" : String(v).trim();
}

/** Exist: PaymentMode == "Online" (case-insensitive). */
export function isOnlinePaymentMode(order, payment) {
  const mode = trimStr(
    payment?.PaymentMode || order?.payment_mode || order?.payment_method || ""
  ).toLowerCase();
  return mode === "online";
}

/** Exist: payments.payment_id set → treated as Paid (Razorpay pay_xxx). */
export function resolveRazorpayPaymentId(order, payment) {
  const fromPayment = trimStr(payment?.payment_id);
  if (fromPayment) return fromPayment;
  return trimStr(order?.payment_id);
}

export async function findPaymentForOrder(order) {
  if (!order) return null;
  const orderId = order._id;
  const orderNumber = trimStr(order.order_number);

  let payment = null;
  if (orderId) {
    payment = await PaymentNewLive.findOne({ orderId }).lean();
  }
  if (!payment && orderNumber) {
    payment = await PaymentNewLive.findOne({ order_number: orderNumber }).lean();
  }
  if (!payment && orderNumber) {
    payment = await PaymentsNew.findOne({ order_number: orderNumber }).lean();
  }
  if (!payment && orderId) {
    payment = await PaymentsNew.findOne({
      $or: [{ order_id: String(orderId) }, { order_id: orderId }],
    }).lean();
  }
  return payment;
}

export async function findRefundForOrder(order) {
  if (!order) return null;
  const orderNumber = trimStr(order.order_number);
  if (!orderNumber) return null;

  // Exist: SELECT * FROM payment_refund WHERE order_number = ?
  return PaymentRefund.findOne({ order_number: orderNumber }).sort({ created_at: -1 }).lean();
}

/**
 * Exist AllordersController@getView show_refund rules:
 * yes ONLY IF Online + payment_id set + Cancelled + no payment_refund row.
 */
export function computeShowRefund(order, payment, existingRefund) {
  if (existingRefund) return "no";
  const status = trimStr(order?.order_status);
  if (status !== "Cancelled") return "no";
  if (!isOnlinePaymentMode(order, payment)) return "no";
  if (!resolveRazorpayPaymentId(order, payment)) return "no";
  return "yes";
}

export async function attachRefundMeta(order) {
  const payment = await findPaymentForOrder(order);
  const payment_refund = await findRefundForOrder(order);
  const show_refund = computeShowRefund(order, payment, payment_refund);

  order.show_refund = show_refund;
  order.payment_refund = payment_refund
    ? {
        _id: payment_refund._id,
        user_id: payment_refund.user_id || null,
        order_number: payment_refund.order_number || null,
        refund_id: payment_refund.refund_id || null,
        refund_amount: payment_refund.refund_amount || null,
        actual_paid_amount: payment_refund.actual_paid_amount || null,
        payment_id: payment_refund.payment_id || null,
        error_msg: payment_refund.error_msg || null,
        created_at: payment_refund.created_at || null,
        updated_at: payment_refund.updated_at || null,
      }
    : null;

  // Helpful for the form (hidden paymentid = payment doc id, like Exist payments.id)
  order.refund_payment_doc_id = payment?._id ? String(payment._id) : null;
  order.refund_razorpay_payment_id = resolveRazorpayPaymentId(order, payment) || null;
  order.refund_payment_mode = trimStr(
    payment?.PaymentMode || order?.payment_mode || order?.payment_method || ""
  );

  return order;
}
