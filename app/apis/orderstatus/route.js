import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import OrderNew from "@/models/orders_new";
import OrderHistoryNew from "@/models/order_history_new";
import StoreListing from "@/models/store_listings";

const DEFAULT_STORE_CONTACT = "8068424842";

// Set to true if SMS delivery should be active for Order Accepted / Billed
const ENABLE_STATUS_SMS = false;

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

/**
 * Format date in DD-MM-YYYY under Asia/Kolkata timezone
 */
function getDeliveryDateInKolkata(addDays = 2) {
  const targetDate = new Date(Date.now() + addDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(targetDate);

  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";
  return `${day}-${month}-${year}`;
}

/**
 * Fetch store virtual mobile number from Adtarbo API
 */
async function getStoreMobAdtarbo(listing) {
  if (!listing) return "";
  try {
    const listingId = toText(listing.exist_id) || String(listing._id);
    if (!listingId) return "";

    const apiUrl = `https://adtarbo.eywamedia.com/api/SathyaVNApi/${listingId}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);

    if (data && String(data.msg || "").toLowerCase() === "success" && data.virtual_no) {
      return String(data.virtual_no).trim();
    }
  } catch (error) {
    console.error("[getStoreMobAdtarbo Error]:", error.message);
  }
  return "";
}

/**
 * POST /apis/orderstatus
 * Matches legacy PHP CheckoutController::apiinvoicestatus
 */
export async function POST(req) {
  try {
    const data = await req.json().catch(() => ({}));
    console.log("[POST /apis/orderstatus payload]:", data);

    const orderNumber = toText(data.ordernumber || data.order_number);
    const status = toText(data.orderstatus || data.order_status);

    if (!orderNumber || !status) {
      return NextResponse.json(
        { status_code: 400, status: "error", message: "ordernumber and orderstatus are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await OrderNew.findOne({ order_number: orderNumber });

    if (!order) {
      console.warn(`[POST /apis/orderstatus] Order not found for number: ${orderNumber}`);
      return NextResponse.json(
        { status_code: 400, status: "error" },
        { status: 400 }
      );
    }

    let smsText = "";
    if (status === "Order Accepted") {
      let storeListing = null;
      if (order.pickup_type) {
        storeListing = await StoreListing.findOne({ branch_code: order.pickup_type }).lean();
      }
      let contactNo = await getStoreMobAdtarbo(storeListing);
      if (!contactNo) {
        contactNo = DEFAULT_STORE_CONTACT;
      }
      const storeTitle = storeListing?.title || "";
      smsText = `Hey ${order.order_username || "user"}! Order No: ${order.order_number} is successfully accepted at Store ${storeTitle} and will be delivered in 3 to 4 working days. Contact: ${contactNo} https://www.sathya.store/user/orders`;
      
      // In PHP, SMS dispatch was commented out. If enabled:
      if (ENABLE_STATUS_SMS && order.order_phonenumber) {
        // dispatch SMS when configured
        console.log("[Order Accepted SMS Text]:", smsText);
      }
    } else if (status === "Billed") {
      const deliveryDate = getDeliveryDateInKolkata(2);
      let storeListing = null;
      if (order.pickup_type) {
        storeListing = await StoreListing.findOne({ branch_code: order.pickup_type }).lean();
      }
      let contactNo = await getStoreMobAdtarbo(storeListing);
      if (!contactNo) {
        contactNo = "";
      }
      smsText = `Order No: ${order.order_number} is shipped. Delivery by ${deliveryDate}. You'll receive a copy of invoice shortly or it can be downloaded at https://www.sathya.store/user/orders\nContact: ${contactNo}`;

      // In PHP, SMS dispatch was commented out. If enabled:
      if (ENABLE_STATUS_SMS && order.order_phonenumber) {
        // dispatch SMS when configured
        console.log("[Billed SMS Text]:", smsText);
      }
    }

    // Update order status
    order.order_status = status;
    await order.save();

    // Create Order History record
    try {
      await OrderHistoryNew.create({
        order_id: toText(order.exist_id) || String(order._id),
        order_number: order.order_number,
        order_status: status,
        notify: 0,
        comment: status,
      });
    } catch (historyErr) {
      console.error("[POST /apis/orderstatus History Error]:", historyErr.message);
    }

    return NextResponse.json(
      { status_code: 200, status: "success" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /apis/orderstatus Exception]:", error);
    return NextResponse.json(
      { status_code: 400, status: "error", error: error.message },
      { status: 400 }
    );
  }
}
