import PaymentRefund from "@/models/payment_refund";

function toText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null") return "";
  return text;
}

function matchKeys(value) {
  const text = toText(value);
  if (!text) return [];
  const values = new Set([text]);
  if (/^\d+(\.0+)?$/.test(text)) {
    const n = Math.trunc(Number(text));
    values.add(String(n));
    values.add(`${n}.0`);
  }
  return [...values];
}

async function loadMovedKeySet(field, keys) {
  const found = new Set();
  const list = [...keys];
  const chunkSize = 2000;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    if (!chunk.length) continue;
    const rows = await PaymentRefund.find({ [field]: { $in: chunk } }, { [field]: 1 }).lean();
    for (const row of rows) {
      matchKeys(row[field]).forEach((key) => found.add(key));
    }
  }
  return found;
}

function isMoved(row, movedOrders, movedRefunds, movedPayments) {
  return (
    matchKeys(row.order_number).some((key) => movedOrders.has(key)) ||
    matchKeys(row.refund_id).some((key) => movedRefunds.has(key)) ||
    matchKeys(row.payment_id).some((key) => movedPayments.has(key))
  );
}

/**
 * A row is moved when payment_refund already has the same order number,
 * refund id, or payment id. Those rows stay in exist_payment_refund.
 */
export async function splitExistRefundsByMove(rows) {
  const orderNumbers = new Set();
  const refundIds = new Set();
  const paymentIds = new Set();
  for (const row of rows) {
    matchKeys(row.order_number).forEach((key) => orderNumbers.add(key));
    matchKeys(row.refund_id).forEach((key) => refundIds.add(key));
    matchKeys(row.payment_id).forEach((key) => paymentIds.add(key));
  }

  const [movedOrders, movedRefunds, movedPayments] = await Promise.all([
    loadMovedKeySet("order_number", orderNumbers),
    loadMovedKeySet("refund_id", refundIds),
    loadMovedKeySet("payment_id", paymentIds),
  ]);

  const visible = [];
  let movedCount = 0;
  for (const row of rows) {
    if (isMoved(row, movedOrders, movedRefunds, movedPayments)) movedCount += 1;
    else visible.push(row);
  }
  return { visible, movedCount };
}
