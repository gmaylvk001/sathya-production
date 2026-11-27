import PaymentNewLive from "@/models/payment_new_live";
import PaymentsNew from "@/models/payments_new";
import ExistPaymentRefund from "@/models/exist_payment_refund";
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
  return payment;
}

export async function findRefundForOrder(order) {
  if (!order) return null;
  const orderNumber = trimStr(order.order_number);
  if (!orderNumber) return null;

  // Exist: SELECT * FROM payment_refund WHERE order_number = ?
  return PaymentRefund.findOne({ order_number: orderNumber }).sort({ created_at: -1 }).lean();
}

function refundPublicShape(row) {
  if (!row) return null;
  return {
    _id: row._id,
    user_id: row.user_id || null,
    order_number: row.order_number || null,
    refund_id: row.refund_id || null,
    refund_amount: row.refund_amount || null,
    actual_paid_amount: row.actual_paid_amount || null,
    payment_id: row.payment_id || null,
    error_msg: row.error_msg || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function firstByKey(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key && !map.has(key)) map.set(key, row);
  }
  return map;
}

function paymentExistIdForOrder(order, liveByOrderId, liveByOrderNumber, oldByOrderNumber, oldByExistId) {
  const orderId = order?._id ? String(order._id) : "";
  const orderNumber = trimStr(order?.order_number);
  const paymentId = trimStr(order?.payment_id);
  const live = liveByOrderId.get(orderId) || liveByOrderNumber.get(orderNumber);
  const fromLive = trimStr(live?.exist_id);
  if (fromLive) return fromLive;
  const old = oldByOrderNumber.get(orderNumber) || (paymentId ? oldByExistId.get(paymentId) : null);
  return trimStr(old?.exist_id);
}

function refundInsertFromExist(existRefund, order) {
  const paymentId = trimStr(existRefund?.payment_id);
  if (!paymentId) return null;
  const orderNumber = trimStr(order?.order_number) || trimStr(existRefund?.order_number);
  if (!orderNumber) return null;
  return {
    user_id: trimStr(existRefund.user_id) || (order?.user_id != null ? String(order.user_id) : null),
    order_number: orderNumber,
    refund_id: trimStr(existRefund.refund_id) || null,
    refund_amount: existRefund.refund_amount != null ? String(existRefund.refund_amount) : null,
    actual_paid_amount:
      existRefund.actual_paid_amount != null ? String(existRefund.actual_paid_amount) : null,
    payment_id: paymentId,
    error_msg: existRefund.error_msg || null,
    created_at: existRefund.created_at || null,
    updated_at: existRefund.updated_at || null,
  };
}

/**
 * When an admin or user order is fetched, copy an imported exist refund into
 * payment_refund when that order does not already have one.
 * Match exist_payment_refund.order_number, or payment exist_id against
 * exist_payment_refund.payment_id.
 */
export async function syncExistRefundsToPaymentRefund(orders) {
  const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
  const byOrderNumber = new Map();
  if (!list.length) return byOrderNumber;

  const orderNumbers = [...new Set(list.map((order) => trimStr(order.order_number)).filter(Boolean))];
  if (!orderNumbers.length) return byOrderNumber;

  const stored = await PaymentRefund.find({ order_number: { $in: orderNumbers } })
    .sort({ created_at: -1 })
    .lean();
  for (const row of stored) {
    const key = trimStr(row.order_number);
    if (key && !byOrderNumber.has(key)) byOrderNumber.set(key, row);
  }

  const missing = list.filter((order) => {
    const orderNumber = trimStr(order.order_number);
    return orderNumber && !byOrderNumber.has(orderNumber);
  });
  if (!missing.length) return byOrderNumber;

  const missingNumbers = [...new Set(missing.map((order) => trimStr(order.order_number)))];
  const existByNumberRows = await ExistPaymentRefund.find({
    order_number: { $in: missingNumbers },
  }).lean();
  const existByNumber = firstByKey(existByNumberRows, (row) => trimStr(row.order_number));

  const needPaymentId = missing.filter((order) => !existByNumber.has(trimStr(order.order_number)));
  const existIdByOrder = new Map();

  if (needPaymentId.length) {
    const needIds = needPaymentId.map((order) => order._id).filter(Boolean);
    const needNumbers = [...new Set(needPaymentId.map((order) => trimStr(order.order_number)).filter(Boolean))];
    const liveOr = [];
    if (needIds.length) liveOr.push({ orderId: { $in: needIds } });
    if (needNumbers.length) liveOr.push({ order_number: { $in: needNumbers } });
    const livePayments = liveOr.length
      ? await PaymentNewLive.find({ $or: liveOr }).select("orderId order_number exist_id").lean()
      : [];
    const liveByOrderId = firstByKey(livePayments, (row) => (row.orderId ? String(row.orderId) : ""));
    const liveByOrderNumber = firstByKey(livePayments, (row) => trimStr(row.order_number));

    const stillNeed = needPaymentId.filter((order) => {
      const existId = trimStr(
        liveByOrderId.get(order._id ? String(order._id) : "")?.exist_id ||
          liveByOrderNumber.get(trimStr(order.order_number))?.exist_id
      );
      if (existId) existIdByOrder.set(trimStr(order.order_number), existId);
      return !existId;
    });

    let oldByOrderNumber = new Map();
    let oldByExistId = new Map();
    if (stillNeed.length) {
      const nums = [...new Set(stillNeed.map((order) => trimStr(order.order_number)).filter(Boolean))];
      const payIds = [...new Set(stillNeed.map((order) => trimStr(order.payment_id)).filter(Boolean))];
      const oldOr = [];
      if (nums.length) oldOr.push({ order_number: { $in: nums } });
      if (payIds.length) oldOr.push({ exist_id: { $in: payIds } });
      const oldPayments = oldOr.length
        ? await PaymentsNew.find({ $or: oldOr }).select("exist_id order_number").lean()
        : [];
      oldByOrderNumber = firstByKey(oldPayments, (row) => trimStr(row.order_number));
      oldByExistId = firstByKey(oldPayments, (row) => trimStr(row.exist_id));
    }

    for (const order of stillNeed) {
      const existId = paymentExistIdForOrder(order, liveByOrderId, liveByOrderNumber, oldByOrderNumber, oldByExistId);
      if (existId) existIdByOrder.set(trimStr(order.order_number), existId);
    }
  }

  const existIds = [...new Set([...existIdByOrder.values()].filter(Boolean))];
  const existByPaymentRows = existIds.length
    ? await ExistPaymentRefund.find({ payment_id: { $in: existIds } }).lean()
    : [];
  const existByPaymentId = firstByKey(existByPaymentRows, (row) => trimStr(row.payment_id));

  const toInsert = [];
  const seenRefundIds = new Set();
  for (const order of missing) {
    const orderNumber = trimStr(order.order_number);
    const exist =
      existByNumber.get(orderNumber) ||
      existByPaymentId.get(existIdByOrder.get(orderNumber) || "");
    const payload = refundInsertFromExist(exist, order);
    if (!payload || byOrderNumber.has(payload.order_number)) continue;
    if (payload.refund_id && seenRefundIds.has(payload.refund_id)) continue;
    if (payload.refund_id) seenRefundIds.add(payload.refund_id);
    toInsert.push(payload);
  }

  if (toInsert.length) {
    try {
      await PaymentRefund.insertMany(toInsert, { ordered: false });
    } catch (error) {
      const insertedCount = error?.result?.insertedCount || error?.insertedDocs?.length || 0;
      if (!insertedCount && error?.code !== 11000 && !error?.writeErrors?.length) {
        console.error("[syncExistRefunds] payment_refund save failed:", error?.message || error);
      }
    }
    const fresh = await PaymentRefund.find({
      order_number: { $in: toInsert.map((row) => row.order_number) },
    })
      .sort({ created_at: -1 })
      .lean();
    for (const row of fresh) {
      const key = trimStr(row.order_number);
      if (key) byOrderNumber.set(key, row);
    }
  }

  return byOrderNumber;
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
  const refundByOrder = await syncExistRefundsToPaymentRefund(order);
  const payment_refund = refundByOrder.get(trimStr(order?.order_number)) || null;
  const show_refund = computeShowRefund(order, payment, payment_refund);

  order.show_refund = show_refund;
  order.payment_refund = refundPublicShape(payment_refund);

  // Helpful for the form (hidden paymentid = payment doc id, like Exist payments.id)
  order.refund_payment_doc_id = payment?._id ? String(payment._id) : null;
  order.refund_razorpay_payment_id = resolveRazorpayPaymentId(order, payment) || null;
  order.refund_payment_mode = trimStr(
    payment?.PaymentMode || order?.payment_mode || order?.payment_method || ""
  );

  return order;
}
