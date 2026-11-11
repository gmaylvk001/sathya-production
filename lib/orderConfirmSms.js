/**
 * Exist checkout order confirmation SMS
 * CheckoutController storeOrders / payment success
 * Template from .env: SMS_ORDER_CONFIRM_CONTENT_ID | sid: SATHYA
 * Kept separate from OTP (lib/sms.js).
 */

import { sendCancelSms as sendRobeetaSms } from "@/lib/cancelSms";

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getOrderConfirmContentId() {
  const id = String(process.env.SMS_ORDER_CONFIRM_CONTENT_ID || "").trim();
  if (!id) {
    throw new Error("SMS_ORDER_CONFIRM_CONTENT_ID is not set in .env");
  }
  return id;
}

/**
 * Exact exist text:
 * Hey {name}! Thank you for your order. Your transaction for order No.{order_number}
 * is successfully received. https://www.sathya.store/user/orders  - SATHYA
 */
export async function sendOrderConfirmationSms(order) {
  try {
    const mobile = toText(order?.order_phonenumber);
    const name = toText(order?.order_username) || "user";
    const orderNumber = toText(order?.order_number);

    if (!mobile || !orderNumber) {
      return { success: false, skipped: true, reason: "Missing mobile or order_number" };
    }

    const contentId = getOrderConfirmContentId();

    const text =
      `Hey ${name}! Thank you for your order. Your transaction for order No.${orderNumber} is successfully received. https://www.sathya.store/user/orders  - SATHYA`;

    // Exist: SMSHelper::send_sms(urlencode($text), $mobile, $contentid)
    return sendRobeetaSms(encodeURIComponent(text), mobile, contentId);
  } catch (error) {
    console.error("[order confirm SMS]", error.message);
    return { success: false, error: error.message };
  }
}
