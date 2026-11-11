import OrderNew from "@/models/orders_new";
import CancelOrders from "@/models/cancel_orders_live";
import OrderHistoryNew from "@/models/order_history_new";
import StoreListing from "@/models/store_listings";
import { wondersoftAuthtoken, wondersoftCancelSalesOrder } from "@/lib/wondersoft";
import { sendCancelSms as dispatchCancelSms } from "@/lib/cancelSms";

const ENABLE_ADMIN_CANCEL_SMS = true; // set true to send admin cancel SMS again
const DEFAULT_STORE_CONTACT = "8068424842";

const CANCEL_SMS = {
  // Exist sendStatusSMSforCustomer — admin cancel wording
  admin_cancelled: {
    contentid: () => process.env.SMS_ADMIN_CANCEL_CONTENT_ID || "1307161734368746167",
    build: (order, contactNo) =>
      `Hey ${toText(order.order_username) || "user"}! Your order with ID: ${toText(order.order_number)} is canceled due to being out of stock. Amount paid if any will be refunded in 3 to 5 days. https://www.sathya.store/user/orders Contact: ${contactNo}`,
  },
};

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

async function getStoreContactNo(order) {
  const pickupType = toText(order.pickup_type);
  if (!pickupType) return DEFAULT_STORE_CONTACT;

  try {
    const listing = await StoreListing.findOne({ branch_code: pickupType }).lean();
    if (!listing) return DEFAULT_STORE_CONTACT;

    const listingId = toText(listing.exist_id) || String(listing._id);
    const apiUrl = `https://adtarbo.eywamedia.com/api/SathyaVNApi/${listingId}`;
    const res = await fetch(apiUrl, { method: "GET", headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => null);

    if (data && String(data.msg || "").toLowerCase() === "success" && data.virtual_no) {
      return String(data.virtual_no).trim();
    }
  } catch (error) {
    console.error("[admin getStoreContactNo]", error.message);
  }

  return DEFAULT_STORE_CONTACT;
}

async function notifyAdminCancelSms(order, kind, contactNo) {
  if (!ENABLE_ADMIN_CANCEL_SMS) {
    return { success: false, skipped: true, held: true };
  }

  try {
    const mobile = toText(order.order_phonenumber);
    if (!mobile) return { success: false, skipped: true };

    const template = CANCEL_SMS[kind];
    if (!template) return { success: false, skipped: true };

    const text = template.build(order, contactNo || DEFAULT_STORE_CONTACT);
    const contentId = typeof template.contentid === "function" ? template.contentid() : template.contentid;
    return await dispatchCancelSms(encodeURIComponent(text), mobile, contentId);
  } catch (error) {
    console.error("[admin cancel SMS]", error.message);
    return { success: false, error: error.message };
  }
}

async function cancelOrderAPI(order) {
  const tokenResult = await wondersoftAuthtoken();
  if (!tokenResult.ok) {
    return {
      success: false,
      failureReason: "Error...Access token generate issue in wondersoft api",
    };
  }

  const created = order.created_at ? new Date(order.created_at) : new Date();
  const orderdate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(created)
    .reduce((acc, part) => {
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const payload = {
    SalesOrderCancel: {
      OrderNumber: toText(order.order_number),
      OrderDate: `${orderdate.year}${orderdate.month}${orderdate.day}`,
      OrderLocation: toText(order.pickup_type),
    },
  };

  const posted = await wondersoftCancelSalesOrder(payload, tokenResult.accessToken);
  const apiStatus = posted.result || "";
  const failureReason =
    posted.failureReason ||
    posted.statusMessage ||
    "CancelSalesOrder failed";

  return {
    success: apiStatus === "SUCCESS",
    apiStatus,
    failureReason: apiStatus === "SUCCESS" ? "" : failureReason,
    statusMessage: posted.statusMessage || "",
    wondersoft: posted,
  };
}

async function saveCancelOrders({ order, adminUserId, oldStatus, comment }) {
  return CancelOrders.create({
    order_number: toText(order.order_number),
    order_id: String(order._id),
    customer_id: toText(adminUserId),
    order_status: toText(oldStatus),
    // Exist admin: reason = '' ; only comment
    reason: "",
    comments: toText(comment) || null,
  });
}

async function saveHistoryRow(order, status, comment) {
  return OrderHistoryNew.create({
    order_id: String(order._id),
    order_number: toText(order.order_number) || null,
    order_status: status,
    notify: 0,
    comment: toText(comment) || null,
  });
}

/**
 * Exist admin Add Order History:
 * A) non-Cancelled → update status + history (no Wondersoft)
 * B) Cancelled → billed block / CancelSalesOrder / local cancel
 */
export async function adminAddOrderHistory({
  order,
  status,
  comment = "",
  adminUserId = "",
}) {
  const selectedStatus = toText(status);
  const commentText = toText(comment);
  const currentStatus = toText(order.order_status);
  const pickupType = toText(order.pickup_type);

  if (!selectedStatus) {
    return {
      success: false,
      message: "Please select a status",
      statusCode: 400,
    };
  }

  // A) Complete or any non-Cancelled
  if (selectedStatus.toLowerCase() !== "cancelled") {
    await OrderNew.updateOne(
      { _id: order._id },
      { $set: { order_status: selectedStatus } }
    );
    await saveHistoryRow(order, selectedStatus, commentText);
    return {
      success: true,
      message: "Order History Added Successfully!",
      order_status: selectedStatus,
      branch: "status_update",
    };
  }

  // B) Cancelled — admin exist: block if already Billed
  if (currentStatus.toLowerCase() === "billed") {
    return {
      success: false,
      message: "After Billing, Couldnot cancel the orders!",
      order_status: currentStatus,
      branch: "billed_blocked",
      statusCode: 400,
    };
  }

  const contactNo = await getStoreContactNo(order);

  // pickup_type set → Wondersoft CancelSalesOrder
  if (pickupType) {
    const api = await cancelOrderAPI(order);
    if (!api.success) {
      // Exist admin: show API error only — no failure SMS
      return {
        success: false,
        message: api.failureReason || "CancelSalesOrder failed",
        order_status: currentStatus,
        branch: "wondersoft_failed",
        wondersoft: {
          result: api.apiStatus || "FAILURE",
          failureReason: api.failureReason,
        },
        statusCode: 200,
      };
    }

    await OrderNew.updateOne(
      { _id: order._id },
      { $set: { order_status: "Cancelled" } }
    );
    await saveHistoryRow(order, "Cancelled", commentText);
    await saveCancelOrders({
      order,
      adminUserId,
      oldStatus: currentStatus,
      comment: commentText,
    });
    await notifyAdminCancelSms(order, "admin_cancelled", contactNo);

    return {
      success: true,
      message: "Order History Added Successfully!",
      order_status: "Cancelled",
      branch: "wondersoft_cancelled",
      wondersoft: {
        result: api.apiStatus,
        statusMessage: api.statusMessage,
      },
    };
  }

  // no pickup_type → local cancel (no Wondersoft)
  await OrderNew.updateOne(
    { _id: order._id },
    { $set: { order_status: "Cancelled" } }
  );
  await saveHistoryRow(order, "Cancelled", commentText);
  await saveCancelOrders({
    order,
    adminUserId,
    oldStatus: currentStatus,
    comment: commentText,
  });
  await notifyAdminCancelSms(order, "admin_cancelled", contactNo);

  return {
    success: true,
    message: "Order History Added Successfully!",
    order_status: "Cancelled",
    branch: "local_cancelled",
  };
}
