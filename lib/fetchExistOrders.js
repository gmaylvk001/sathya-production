import ExistSathyaOrder from "@/models/ExistSathyaOrder";
import ExistSathyaOrderDetail from "@/models/ExistSathyaOrderDetail";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import PaymentsNew from "@/models/payments_new";
import PaymentNewLive from "@/models/payment_new_live";
import OrderHistoryNew from "@/models/order_history_new";
import CancelOrders from "@/models/cancel_orders";
import CancelOrdersLive from "@/models/cancel_orders_live";
import User from "@/models/User";
import ExistSathyaUser from "@/models/ExistSathyaUser";

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function emptyToNull(value) {
  const text = toText(value);
  return text === "" || text.toLowerCase() === "null" ? null : text;
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function existIdMatchValues(value) {
  const text = toText(value);
  if (!text) return [];
  const values = new Set([text]);
  if (/^\d+(\.0+)?$/.test(text)) {
    const n = Math.trunc(Number(text));
    values.add(String(n));
    values.add(`${n}.0`);
    values.add(n);
  }
  return [...values];
}

function matchStringList(value) {
  return existIdMatchValues(value).map(String);
}

function phoneLookupKeys(value) {
  const digits = toText(value).replace(/\D/g, "");
  if (digits.length < 10) return [];
  const last10 = digits.slice(-10);
  return [...new Set([last10, `91${last10}`, `+91${last10}`, `0${last10}`, digits])];
}

async function resolveExistId(user) {
  const current = toText(user.exist_id);
  if (current && current.toLowerCase() !== "null") return current;

  const or = [];
  const email = toText(user.email).toLowerCase();
  if (email && email !== "null") or.push({ email });

  const phones = phoneLookupKeys(user.mobile);
  if (phones.length) {
    or.push({ phone: { $in: phones } });
    or.push({ phone: { $regex: `${phones[0]}$` } });
  }
  if (!or.length) return "";

  const matches = await ExistSathyaUser.find({ $or: or }).select("exist_id email phone").lean();
  const ids = [...new Set(
    matches
      .map((row) => toText(row.exist_id))
      .filter((id) => id && id.toLowerCase() !== "null")
  )];
  if (ids.length !== 1) return "";

  await User.updateOne({ _id: user._id }, { $set: { exist_id: ids[0] } });
  user.exist_id = ids[0];
  return ids[0];
}

function normalizeStatusKey(value) {
  return toText(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

const ORDER_STATUS_VALUES = [
  "Billed",
  "Cancelled",
  "Complete",
  "failure",
  "Order Accepted",
  "Order Placed",
  "ordered",
  "Payment Initiated",
  "pending",
];

const DELIVERY_TYPE_VALUES = ["store", "home"];

function keepSameAllowedValue(value, allowed, fallback) {
  const raw = toText(value);
  if (!raw) return fallback;
  const exact = allowed.find((item) => item === raw);
  if (exact) return exact;
  const sameStatus = allowed.find((item) => item.toLowerCase() === raw.toLowerCase());
  if (sameStatus) return sameStatus;
  return raw;
}

function mapPaymentStatus(value) {
  const lower = normalizeStatusKey(value);
  if (lower === "paid" || lower === "success" || lower === "captured") return "paid";
  if (lower === "payment initialized" || lower === "payment initiated") return "payment_initialized";
  return "pending";
}

function parseMaybeJsonArray(value) {
  if (Array.isArray(value)) return value;
  const text = toText(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildOrderItems(details, fallbackItem) {
  if (details.length) {
    return details.map((row, index) => ({
      id: index + 1,
      name: emptyToNull(row.product_name),
      price: toNumber(row.product_price, 0),
      item_code: emptyToNull(row.item_code),
      model: emptyToNull(row.model),
      coupondiscount: toNumber(row.coupon_discount, 0),
      coupondetails: [],
      quantity: toNumber(row.quantity, 1),
      store_id: emptyToNull(row.store_id),
      warranty: toNumber(row.is_warranty, 0),
      extendedWarranty: 0,
      warrantyData: {
        item_no: emptyToNull(row.warranty_product_code),
        name: null,
        year: null,
        price: null,
      },
      image: null,
      original_quantity: toNumber(row.quantity, 1),
      discount: toNumber(row.coupon_discount, 0),
      created_at: row.created_at || new Date(),
      updated_at: row.updated_at || new Date(),
    }));
  }
  return parseMaybeJsonArray(fallbackItem);
}

function buildNewOrderHeader(existOrder, details, user, payment) {
  const orderNumber = emptyToNull(existOrder.order_number);
  const liveUserId = String(user._id);
  const email = emptyToNull(user.email) || `exist-${liveUserId}@sathya.local`;
  const username = emptyToNull(existOrder.order_username) || emptyToNull(user.name) || "User";
  const phone = emptyToNull(existOrder.order_phonenumber) || emptyToNull(user.mobile) || "0";
  const amount = emptyToNull(existOrder.order_amount) || "0";
  const orderStatus = keepSameAllowedValue(existOrder.order_status, ORDER_STATUS_VALUES, "pending");
  const paymentMode = emptyToNull(payment?.PaymentMode) || emptyToNull(payment?.ModeType);
  const paymentStatus = mapPaymentStatus(payment?.status || existOrder.online_pay_ref_status);

  return {
    exist_id: emptyToNull(existOrder.exist_id),
    cart_id: emptyToNull(existOrder.cart_id),
    user_id: liveUserId,
    sales_person_id: toNumber(existOrder.sales_person_id),
    sales_person_role: toNumber(existOrder.sales_person_role),
    user_adddeliveryid: emptyToNull(existOrder.user_adddeliveryid),
    user_addbillingid: emptyToNull(existOrder.user_addbillingid),
    order_username: username,
    order_phonenumber: phone,
    email_address: email,
    order_item: buildOrderItems(details, existOrder.order_item),
    order_amount: amount,
    order_deliveryaddress: emptyToNull(existOrder.order_deliveryaddress),
    order_billingaddress: emptyToNull(existOrder.order_billingaddress),
    customer_comments: "",
    payment_method: paymentMode || emptyToNull(existOrder.payment_method),
    payment_type: emptyToNull(payment?.ModeType) || emptyToNull(existOrder.payment_type) || paymentMode,
    payment_mode: paymentMode || emptyToNull(existOrder.payment_type),
    payment_status: paymentStatus,
    order_status: orderStatus,
    delivery_type: keepSameAllowedValue(existOrder.delivery_type, DELIVERY_TYPE_VALUES, "home"),
    pickup_store: emptyToNull(existOrder.pickup_type),
    pickup_type: emptyToNull(existOrder.pickup_type),
    store_id: emptyToNull(details[0]?.store_id),
    payment_id: emptyToNull(existOrder.payment_id),
    order_number: orderNumber,
    api_status: emptyToNull(existOrder.api_status) || "PENDING",
    api_reason: emptyToNull(existOrder.api_reason),
    type: emptyToNull(existOrder.type) || emptyToNull(details[0]?.type) || "online",
    file_path: emptyToNull(existOrder.file_path),
    invoice: emptyToNull(existOrder.invoice),
    is_tac: toNumber(existOrder.is_tac),
    archive: toNumber(existOrder.archive) ?? 0,
    referrel_url: emptyToNull(existOrder.referrel_url),
    utm_source: emptyToNull(existOrder.utm_source),
    utm_campaign: emptyToNull(existOrder.utm_campaign),
    coupon_discount: toNumber(existOrder.coupon_discount),
    eo_discount: toNumber(existOrder.eo_discount),
    coupon_id: emptyToNull(existOrder.coupon_id),
    offline_order_date: existOrder.offline_order_date || null,
    emi_txn_ref_no: emptyToNull(existOrder.emi_txn_ref_no),
    rcu_status: toNumber(existOrder.rcu_status) ?? 0,
    asset_status: toNumber(existOrder.asset_status) ?? 0,
    do_generation_status: toNumber(existOrder.do_generation_status) ?? 0,
    doc_status: toNumber(existOrder.doc_status) ?? 0,
    qc_status: toNumber(existOrder.qc_status) ?? 0,
    bajajbilling: toNumber(existOrder.bajajbilling) ?? 0,
    schema_request: existOrder.schema_request ?? null,
    bajaj_do_checkout: existOrder.bajaj_do_checkout != null ? String(existOrder.bajaj_do_checkout) : null,
    netamt: emptyToNull(payment?.ModeValue) || emptyToNull(existOrder.netamt) || amount,
    online_pay_refid: emptyToNull(payment?.payment_id) || emptyToNull(existOrder.online_pay_refid),
    online_pay_ref_status: emptyToNull(payment?.status) || emptyToNull(existOrder.online_pay_ref_status),
    order_owner: emptyToNull(existOrder.order_owner) === "unilet" ? "unilet" : "sathya",
    created_at: existOrder.created_at || new Date(),
    updated_at: existOrder.updated_at || new Date(),
  };
}

function buildNewDetailRows(details, savedOrder, liveUserId) {
  return details.map((row) => ({
    exist_id: emptyToNull(row.exist_id),
    order_id: savedOrder._id,
    item_code: emptyToNull(row.item_code),
    product_id: row.product_id != null ? String(row.product_id) : null,
    product_name: emptyToNull(row.product_name),
    product_price: row.product_price != null ? String(row.product_price) : null,
    model: emptyToNull(row.model),
    user_id: liveUserId,
    created_at: row.created_at || savedOrder.created_at || new Date(),
    updated_at: row.updated_at || new Date(),
    quantity: toNumber(row.quantity, 1),
    store_id: emptyToNull(row.store_id),
    orderNumber: emptyToNull(savedOrder.order_number) || emptyToNull(row.orderNumber),
    coupon_discount: toNumber(row.coupon_discount, 0),
    is_gift: toNumber(row.is_gift),
    gift_Price_to_apply: toNumber(row.gift_Price_to_apply),
    is_combo: toNumber(row.is_combo),
    warranty_product_code: emptyToNull(row.warranty_product_code),
    is_warranty: toNumber(row.is_warranty),
    is_view: toNumber(row.is_view),
    type: emptyToNull(row.type) || "online",
    is_exchange_offer: toNumber(row.is_exchange_offer),
    eo_amount: toNumber(row.eo_amount),
    exchange_off_type: emptyToNull(row.exchange_off_type),
    exchange_off_brand: emptyToNull(row.exchange_off_brand),
    exchange_off_cond: emptyToNull(row.exchange_off_cond),
    exchange_off_pin: toNumber(row.exchange_off_pin),
    exchange_off_amount: toNumber(row.exchange_off_amount),
    special_offer_id: toNumber(row.special_offer_id),
    special_discount_id: toNumber(row.special_discount_id),
    special_discount_type: emptyToNull(row.special_discount_type),
    special_offer_discount: toNumber(row.special_offer_discount),
    is_special_offer: toNumber(row.is_special_offer),
    is_checkout_offer: toNumber(row.is_checkout_offer),
    checkout_offer_type: emptyToNull(row.checkout_offer_type),
    checkout_offer_id: toNumber(row.checkout_offer_id),
    checkout_offer_discount: toNumber(row.checkout_offer_discount),
  }));
}

function findPaymentForOrder(existOrder, paymentByKey) {
  for (const key of existIdMatchValues(existOrder.payment_id)) {
    const payment = paymentByKey.get(String(key));
    if (payment) return payment;
  }
  return null;
}

async function loadPaymentsByOrderRefs(existOrders) {
  const keys = [...new Set(
    existOrders.flatMap((order) => matchStringList(order.payment_id)).filter(Boolean)
  )];
  if (!keys.length) return new Map();

  const payments = await PaymentsNew.find({
    exist_id: { $in: keys },
  }).lean();

  const map = new Map();
  for (const payment of payments) {
    existIdMatchValues(payment.exist_id).forEach((key) => map.set(String(key), payment));
  }
  return map;
}

function buildLivePayment(existOrder, savedOrder, user, payment) {
  const amount = toNumber(payment?.ModeValue)
    ?? toNumber(existOrder.netamt)
    ?? toNumber(existOrder.order_amount);

  return {
    orderId: savedOrder._id,
    userId: user._id,
    exist_id: emptyToNull(payment?.exist_id) || emptyToNull(existOrder.payment_id),
    order_number: emptyToNull(savedOrder.order_number),
    amount,
    status: emptyToNull(payment?.status) || emptyToNull(existOrder.online_pay_ref_status) || "pending",
    ModeType: emptyToNull(payment?.ModeType),
    PaymentMode: emptyToNull(payment?.PaymentMode) || emptyToNull(existOrder.payment_method),
    ModeReference: emptyToNull(payment?.ModeReference),
    ReferenceDate: payment?.ReferenceDate || null,
    ModeValue: emptyToNull(payment?.ModeValue) || emptyToNull(existOrder.netamt) || emptyToNull(existOrder.order_amount),
    payment_id: emptyToNull(payment?.payment_id) || emptyToNull(existOrder.online_pay_refid),
    payment_date: emptyToNull(payment?.payment_date),
    pinelab_plural_orderid: emptyToNull(payment?.pinelab_plural_orderid),
    pinelab_payment_id: emptyToNull(payment?.pinelab_payment_id),
    created_at: payment?.created_at || existOrder.created_at || new Date(),
    updated_at: payment?.updated_at || existOrder.updated_at || new Date(),
  };
}

async function insertLivePayment(existOrder, savedOrder, user, payment) {
  const existing = await PaymentNewLive.findOne({ orderId: savedOrder._id }).lean();
  if (existing) {
    return false;
  }

  try {
    await PaymentNewLive.create(buildLivePayment(existOrder, savedOrder, user, payment));
    return true;
  } catch (error) {
    if (error?.code === 11000) {
      return false;
    }
    throw error;
  }
}

// Imported history (exist_id set) for all exist orders in one query.
// order_id holds the exist order id until linked; order_number may hold the
// order number or the exist order id.
async function loadImportedHistory(existOrders) {
  const orderIdKeys = new Set();
  const orderNumberKeys = new Set();
  for (const order of existOrders) {
    matchStringList(order.exist_id).forEach((key) => {
      orderIdKeys.add(key);
      orderNumberKeys.add(key);
    });
    matchStringList(order.order_number).forEach((key) => orderNumberKeys.add(key));
  }

  const or = [];
  if (orderNumberKeys.size) or.push({ order_number: { $in: [...orderNumberKeys] } });
  if (orderIdKeys.size) or.push({ order_id: { $in: [...orderIdKeys] } });
  if (!or.length) return { byOrderNumber: new Map(), byOrderId: new Map() };

  const rows = await OrderHistoryNew.find(
    { exist_id: { $type: "string" }, $or: or },
    { order_id: 1, order_number: 1 }
  ).lean();

  const byOrderNumber = new Map();
  const byOrderId = new Map();
  const push = (map, key, row) => {
    if (!key) return;
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  };
  for (const row of rows) {
    push(byOrderNumber, toText(row.order_number), row);
    push(byOrderId, toText(row.order_id), row);
  }
  return { byOrderNumber, byOrderId };
}

// Point the order's imported history rows at the live order (orders_new._id).
async function linkHistory(existOrder, liveOrder, historyIndex, claimedRowIds) {
  const orderId = String(liveOrder._id);
  const orderNumber = emptyToNull(liveOrder.order_number) || emptyToNull(existOrder.order_number);
  const historyKeys = [
    ...matchStringList(orderNumber),
    ...matchStringList(existOrder.exist_id),
  ];
  if (!historyKeys.length) return 0;

  const candidates = [
    ...historyKeys.flatMap((key) => historyIndex.byOrderNumber.get(key) || []),
    ...matchStringList(existOrder.exist_id).flatMap((key) => historyIndex.byOrderId.get(key) || []),
  ];

  const idsToUpdate = [];
  for (const row of candidates) {
    const rowId = String(row._id);
    if (claimedRowIds.has(rowId)) continue;
    claimedRowIds.add(rowId);
    if (toText(row.order_id) === orderId && toText(row.order_number) === toText(orderNumber)) continue;
    idsToUpdate.push(row._id);
  }
  if (!idsToUpdate.length) return 0;

  await OrderHistoryNew.updateMany(
    { _id: { $in: idsToUpdate } },
    { $set: { order_id: orderId, order_number: orderNumber } }
  );
  return idsToUpdate.length;
}

// Imported cancel_orders rows for all exist orders in one query, indexed like history.
// Rows already copied into cancel_orders_live (same exist_id) are left out.
async function loadImportedCancels(existOrders) {
  const orderIdKeys = new Set();
  const orderNumberKeys = new Set();
  for (const order of existOrders) {
    matchStringList(order.exist_id).forEach((key) => {
      orderIdKeys.add(key);
      orderNumberKeys.add(key);
    });
    matchStringList(order.order_number).forEach((key) => orderNumberKeys.add(key));
  }

  const empty = { byOrderNumber: new Map(), byOrderId: new Map() };
  const or = [];
  if (orderNumberKeys.size) or.push({ order_number: { $in: [...orderNumberKeys] } });
  if (orderIdKeys.size) or.push({ order_id: { $in: [...orderIdKeys] } });
  if (!or.length) return empty;

  const rows = await CancelOrders.find({ exist_id: { $type: "string" }, $or: or }).lean();
  if (!rows.length) return empty;

  const copied = await CancelOrdersLive.find(
    { exist_id: { $in: rows.map((row) => row.exist_id) } },
    { exist_id: 1 }
  ).lean();
  const copiedIds = new Set(copied.map((row) => toText(row.exist_id)));

  const byOrderNumber = new Map();
  const byOrderId = new Map();
  const push = (map, key, row) => {
    if (!key) return;
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  };
  for (const row of rows) {
    if (copiedIds.has(toText(row.exist_id))) continue;
    push(byOrderNumber, toText(row.order_number), row);
    push(byOrderId, toText(row.order_id), row);
  }
  return { byOrderNumber, byOrderId };
}

// Live copies of the order's imported cancel rows, linked to orders_new._id.
// customer_id becomes the live user only when it held this customer's exist id
// (exist admin cancels keep the admin id, as admin cancels do in the app).
function buildLiveCancelRows(existOrder, liveOrder, user, cancelIndex, claimedRowIds) {
  const orderId = String(liveOrder._id);
  const orderNumber = emptyToNull(liveOrder.order_number) || emptyToNull(existOrder.order_number);
  const matchKeys = [
    ...matchStringList(orderNumber),
    ...matchStringList(existOrder.exist_id),
  ];
  if (!matchKeys.length) return [];

  const candidates = [
    ...matchKeys.flatMap((key) => cancelIndex.byOrderNumber.get(key) || []),
    ...matchStringList(existOrder.exist_id).flatMap((key) => cancelIndex.byOrderId.get(key) || []),
  ];
  const userExistIds = new Set(matchStringList(user.exist_id));

  const docs = [];
  for (const row of candidates) {
    const rowId = String(row._id);
    if (claimedRowIds.has(rowId)) continue;
    claimedRowIds.add(rowId);

    const customerId = toText(row.customer_id);
    const createdAt = row.created_at || new Date();
    docs.push({
      exist_id: toText(row.exist_id),
      order_number: toText(orderNumber),
      order_id: orderId,
      customer_id: userExistIds.has(customerId) || !customerId ? String(user._id) : customerId,
      order_status: toText(row.order_status),
      reason: toText(row.reason),
      comments: row.comments != null && toText(row.comments) !== "" ? String(row.comments) : null,
      created_at: createdAt,
      updated_at: row.updated_at || createdAt,
    });
  }
  return docs;
}

async function insertLiveCancels(docs) {
  if (!docs.length) return 0;
  try {
    const result = await CancelOrdersLive.collection.insertMany(docs, { ordered: false });
    return result.insertedCount || 0;
  } catch (error) {
    const writeErrors = error?.writeErrors || error?.result?.result?.writeErrors || [];
    const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
    if (!onlyDuplicates && error?.code !== 11000) throw error;
    return error?.result?.insertedCount ?? error?.insertedCount ?? Math.max(docs.length - writeErrors.length, 0);
  }
}

export async function fetchExistOrdersForLiveUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  const existId = await resolveExistId(user);
  if (!existId) {
    return {
      success: true,
      found: 0,
      inserted: 0,
      skipped: 0,
      fetched: false,
      message: "No past Sathya account was found for this login, so there are no old orders to fetch.",
    };
  }

  const existOrders = await ExistSathyaOrder.find({
    user_id: { $in: existIdMatchValues(existId) },
  }).lean();

  if (!existOrders.length) {
    return {
      error: "No exist orders found for this user",
      status: 404,
      found: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const orderNumbers = [...new Set(existOrders.map((order) => toText(order.order_number)).filter(Boolean))];
  const orderNumberValues = [...new Set(orderNumbers.flatMap((value) => existIdMatchValues(value)))];

  const details = orderNumberValues.length
    ? await ExistSathyaOrderDetail.find({ orderNumber: { $in: orderNumberValues } }).lean()
    : [];

  const detailsByOrder = new Map();
  for (const row of details) {
    const key = toText(row.orderNumber);
    if (!key) continue;
    const list = detailsByOrder.get(key) || [];
    list.push(row);
    existIdMatchValues(key).forEach((variant) => detailsByOrder.set(String(variant), list));
  }

  const existingLive = orderNumbers.length
    ? await OrderNew.find(
      { order_number: { $in: orderNumberValues.map(String) } },
      { order_number: 1, _id: 1, exist_id: 1, payment_id: 1 }
    ).lean()
    : [];
  const existingByNumber = new Map();
  for (const order of existingLive) {
    existIdMatchValues(order.order_number).forEach((key) => existingByNumber.set(String(key), order));
  }

  const paymentByKey = await loadPaymentsByOrderRefs(existOrders);
  const historyIndex = await loadImportedHistory(existOrders);
  const claimedHistoryIds = new Set();
  const cancelIndex = await loadImportedCancels(existOrders);
  const claimedCancelIds = new Set();
  const liveCancelDocs = [];

  let inserted = 0;
  let skipped = 0;
  let paymentsLinked = 0;
  let historyLinked = 0;

  for (const existOrder of existOrders) {
    const orderNumber = emptyToNull(existOrder.order_number);
    if (!orderNumber) {
      skipped += 1;
      continue;
    }

    const already = existingByNumber.get(orderNumber)
      || [...existIdMatchValues(orderNumber)].map((value) => existingByNumber.get(String(value))).find(Boolean);
    const lineItems = detailsByOrder.get(orderNumber)
      || detailsByOrder.get(String(Math.trunc(Number(orderNumber)) || orderNumber))
      || [];
    const payment = findPaymentForOrder(existOrder, paymentByKey);

    if (already) {
      skipped += 1;
      if (await insertLivePayment(existOrder, already, user, payment)) {
        paymentsLinked += 1;
      }
      historyLinked += await linkHistory(existOrder, already, historyIndex, claimedHistoryIds);
      liveCancelDocs.push(...buildLiveCancelRows(existOrder, already, user, cancelIndex, claimedCancelIds));
      continue;
    }

    try {
      const saved = await OrderNew.create(buildNewOrderHeader(existOrder, lineItems, user, payment));
      if (lineItems.length) {
        await OrderDetailsNew.insertMany(buildNewDetailRows(lineItems, saved, user._id));
      }
      if (await insertLivePayment(existOrder, saved, user, payment)) {
        paymentsLinked += 1;
      }
      historyLinked += await linkHistory(existOrder, saved, historyIndex, claimedHistoryIds);
      liveCancelDocs.push(...buildLiveCancelRows(existOrder, saved, user, cancelIndex, claimedCancelIds));
      inserted += 1;
      existIdMatchValues(orderNumber).forEach((key) => existingByNumber.set(String(key), saved));
    } catch (error) {
      skipped += 1;
      console.error("Exist order insert failed:", error.message);
    }
  }

  let cancelLinked = 0;
  try {
    cancelLinked = await insertLiveCancels(liveCancelDocs);
  } catch (error) {
    console.error("Exist cancel requests copy failed:", error.message);
  }

  if (inserted > 0 || skipped > 0) {
    await User.updateOne({ _id: user._id }, { $set: { orders_fetched: 1 } });
  }

  return {
    success: true,
    found: existOrders.length,
    inserted,
    skipped,
    paymentsLinked,
    historyLinked,
    cancelLinked,
    fetched: inserted > 0 || skipped > 0,
    message: inserted > 0
      ? `Orders fetched: ${inserted} inserted, ${skipped} already existed. Live payments inserted: ${paymentsLinked}, history rows linked: ${historyLinked}, cancel requests linked: ${cancelLinked}`
      : `No new orders inserted. ${skipped} already existed. Live payments inserted: ${paymentsLinked}, history rows linked: ${historyLinked}, cancel requests linked: ${cancelLinked}`,
  };
}
