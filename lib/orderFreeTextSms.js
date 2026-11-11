// Admin order view "Send SMS": exist TextMySMS free-text message to the order phone number.

export const ORDER_SMS_MAX_LENGTH = 160;

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

export function normalizeSmsMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function sendOrderFreeTextSms({ mobile, text }) {
  const params = new URLSearchParams({
    key: requiredEnv("TEXTMYSMS_KEY"),
    campaign: requiredEnv("TEXTMYSMS_CAMPAIGN"),
    routeid: requiredEnv("TEXTMYSMS_ROUTE_ID"),
    type: requiredEnv("TEXTMYSMS_TYPE"),
    contacts: mobile,
    senderid: requiredEnv("TEXTMYSMS_SENDER_ID"),
    msg: text,
  });

  const response = await fetch(`${requiredEnv("TEXTMYSMS_API_URL")}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = (await response.text().catch(() => "")).trim();

  return { success: response.ok && Boolean(body), status: response.status, body };
}
