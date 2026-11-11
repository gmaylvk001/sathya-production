import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import PaymentNewLive from "@/models/payment_new_live";
import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";
import PostapijsonWodersoftResult from "@/models/postapijson_wodersoft_result";
import { wondersoftAuthtoken, wondersoftCreateSalesOrder } from "@/lib/wondersoft";

const STATE_ALTERNATES = {
  tamilnadu: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",
  tamilnadd: "Tamil Nadu",
  tn: "Tamil Nadu",
  33: "Tamil Nadu",
  karnataka: "Karnataka",
  ka: "Karnataka",
  29: "Karnataka",
  kerala: "Kerala",
  kl: "Kerala",
  32: "Kerala",
  andhra: "Andhra Pradesh",
  "andhra pradesh": "Andhra Pradesh",
  ap: "Andhra Pradesh",
  37: "Andhra Pradesh",
  telangana: "Telangana",
  ts: "Telangana",
  tg: "Telangana",
  36: "Telangana",
  pondicherry: "Puducherry",
  puducherry: "Puducherry",
  py: "Puducherry",
  34: "Puducherry",
};

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isBlank(value) {
  return toText(value) === "";
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isObjectId(value) {
  const text = toText(value);
  return (
    mongoose.Types.ObjectId.isValid(text) &&
    String(new mongoose.Types.ObjectId(text)) === text
  );
}

export function getAlternateStateCode(state) {
  if (isBlank(state)) return "";
  const key = toText(state).toLowerCase();
  return STATE_ALTERNATES[key] || toText(state);
}

function formatOrderDate(date) {
  const d = date ? new Date(date) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${pick("year")}${pick("month")}${pick("day")}`;
}

function splitAddressLines(address) {
  const text = String(address || "");
  const strlen = text.length;
  const first = Math.trunc(strlen * (35 / 100));
  const second = Math.trunc(strlen * (35 / 100));
  return {
    line1: text.substring(0, first),
    line2: text.substring(first, first + second),
    line3: text.substring(first + second),
  };
}

function commaPart(value) {
  return isBlank(value) ? "" : `,${value}`;
}

function mapPaymentMode(mode) {
  const key = toText(mode).toLowerCase();
  if (key === "cod" || key === "cash on delivery" || key === "cash") {
    return "CASH ON DELIVERY";
  }
  if (key === "online") return "OnlinePayment";
  if (key === "paytm") return "OnlinePayment";
  if (key === "emi" || key === "bajajemioffline" || key === "bajaj finance") {
    return "BAJAJ FINANCE";
  }
  return "OnlinePayment";
}

function stripItemPrefix(itemCode) {
  const code = toText(itemCode);
  return code.replace(/^ITEM/i, "");
}

function parseFallbackAddress(fullAddress, extras = {}) {
  const parts = String(fullAddress || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const pincode = extras.pincode || (parts.length ? parts[parts.length - 1] : "");
  const maybeCountry = parts.length > 1 ? parts[parts.length - 2] : "";
  const state =
    extras.state ||
    (maybeCountry.toLowerCase() === "india" && parts.length > 2
      ? parts[parts.length - 3]
      : parts.length > 1
        ? parts[parts.length - 2]
        : "");
  const city =
    extras.city ||
    (maybeCountry.toLowerCase() === "india" && parts.length > 3
      ? parts[parts.length - 4]
      : parts.length > 2
        ? parts[parts.length - 3]
        : "");

  return {
    username: extras.username || "",
    phonenumber: extras.phonenumber || "",
    address: fullAddress || "",
    address1: "",
    address2: "",
    city,
    state,
    pincode,
    gst_number: extras.gst_number || "",
  };
}

function deliveryLines(addressDoc) {
  if (!addressDoc) {
    return { bline1: "", bline2: "", bline3: "" };
  }
  if (isBlank(addressDoc.address1) && isBlank(addressDoc.address2)) {
    const split = splitAddressLines(addressDoc.address);
    return { bline1: split.line1, bline2: split.line2, bline3: split.line3 };
  }
  return {
    bline1: addressDoc.address || "",
    bline2: addressDoc.address1 || "",
    bline3: addressDoc.address2 || "",
  };
}

function billingCustomerBlock(addressDoc) {
  if (addressDoc && !isBlank(addressDoc.gst_number)) {
    const caaddr1 = `${addressDoc.gst_bno || ""}${commaPart(addressDoc.gst_st)}${commaPart(addressDoc.gst_bnm)}`;
    const caaddr2 = `${addressDoc.gst_loc || ""}${commaPart(addressDoc.gst_flno)}${commaPart(addressDoc.gst_dst)}`;
    return {
      caaddr1,
      caaddr2,
      caaddr3: "",
      customercity: addressDoc.gst_city || "",
      customerstate: addressDoc.gst_stcd || "",
      customerpin: addressDoc.gst_pncd || "",
      customerstate_gst: addressDoc.gst_stcd || "",
      gst_number: addressDoc.gst_number,
      dealer_type: 1,
    };
  }

  const getBaddress = addressDoc?.address || "";
  let caaddr1 = "";
  let caaddr2 = "";
  let caaddr3 = "";

  if (addressDoc && isBlank(addressDoc.address1) && isBlank(addressDoc.address2)) {
    const split = splitAddressLines(getBaddress);
    caaddr1 = split.line1;
    caaddr2 = split.line2;
    caaddr3 = split.line3;
  } else if (addressDoc) {
    caaddr1 = addressDoc.address || "";
    caaddr2 = addressDoc.address1 || "";
    caaddr3 = addressDoc.address2 || "";
  }

  return {
    caaddr1,
    caaddr2,
    caaddr3,
    customercity: addressDoc?.city || "",
    customerstate: addressDoc?.state || "",
    customerpin: addressDoc?.pincode || "",
    customerstate_gst: "",
    gst_number: "",
    dealer_type: "",
  };
}

async function findExistAddress(id) {
  const text = toText(id);
  if (!text) return null;

  if (isObjectId(text)) {
    const byId = await ExistSathyaUserDetail.findById(text).lean();
    if (byId) return byId;
  }

  return ExistSathyaUserDetail.findOne({
    $or: [{ exist_id: text }, { user_id: text }],
  }).lean();
}

async function findPayment(order) {
  const pid = toText(order.payment_id);

  if (isObjectId(pid)) {
    const byId = await PaymentNewLive.findById(pid).lean();
    if (byId) return byId;
  }

  const byOrderId = await PaymentNewLive.findOne({ orderId: order._id }).lean();
  if (byOrderId) return byOrderId;

  if (order.order_number) {
    const byNumber = await PaymentNewLive.findOne({
      order_number: order.order_number,
    }).lean();
    if (byNumber) return byNumber;
  }

  if (pid) {
    const byPaymentId = await PaymentNewLive.findOne({ payment_id: pid }).lean();
    if (byPaymentId) return byPaymentId;
  }

  return null;
}

async function findOrderDetails(order) {
  if (order.order_number) {
    const byNumber = await OrderDetailsNew.find({
      orderNumber: order.order_number,
    }).lean();
    if (byNumber.length) return byNumber;
  }
  return OrderDetailsNew.find({ order_id: order._id }).lean();
}

function buildItemLines(cart) {
  const item = [];
  let count = 1;
  let product_total = 0;
  let coupon_amnt_total = 0;
  let eo_amnt_total = 0;

  for (const cd of cart) {
    if (toNumber(cd.is_warranty, 0) !== 0) continue;

    const qty = Math.max(1, toNumber(cd.quantity, 1));
    const final_rate = toNumber(cd.product_price, 0);
    let cart_disc = toNumber(cd.coupon_discount, 0);

    if (cart_disc !== 0 && qty > 1) {
      cart_disc = cart_disc / qty;
    }

    for (let ln = 1; ln <= qty; ln++) {
      item.push({
        LineNumber: count,
        ItemCode: stripItemPrefix(cd.item_code),
        Quantity: 1,
        Rate: final_rate,
        DiscountAmount: cart_disc || 0,
        LineRemarks: "",
        StockLocation: "",
      });
      count += 1;
    }

    product_total += final_rate * qty;
    coupon_amnt_total += toNumber(cd.coupon_discount, 0);
    eo_amnt_total += toNumber(cd.eo_amount, 0) * qty;
  }

  const rate = item.map((row) => row.Rate);
  const indexed = item.map((row, index) => ({ row, rate: rate[index] }));
  indexed.sort((a, b) => b.rate - a.rate);
  const sortedItems = indexed.map((entry) => entry.row);

  return {
    item: sortedItems,
    product_total,
    coupon_amnt_total,
    eo_amnt_total,
  };
}

export async function buildSendOrderData(orderId, remarks = null) {
  await dbConnect();

  if (!isObjectId(orderId)) {
    const error = new Error("Invalid order id");
    error.status = 400;
    throw error;
  }

  const order = await OrderNew.findById(orderId).lean();
  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  const [payment, cart, billingDoc, deliveryDoc] = await Promise.all([
    findPayment(order),
    findOrderDetails(order),
    findExistAddress(order.user_addbillingid),
    findExistAddress(order.user_adddeliveryid),
  ]);

  const billing =
    billingDoc ||
    parseFallbackAddress(order.order_billingaddress || order.order_deliveryaddress, {
      username: order.order_username,
      phonenumber: order.order_phonenumber,
      gst_number: order.gst_number,
    });

  const delivery =
    deliveryDoc ||
    parseFallbackAddress(order.order_deliveryaddress, {
      username: order.order_username,
      phonenumber: order.order_phonenumber,
    });

  const paymentModeRaw =
    payment?.PaymentMode || order.payment_mode || order.payment_method || "";
  const re_payment_mode = mapPaymentMode(paymentModeRaw);

  let pref_id = "";
  if (toText(paymentModeRaw).toLowerCase() === "bajajemioffline") {
    pref_id = toText(order.bajaj_do_checkout);
  } else if (payment && !isBlank(payment.payment_id)) {
    pref_id = payment.payment_id;
  }

  const { bline1, bline2, bline3 } = deliveryLines(delivery);
  const billingBlock = billingCustomerBlock(billing);
  const { item, product_total, coupon_amnt_total, eo_amnt_total } = buildItemLines(cart);

  const customer = {
    TitleName: "",
    FirstName: billing.username || order.order_username || "",
    MiddleName: "",
    LastName: "",
    Gender: "",
    MobileNumber: billing.phonenumber || order.order_phonenumber || "",
    EmailID: order.email_address || "",
    UIN: "",
    GSTIN: billingBlock.gst_number,
    DealerType: billingBlock.dealer_type,
    CustomerAddressLine1: billingBlock.caaddr1,
    CustomerAddressLine2: billingBlock.caaddr2,
    CustomerAddressLine3: billingBlock.caaddr3,
    CustomerCityName: billingBlock.customercity,
    CustomerStateName: getAlternateStateCode(billingBlock.customerstate),
    CustomerStateGSTCode: billingBlock.customerstate_gst,
    Pincode: billingBlock.customerpin,
    DOBDay: "",
    DOBMonth: "",
    DOBYear: "",
  };

  const headerdata = {
    OrderDate: formatOrderDate(order.created_at),
    OrderNumber: order.order_number,
    OrderLocation: order.pickup_type || "",
    CustomerCode: "CustomerCode",
    DeliveryAddressLine1: bline1,
    DeliveryAddressLine2: bline2,
    DeliveryAddressLine3: bline3,
    DeliveryCityName: delivery.city || "",
    DeliveryStateName: delivery.state || "",
    DeliveryPincode: delivery.pincode || "",
    TotalOrderValue: product_total,
    OrderRemarks: re_payment_mode,
    SourceChannel: "E-Com",
  };

  const charge = {
    Charge: {
      ChargeDescription: "Delivery",
      ChargeValue: "0.00",
      ChargeReference: "",
    },
  };

  const paymentLines = [];
  if (eo_amnt_total === 0) {
    const value = product_total - coupon_amnt_total;
    paymentLines.push({
      PaymentMode: re_payment_mode,
      PaymentValue: value,
      ModeType: value,
      PaymentReference: pref_id,
    });
  } else {
    const value = product_total - coupon_amnt_total - eo_amnt_total;
    paymentLines.push({
      PaymentMode: re_payment_mode,
      PaymentValue: value,
      ModeType: value,
      PaymentReference: pref_id,
    });
    paymentLines.push({
      PaymentMode: "Exchange",
      PaymentValue: eo_amnt_total,
      ModeType: eo_amnt_total,
      PaymentReference: pref_id,
    });
  }

  const payload = {
    Order: {
      Customer: customer,
      Header: headerdata,
      Items: { Item: item },
      OtherCharges: charge,
      Payments: { Payment: paymentLines },
      remarks,
    },
  };

  return {
    payload,
    order,
    payment,
    cart,
    billing,
    delivery,
    usedAddressFallback: {
      billing: !billingDoc,
      delivery: !deliveryDoc,
    },
  };
}

function isKarnatakaOrder(order) {
  const region = String(order?.region || "").toLowerCase();
  const owner = String(order?.order_owner || "").toLowerCase();
  const orderNum = String(order?.order_number || "");
  return region === "karnataka" || owner === "unilet" || orderNum.endsWith("-UL");
}

async function saveApiResult(orderId, api_status, api_reason) {
  await OrderNew.updateOne(
    { _id: orderId },
    { $set: { api_status, api_reason: api_reason || "" } }
  );
}

async function saveWondersoftApiLog(orderId, jsonText, responseData) {
  await PostapijsonWodersoftResult.create({
    order_id: orderId,
    json_text: jsonText != null ? String(jsonText) : null,
    response_data: responseData != null ? String(responseData) : null,
  });
}

export async function sendOrderData(orderId, remarks = null) {
  const built = await buildSendOrderData(orderId, remarks);
  const { payload, order, usedAddressFallback } = built;

  if (remarks != null) {
    await OrderNew.updateOne(
      { _id: order._id },
      { $set: { customer_comments: remarks } }
    );
  }

  if (isKarnatakaOrder(order)) {
    const api_status = "SUCCESS";
    const api_reason = "Unilet Data processed successfully";
    await saveApiResult(order._id, api_status, api_reason);
    return {
      api_status,
      api_reason,
      skippedApi: true,
      payload,
      usedAddressFallback,
    };
  }

  const jsonText = JSON.stringify(payload);
  const tokenResult = await wondersoftAuthtoken();
  if (!tokenResult.ok) {
    const api_status = "FAILURE";
    const api_reason = tokenResult.statusMessage || "Token request failed";
    await saveApiResult(order._id, api_status, api_reason);
    await saveWondersoftApiLog(order._id, jsonText, tokenResult.raw || api_reason);
    return {
      api_status,
      api_reason,
      skippedApi: false,
      token: {
        ok: false,
        mode: tokenResult.mode,
        httpStatus: tokenResult.httpStatus,
        result: tokenResult.result,
      },
      payload,
      usedAddressFallback,
    };
  }

  const posted = await wondersoftCreateSalesOrder(payload, tokenResult.accessToken);
  await saveWondersoftApiLog(order._id, jsonText, posted.raw);
  let api_status = posted.result || "";
  let api_reason = "";

  if (posted.ok && posted.parsed?.Response) {
    api_status = posted.result || api_status;
    if (api_status === "SUCCESS") {
      api_reason = posted.statusMessage || "";
    }
    if (api_status === "FAILURE") {
      api_reason = posted.failureReason || "";
    }
  } else if (!posted.ok) {
    api_status = "FAILURE";
    api_reason = posted.failureReason || posted.statusMessage || "CreateSalesOrder request failed";
  }

  if (api_status) {
    await saveApiResult(order._id, api_status, api_reason);
  }

  return {
    api_status,
    api_reason,
    skippedApi: false,
    token: {
      ok: true,
      mode: tokenResult.mode,
      httpStatus: tokenResult.httpStatus,
      result: tokenResult.result,
    },
    wondersoft: {
      ok: posted.ok,
      mode: posted.mode,
      apiUrl: posted.apiUrl,
      httpStatus: posted.httpStatus,
      result: posted.result,
    },
    payload,
    response: posted.parsed,
    usedAddressFallback,
  };
}
