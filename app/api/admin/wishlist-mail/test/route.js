import { NextResponse } from "next/server";

/**
 * POST /api/admin/wishlist-mail/test
 * Same style as placing an order → /api/send-order-email
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/api/send-wishlist-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerEmail: email,
        adminEmails: body.adminEmails || [],
        wishlistDetails: {
          name: body.name || "Test Customer",
          product_name: body.productName || "Sample Wishlist Product",
          wishlist_url: "https://www.sathya.store/wishlist",
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("wishlist-mail test error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Test send failed" },
      { status: 500 },
    );
  }
}
