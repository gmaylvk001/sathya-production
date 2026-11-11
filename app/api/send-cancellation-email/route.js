import { NextResponse } from "next/server";

const EMAIL_AUTH =
  process.env.EYGR_EMAIL_AUTH ||
  "Bearer 2|DC7TldSOIhrILsnzAf0gzgBizJcpYz23GHHs0Y2L";

/** Eygr campaign — paste templates/eygr-order-cancellation-campaign.html */
const CANCEL_CAMPAIGN_ID =
  process.env.EYGR_CANCEL_CAMPAIGN_ID ||
  "04f143b9-492e-4a5b-97b8-52a2c9c879a4";

const DEFAULT_ADMIN_EMAILS = [
  "arunkarthik@sathya.store",
  "ecom@sathya.store",
  "itadmin@sathya.store",
  "telemarketing@sathya.store",
  "sekarcorp@sathya.store",
];

const formatINR = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function isEygrSendSuccessful(httpOk, data) {
  if (!httpOk) return false;
  if (!data || typeof data !== "object") return true;
  if (data.success === false) return false;
  if (data.status === "error" || data.status === "failed") return false;
  if (data.error) return false;
  return true;
}

/** {{2}} product name + qty + price (+ warranty if any) */
function buildCancelledItemsText(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return "Product details not available.";
  }

  return items
    .map((item) => {
      const name = item.name || item.product_name || "Product";
      const price = Number(item.price || item.product_price || 0);
      const qty = Number(item.quantity || 1);
      const subtotal = price * qty;
      const warranty =
        item.warrantyData?.year && item.warrantyData?.price
          ? `<br/>+ ${item.warrantyData.year} Year Extended Warranty (${formatINR(item.warrantyData.price)})`
          : "";
      return `<strong>${name}</strong><br/>${formatINR(price)} x ${qty} = ${formatINR(subtotal)}${warranty}`;
    })
    .join("<br/><br/>");
}

async function sendEygrEmail(campaignId, email, params) {
  const formData = new FormData();
  formData.append("campaign_id", campaignId);
  formData.append("email", email);
  formData.append(
    "params",
    JSON.stringify(params.map((p) => (p == null ? "" : String(p)))),
  );

  const response = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { raw: await response.text().catch(() => "") };
  }

  return {
    ok: isEygrSendSuccessful(response.ok, data),
    status: response.status,
    data,
    email,
    campaignId,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      orderDetails,
      customerEmail,
      adminEmails = DEFAULT_ADMIN_EMAILS,
    } = body;

    if (!orderDetails) {
      return NextResponse.json(
        { success: false, error: "orderDetails is required" },
        { status: 400 },
      );
    }

    const orderNumber = String(orderDetails.order_number || "")
      .replace(/^#/, "")
      .trim();
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "order_number is required" },
        { status: 400 },
      );
    }

    const itemsText = buildCancelledItemsText(orderDetails.order_item || []);

    // Exactly 2 params — must match Eygr template:
    // {{1}} order number  {{2}} cancelled product details
    const params = [orderNumber, itemsText];

    const recipients = [
      ...new Set(
        [customerEmail, ...(adminEmails || [])]
          .map((e) => String(e || "").trim())
          .filter(Boolean),
      ),
    ];

    if (!recipients.length) {
      return NextResponse.json(
        { success: false, error: "No recipient emails provided" },
        { status: 400 },
      );
    }

    const results = [];
    for (const email of recipients) {
      results.push(await sendEygrEmail(CANCEL_CAMPAIGN_ID, email, params));
    }

    const success = results.some((r) => r.ok);

    console.log("Cancellation email (Eygr) result:", {
      orderNumber,
      paramsPreview: [orderNumber, itemsText.slice(0, 120)],
      results: results.map((r) => ({
        ok: r.ok,
        status: r.status,
        email: r.email,
        message: r.data?.message || r.data,
      })),
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Eygr delivery failed", results, params },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: true, orderNumber, params, results },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send cancellation email",
      },
      { status: 500 },
    );
  }
}
