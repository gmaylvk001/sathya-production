/**
 * Wishlist Eygr — same send as order mail. Individual params only.
 * {{1}} name | {{2}} product | {{3}} wishlist URL
 */

const EMAIL_AUTH =
  process.env.EYGR_EMAIL_AUTH ||
  "Bearer 2|DC7TldSOIhrILsnzAf0gzgBizJcpYz23GHHs0Y2L";

const WISHLIST_MAIL_CAMPAIGN_ID = "ff234711-ea38-4429-9c43-a9e1e2d08568";

const SITE_BASE = "https://www.sathya.store";

export function buildWishlistMailEygrParams({
  userName,
  productName,
  wishlistUrl,
}) {
  return [
    String(userName || "Customer").trim(),
    String(productName || "Product").trim(),
    String(wishlistUrl || `${SITE_BASE}/wishlist`).trim(),
  ];
}

async function sendEygrEmail(campaignId, email, params) {
  const formData = new FormData();
  formData.append("campaign_id", campaignId);
  formData.append("email", email);
  formData.append("params", JSON.stringify(params));

  const response = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { raw: await response.text().catch(() => "") };
  }

  return { ok: response.ok, status: response.status, data, email, params };
}

export async function sendEygrWishlistMail(email, params) {
  const payload = buildWishlistMailEygrParams({
    userName: params?.[0],
    productName: params?.[1],
    wishlistUrl: params?.[2],
  });

  const result = await sendEygrEmail(
    WISHLIST_MAIL_CAMPAIGN_ID,
    email,
    payload,
  );

  console.log("Wishlist Eygr send:", {
    email,
    campaignId: WISHLIST_MAIL_CAMPAIGN_ID,
    params: payload,
    ok: result.ok,
    status: result.status,
    data: result.data,
  });

  return {
    ...result,
    campaignId: WISHLIST_MAIL_CAMPAIGN_ID,
    params: payload,
  };
}

export { WISHLIST_MAIL_CAMPAIGN_ID, SITE_BASE };
