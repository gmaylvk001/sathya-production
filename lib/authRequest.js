import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

/**
 * Extract Bearer / cookie token from a Next.js request.
 */
export function extractAuthToken(req) {
  if (!req?.headers) return "";
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieToken =
    req.cookies?.get?.("token")?.value ||
    req.cookies?.get?.("admin_token")?.value ||
    "";
  if (cookieToken) return cookieToken;

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|admin_token)=([^;]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

/**
 * Verify JWT and return the authenticated user id (string), or null.
 */
export async function getAuthUserId(req) {
  const token = extractAuthToken(req);
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId ? String(decoded.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return userId;
  } catch {
    return null;
  }
}

/**
 * Require a logged-in user. Optionally require admin.
 */
export async function requireAuth(req, { adminOnly = false } = {}) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    const error = "Unauthorized";
    return {
      authorized: false,
      status: 401,
      error,
      response: NextResponse.json({ error, message: error }, { status: 401 }),
    };
  }

  if (adminOnly) {
    await dbConnect();
    const user = await User.findById(userId).select("user_type").lean();
    if (user?.user_type !== "admin") {
      const error = "Forbidden: Admin access required";
      return {
        authorized: false,
        status: 403,
        error,
        response: NextResponse.json({ error, message: error }, { status: 403 }),
      };
    }
  }

  return { authorized: true, userId };
}
