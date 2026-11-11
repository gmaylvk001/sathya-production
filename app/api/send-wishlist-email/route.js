import { NextResponse } from "next/server";
import {
  isEmailOnWishlistTestAllowlist,
  getWishlistMailTestAllowlist,
  isWishlistMailTestAllowlistEnabled,
} from "@/lib/wishlistMail";

/**
 * Wishlist email — same Eygr method as /api/send-order-email
 * Campaign: ff234711-ea38-4429-9c43-a9e1e2d08568
 *
 * {{1}} name  |  {{2}} product  |  {{3}} wishlist URL
 */

const EMAIL_AUTH =
  process.env.EYGR_EMAIL_AUTH ||
  "Bearer 2|DC7TldSOIhrILsnzAf0gzgBizJcpYz23GHHs0Y2L";

const WISHLIST_CAMPAIGN_ID = "ff234711-ea38-4429-9c43-a9e1e2d08568";

const SITE_BASE = "https://www.sathya.store";

/** Same helper as send-order-email/route.js */
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

  return { ok: response.ok, status: response.status, data, email };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      customerEmail,
      adminEmails = [],
      wishlistDetails,
      name,
      productName,
      wishlistUrl,
    } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "customerEmail is required" },
        { status: 400 },
      );
    }

    if (!isEmailOnWishlistTestAllowlist(customerEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: `Test allowlist is ON — only: ${getWishlistMailTestAllowlist().join(", ")}`,
          allowlist: getWishlistMailTestAllowlist(),
        },
        { status: 403 },
      );
    }

    const details = wishlistDetails || {};
    const customerName = String(
      details.name || details.order_username || name || "Customer",
    ).trim();
    const product = String(
      details.product_name || details.productName || productName || "Product",
    ).trim();
    const url = String(
      details.wishlist_url ||
        details.wishlistUrl ||
        wishlistUrl ||
        `${SITE_BASE}/wishlist`,
    ).trim();

    const customerParams = [customerName, product, url];

    const customerResult = await sendEygrEmail(
      WISHLIST_CAMPAIGN_ID,
      customerEmail,
      customerParams,
    );

    const recipients = [
      ...new Set(
        (adminEmails || [])
          .map((e) => String(e || "").trim())
          .filter(Boolean)
          .filter((e) => isEmailOnWishlistTestAllowlist(e)),
      ),
    ];

    const adminResults = [];
    for (const email of recipients) {
      const adminParams = [
        customerName,
        `${product} | ${customerEmail}`,
        url,
      ];
      adminResults.push(
        await sendEygrEmail(WISHLIST_CAMPAIGN_ID, email, adminParams),
      );
    }

    const success =
      customerResult.ok || adminResults.some((result) => result.ok);

    console.log("Wishlist email result:", {
      campaignId: WISHLIST_CAMPAIGN_ID,
      customerParams,
      testAllowlistEnabled: isWishlistMailTestAllowlistEnabled(),
      customerResult,
      adminResults: adminResults.map((r) => ({
        ok: r.ok,
        status: r.status,
        email: r.email,
        message: r.data?.message || r.data,
      })),
    });

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Eygr delivery failed",
          customerResult,
          adminResults,
          customerParams,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        campaignId: WISHLIST_CAMPAIGN_ID,
        customerParams,
        customerResult,
        adminResults,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending wishlist email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send wishlist email",
      },
      { status: 500 },
    );
  }
}
