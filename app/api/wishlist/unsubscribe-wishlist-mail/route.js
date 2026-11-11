import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import Wishlist from "@/models/ecom_wishlist_info";

const VALID_PURPOSES = [
  "wishlist-mail-unsubscribe",
  "price-drop-unsubscribe", // legacy tokens
];

function verifyUnsubscribeToken(token) {
  const secrets = [
    process.env.JWT_SECRET,
    "wishlist-mail-secret",
    "price-drop-secret",
  ].filter(Boolean);

  let lastError;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Invalid token");
}

export async function GET(req) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return new NextResponse("Invalid unsubscribe link.", { status: 400 });
    }

    const decoded = verifyUnsubscribeToken(token);

    if (!VALID_PURPOSES.includes(decoded.purpose) || !decoded.wishlistId) {
      return new NextResponse("Invalid unsubscribe token.", { status: 400 });
    }

    await connectDB();
    await Wishlist.findByIdAndUpdate(decoded.wishlistId, {
      alertsEnabled: false,
    });

    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;text-align:center;">
        <h2>Unsubscribed</h2>
        <p>You will no longer receive wishlist emails for this product.</p>
      </body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    return new NextResponse("Unsubscribe link expired or invalid.", {
      status: 400,
    });
  }
}
