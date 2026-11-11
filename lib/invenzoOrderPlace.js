import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import StoreListing from "@/models/store_listings";
import Product from "@/models/product";
import UserAddress from "@/models/ecom_user_address_info";
import User from "@/models/User";
import ShipmentsInvenzo from "@/models/shipments_invenzo";
import {
  invenzoAuthTokenGenerate,
  invenzoClientId,
  invenzoPlaceOrder,
  invenzoStoreCreate,
  isInvenzoServiceEnabled,
} from "@/lib/invenzo";
import { saveInvensoResponseResult } from "@/lib/invensoResponseLog";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDt(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Prefer a clean 6-digit Indian pincode (Izoleap store_create requires this). */
function normalizePincode(value) {
  if (value == null || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 6) return "";
  // Prefer first 6-digit group; avoid leading zeros lost on Number zipcode
  const asStr = String(value);
  const grouped = asStr.match(/\b(\d{6})\b/);
  if (grouped) return grouped[1];
  return digits.slice(0, 6);
}

function extractPincodeFromText(text) {
  const m = String(text || "").match(/\b(\d{6})\b/);
  return m ? m[1] : "";
}

/**
 * Izoleap job create paymentMode:
 * - Cash on Delivery / COD / pay at store → "cod"
 * - Online (Razorpay, PayU, card, UPI, etc.) → "Online"
 */
function mapInvenzoPaymentMode(paymentMethod, paymentMode) {
  const raw = String(paymentMethod || paymentMode || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

  if (
    !raw ||
    raw === "cod" ||
    raw === "cash on delivery" ||
    raw === "cashondelivery" ||
    raw === "pay at store" ||
    raw === "payatstore"
  ) {
    return "cod";
  }

  // Online gateways / prepaid
  if (
    raw === "online" ||
    raw.includes("razorpay") ||
    raw.includes("payu") ||
    raw.includes("card") ||
    raw.includes("upi") ||
    raw.includes("net banking") ||
    raw.includes("netbanking") ||
    raw.includes("wallet") ||
    raw.includes("emi") ||
    raw.includes("prepaid")
  ) {
    return "Online";
  }

  // Default unknown prepaid-style methods to Online; pure empty already handled as cod
  return "Online";
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const s = v != null ? String(v).trim() : "";
    if (s) return s;
  }
  return "";
}

/**
 * Checkout often saves:
 * "address, city, state, country, postCode"
 */
function parseDeliveryAddressString(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    };
  }
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const pincode = extractPincodeFromText(text);
  let country = "";
  let state = "";
  let city = "";
  let addressParts = parts;

  if (parts.length >= 5) {
    const last = parts[parts.length - 1];
    const maybeCountry = parts[parts.length - 2];
    const maybeState = parts[parts.length - 3];
    const maybeCity = parts[parts.length - 4];
    if (normalizePincode(last) || extractPincodeFromText(last)) {
      country = maybeCountry || "";
      state = maybeState || "";
      city = maybeCity || "";
      addressParts = parts.slice(0, parts.length - 4);
    }
  } else if (parts.length === 4) {
    city = parts[1] || "";
    state = parts[2] || "";
    country = parts[3] || "";
    addressParts = [parts[0]];
  } else if (parts.length === 3) {
    city = parts[1] || "";
    state = parts[2] || "";
    addressParts = [parts[0]];
  }

  return {
    addressLine1: addressParts.join(", ").trim() || text,
    addressLine2: "",
    city,
    state,
    country,
    pincode,
  };
}

function buildShippingAddress({
  useradd,
  order,
  store,
  optsPincode,
  selectedStoreZip,
  deliveryPincode,
}) {
  const parsed = parseDeliveryAddressString(order?.order_deliveryaddress);
  const parsedBilling = parseDeliveryAddressString(order?.order_billingaddress);

  const addressLine1 = firstNonEmpty(
    useradd?.address,
    parsed.addressLine1,
    parsedBilling.addressLine1,
    order?.order_deliveryaddress,
    store?.address
  );

  const addressLine2 = firstNonEmpty(
    useradd?.locality,
    useradd?.landmark,
    useradd?.additionalInfo,
    parsed.addressLine2
  );

  const city = firstNonEmpty(
    useradd?.city,
    parsed.city,
    parsedBilling.city,
    store?.city
  );

  const state = firstNonEmpty(
    useradd?.state,
    parsed.state,
    parsedBilling.state,
    store?.state,
    "Tamil Nadu"
  );

  const country = firstNonEmpty(
    useradd?.country,
    parsed.country,
    parsedBilling.country,
    "India"
  );

  // Shipping pin: customer delivery address first, then header/opts, then store zip
  const pincode =
    normalizePincode(useradd?.postCode) ||
    normalizePincode(useradd?.pincode) ||
    normalizePincode(useradd?.postal_code) ||
    deliveryPincode ||
    normalizePincode(optsPincode) ||
    parsed.pincode ||
    parsedBilling.pincode ||
    selectedStoreZip ||
    "";

  const storeLat =
    store?.latitude != null && String(store.latitude).trim() !== ""
      ? Number(store.latitude)
      : NaN;
  const storeLng =
    store?.longitude != null && String(store.longitude).trim() !== ""
      ? Number(store.longitude)
      : NaN;
  const userLat =
    useradd?.latitude != null && String(useradd.latitude).trim() !== ""
      ? Number(useradd.latitude)
      : NaN;
  const userLng =
    useradd?.longitude != null && String(useradd.longitude).trim() !== ""
      ? Number(useradd.longitude)
      : NaN;

  return {
    addressLine1: addressLine1 || "Address not provided",
    addressLine2: addressLine2 || "",
    city: city || "",
    state: state || "Tamil Nadu",
    country: country || "India",
    latitude: Number.isFinite(userLat)
      ? userLat
      : Number.isFinite(storeLat)
        ? storeLat
        : 13.0827,
    longitude: Number.isFinite(userLng)
      ? userLng
      : Number.isFinite(storeLng)
        ? storeLng
        : 80.2707,
    pincode: pincode || "",
  };
}

/**
 * Exist InvensoServices::OrderPlacedToStoreInvenzo
 * Gate: invenso_service_on=on
 *
 * @param {{ orderId?: string, orderNumber?: string, storeCode?: string, pincode?: string }} opts
 */
export async function orderPlacedToStoreInvenzo(opts = {}) {
  if (!isInvenzoServiceEnabled()) {
    return {
      skipped: true,
      reason: "invenso_service_on is off",
    };
  }

  await dbConnect();

  const orderId = opts.orderId != null ? String(opts.orderId).trim() : "";
  const orderNumberOpt = opts.orderNumber != null ? String(opts.orderNumber).trim() : "";

  let order = null;
  if (orderId) {
    order = await OrderNew.findById(orderId).lean();
  }
  if (!order && orderNumberOpt) {
    order = await OrderNew.findOne({ order_number: orderNumberOpt }).lean();
  }
  if (!order) {
    return { skipped: false, ok: false, error: "Order not found" };
  }

  const orderNumber = String(order.order_number || "").trim();
  const storeCode = String(
    opts.storeCode || order.pickup_type || order.pickup_store || ""
  ).trim();

  if (!storeCode) {
    return { skipped: false, ok: false, error: "storeCode / pickup_type missing" };
  }

  // 1) Ensure shipments_invenzo row (Exist)
  let shipment = await ShipmentsInvenzo.findOne({ order_number: orderNumber }).lean();
  if (!shipment) {
    shipment = await ShipmentsInvenzo.create({
      user_id: order.user_id != null ? String(order.user_id) : null,
      order_id: orderNumber,
      order_number: orderNumber,
      shipment_no: `SHIP_NO_${Date.now()}`,
      status: "pending",
      tracking_number: null,
    });
    shipment = shipment.toObject ? shipment.toObject() : shipment;
  }

  // 2) Load details / address / user / store
  const details = await OrderDetailsNew.find({
    $or: [{ order_id: String(order._id) }, { orderNumber: orderNumber }],
  }).lean();

  // Delivery address (preferred), then billing, then latest user address
  let useradd = null;
  const deliveryId = order.user_adddeliveryid;
  const billingId = order.user_addbillingid;
  if (deliveryId && /^[a-f\d]{24}$/i.test(String(deliveryId))) {
    useradd = await UserAddress.findById(deliveryId).lean();
  }
  if (!useradd && billingId && /^[a-f\d]{24}$/i.test(String(billingId))) {
    useradd = await UserAddress.findById(billingId).lean();
  }
  if (!useradd && order.user_id) {
    useradd = await UserAddress.findOne({ userId: String(order.user_id) })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
  }

  let userDoc = null;
  if (order.user_id && /^[a-f\d]{24}$/i.test(String(order.user_id))) {
    userDoc = await User.findById(order.user_id).select("name last_name email mobile").lean();
  }

  // Selected store: match branch_code (pickup_type) or Mongo _id from checkout
  let store = null;
  if (storeCode) {
    const storeFilterBase = { approved: 1, verified: 1 };
    if (/^[a-f\d]{24}$/i.test(storeCode)) {
      store = await StoreListing.findOne({
        ...storeFilterBase,
        _id: storeCode,
      }).lean();
    }
    if (!store) {
      store = await StoreListing.findOne({
        ...storeFilterBase,
        branch_code: {
          $regex: new RegExp(
            `^${storeCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
        },
      }).lean();
    }
  }

  const itemCodes = details
    .map((d) => String(d.item_code || "").replace(/^ITEM/, "").trim())
    .filter(Boolean);
  const products = itemCodes.length
    ? await Product.find({ item_code: { $in: itemCodes } })
        .select("item_code title name price brand brand_code")
        .lean()
    : [];
  const productByCode = new Map(
    products.map((p) => [String(p.item_code || "").trim().toLowerCase(), p])
  );

  const userName =
    [userDoc?.name, userDoc?.last_name].filter(Boolean).join(" ").trim() ||
    order.order_username ||
    "";

  const items = (details.length ? details : []).map((d) => {
    const code = String(d.item_code || "").replace(/^ITEM/, "").trim();
    const product = productByCode.get(code.toLowerCase()) || {};
    const salePrice = toNum(d.product_price ?? d.price ?? product.price);
    const qty = toNum(d.quantity) || 1;
    return {
      brandName: product.brand || product.brand_code || "",
      salePrice,
      subtotal: salePrice * qty,
      weightBased: 0,
      itemCode: code || product.item_code || "",
      qty,
      name: d.product_name || product.title || product.name || "",
      gst: 0,
      discount: 0,
      isPromoProduct: 0,
      mrp: toNum(product.price) || salePrice,
    };
  });

  // Selected store zipcode → store_create body.pincode (primary)
  const selectedStoreZip =
    normalizePincode(store?.zipcode) ||
    normalizePincode(store?.pincode) ||
    normalizePincode(store?.postal_code) ||
    extractPincodeFromText(store?.address) ||
    "";

  // Delivery / header pin only as fallback when selected store has no zipcode
  const deliveryPincode =
    normalizePincode(opts.pincode) ||
    normalizePincode(useradd?.postCode || useradd?.pincode || useradd?.postal_code) ||
    extractPincodeFromText(order.order_deliveryaddress) ||
    extractPincodeFromText(order.order_billingaddress) ||
    "";

  const resolvedPincode = selectedStoreZip || deliveryPincode || "";

  const shippingAddress = buildShippingAddress({
    useradd,
    order,
    store,
    optsPincode: opts.pincode,
    selectedStoreZip,
    deliveryPincode,
  });

  const now = new Date();
  const orderData = {
    clientId: invenzoClientId(),
    loadDateTime: formatDt(now),
    placedOrderTimestamp: formatDt(order.created_at ? new Date(order.created_at) : now),
    deliveryDate: formatDt(addDays(now, 7)),
    storeCode: String(store?.branch_code || storeCode || "").trim(),
    orderId: orderNumber,
    userName,
    userPhone:
      firstNonEmpty(
        order.order_phonenumber,
        useradd?.phonenumber,
        userDoc?.mobile
      ) || "",
    userEmail:
      firstNonEmpty(order.email_address, useradd?.email, userDoc?.email) || "",
    jobType: "Delivery",
    paymentMode: mapInvenzoPaymentMode(order.payment_method, order.payment_mode),
    deliveryType: "Hyperlocal",
    readForPickUp: true,
    deliverySlotTimes: "",
    deliveryPromise: "SURFACE",
    payableAmount: 0.0,
    totalGstAmount: 0.0,
    grandTotal: items.reduce((s, i) => s + toNum(i.salePrice) * toNum(i.qty), 0),
    subtotal: toNum(order.order_amount),
    totalDiscount: 0.0,
    isExchange: 0,
    paidAmount: 0.0,
    weightInGrams: 0.0,
    lengthInCm: 0.0,
    heightInCm: 0.0,
    valumaticWeight: 0.0,
    distanceInKm: 0.0,
    widthInCm: 0.0,
    alternateContact: firstNonEmpty(useradd?.altnumber, "") || "",
    additionalInfo: firstNonEmpty(useradd?.additionalInfo, order.customer_comments, "") || "",
    promoCode: "",
    eligibleToUploadTaxInvoice: 0,
    shippingAddress,
    items,
    exchangeItems: [],
  };

  const logMeta = {
    user_id: order.user_id != null ? String(order.user_id) : null,
    order_number: orderNumber,
  };

  // 3) Auth
  const tokenResult = await invenzoAuthTokenGenerate();
  await saveInvensoResponseResult({
    ...logMeta,
    call_type: "auth",
    response: tokenResult.raw ?? {
      ok: tokenResult.ok,
      error: tokenResult.error,
      httpStatus: tokenResult.httpStatus ?? null,
    },
  });
  if (!tokenResult.ok || !tokenResult.token) {
    return {
      skipped: false,
      ok: false,
      error: tokenResult.error || "Failed to invenzo token Create",
      shipment_no: shipment.shipment_no,
      auth: tokenResult,
    };
  }

  // 4) Store create (Exist: success OR "Store Code already exists")
  // body.pincode = selected store zipcode (required by Izoleap)
  const storePincode = String(selectedStoreZip || resolvedPincode || "").trim();
  if (!/^\d{6}$/.test(storePincode)) {
    const failBody = {
      status: "error",
      http_code: "400",
      message: "Pincode is Required. is required field.",
      detail:
        "Selected store zipcode missing — set store_listings.zipcode for this branch",
      storeCode: store?.branch_code || storeCode || null,
    };
    await saveInvensoResponseResult({
      ...logMeta,
      call_type: "store_create",
      response: failBody,
    });
    return {
      skipped: false,
      ok: false,
      error: "Pincode is required for Invenzo store create",
      shipment_no: shipment.shipment_no,
      store: { ok: false, raw: failBody },
    };
  }

  const nowTime = formatDt(now).split(" ")[1] || "09:30:00";
  const latNum =
    store?.latitude != null && String(store.latitude).trim() !== ""
      ? Number(store.latitude)
      : NaN;
  const lngNum =
    store?.longitude != null && String(store.longitude).trim() !== ""
      ? Number(store.longitude)
      : NaN;

  const storePayload = {
    clientId: invenzoClientId(),
    storeCode: String(store?.branch_code || storeCode || "").trim(),
    storeName: String(store?.slug || store?.title || storeCode || "").trim(),
    contactNumber: String(store?.phone_afterhours || store?.phone || "").trim(),
    email: String(store?.email || "").trim(),
    hyperLocalServingRadiusInKm: 10,
    address: String(store?.address || "").trim(),
    storeLocation: "",
    pincode: storePincode,
    city: "",
    state: "",
    country: "India",
    latitude: Number.isFinite(latNum) ? latNum : 13.0827,
    longitude: Number.isFinite(lngNum) ? lngNum : 80.2707,
    serviceStartTime: nowTime,
    serviceEndTime: null,
  };

  const storeResult = await invenzoStoreCreate(storePayload, tokenResult.token);
  await saveInvensoResponseResult({
    ...logMeta,
    call_type: "store_create",
    response: storeResult.raw ?? {
      ok: storeResult.ok,
      status: storeResult.status,
      message: storeResult.message,
      httpStatus: storeResult.httpStatus ?? null,
    },
  });
  if (!storeResult.ok) {
    return {
      skipped: false,
      ok: false,
      error: "Failed Invenzo Store Create",
      store: storeResult,
      shipment_no: shipment.shipment_no,
    };
  }

  // 5) Job create
  const jobResult = await invenzoPlaceOrder(orderData, tokenResult.token);
  await saveInvensoResponseResult({
    ...logMeta,
    call_type: "job_create",
    response: jobResult.raw ?? {
      ok: jobResult.ok,
      message: jobResult.message,
      httpStatus: jobResult.httpStatus ?? null,
    },
  });
  return {
    skipped: false,
    ok: jobResult.ok,
    error: jobResult.ok ? null : jobResult.message || "Invenzo job create failed",
    shipment_no: shipment.shipment_no,
    store: storeResult,
    job: jobResult,
    order_number: orderNumber,
    storeCode,
  };
}
