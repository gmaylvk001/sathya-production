/**
 * Order-placed WhatsApp, same moment as the order confirmation SMS.
 * Sends only when .env SendOrderWhatsappMessage is Active or 1.
 *
 * WhatsApp Business template (approved in Meta) must match the order card:
 * Header: Order Successful: {{1}}
 * Body:   Your order has been placed successfully.
 *         Tap below to see the shipping dates for your items 👇
 * Footer: To pause important order updates via WhatsApp, send STOP.
 * Button: Track Order here → https://www.sathya.store/{{1}}
 */

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function isSendOrderWhatsappMessageEnabled() {
  const flag = toText(process.env.SendOrderWhatsappMessage).toLowerCase();
  return flag === "active" || flag === "1";
}

function whatsappMobile(value) {
  const digits = toText(value).replace(/\D/g, "");
  const ten = digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(ten)) return "";
  return `91${ten}`;
}

function productTitle(order) {
  const items = Array.isArray(order?.order_item) ? order.order_item : [];
  const first = items[0] || {};
  const raw = toText(first.name || first.product_name || first.item_name) || "your item";
  const clean = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").replace(/[*_~]/g, "");
  if (clean.length <= 60) return clean;
  return `${clean.slice(0, 57)}...`;
}

function trackPath() {
  const configured = toText(process.env.WHATSAPP_ORDER_TRACK_PATH);
  const path = (configured || "user/orders").replace(/^\/+/, "");
  return path || "user/orders";
}

export async function sendOrderConfirmationWhatsapp(order) {
  try {
    if (!isSendOrderWhatsappMessageEnabled()) {
      return { success: false, skipped: true, reason: "SendOrderWhatsappMessage is not active" };
    }

    const to = whatsappMobile(order?.order_phonenumber);
    if (!to) {
      return { success: false, skipped: true, reason: "Missing order mobile" };
    }

    const token = toText(process.env.WHATSAPP_ACCESS_TOKEN);
    const phoneNumberId = toText(process.env.WHATSAPP_PHONE_NUMBER_ID);
    if (!token || !phoneNumberId) {
      console.error(
        "[order confirm WhatsApp] SendOrderWhatsappMessage is active, but WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing"
      );
      return { success: false, skipped: true, reason: "WhatsApp API is not configured" };
    }

    const version = toText(process.env.WHATSAPP_GRAPH_VERSION) || "v22.0";
    const templateName = toText(process.env.WHATSAPP_ORDER_TEMPLATE_NAME) || "order_successful";
    const language = toText(process.env.WHATSAPP_ORDER_TEMPLATE_LANG) || "en";
    const title = productTitle(order);

    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: language },
            components: [
              {
                type: "header",
                parameters: [{ type: "text", text: title }],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: trackPath() }],
              },
            ],
          },
        }),
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `WhatsApp API ${response.status}`;
      console.error("[order confirm WhatsApp]", message);
      return { success: false, error: message };
    }

    return { success: true, id: payload?.messages?.[0]?.id || null };
  } catch (error) {
    console.error("[order confirm WhatsApp]", error.message);
    return { success: false, error: error.message };
  }
}
