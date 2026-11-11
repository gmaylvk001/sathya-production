import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { hasPermission } from "@/lib/permissions";

// Same rule as the admin AuthProvider: a valid token whose user has user_type "admin".
export async function getAdminUserId(req) {
  if (!req?.headers) return null;
  let token = "";
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    // 1. Try NextRequest cookies getter if available
    token = req.cookies?.get?.("admin_token")?.value || req.cookies?.get?.("token")?.value || "";
    // 2. Fallback to standard cookie header parsing
    if (!token) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)(?:admin_token|token)=([^;]+)/);
      if (match) {
        try {
          token = decodeURIComponent(match[1].trim());
        } catch {
          token = match[1].trim();
        }
      }
    }
  }
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId ? String(decoded.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    await dbConnect();
    const user = await User.findById(userId).select("user_type").lean();
    return user?.user_type === "admin" ? userId : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(req, permissionSlug = null) {
  const adminUserId = await getAdminUserId(req);
  if (!adminUserId) {
    const error = "Unauthorized: Admin access required";
    return {
      authorized: false,
      status: 401,
      error,
      response: NextResponse.json({ error }, { status: 401 }),
    };
  }

  if (permissionSlug) {
    try {
      const allowed = await hasPermission(adminUserId, permissionSlug);
      if (!allowed) {
        const error = `Forbidden: '${permissionSlug}' permission required`;
        return {
          authorized: false,
          status: 403,
          error,
          response: NextResponse.json({ error }, { status: 403 }),
        };
      }
    } catch {
      const error = `Forbidden: '${permissionSlug}' permission verification failed`;
      return {
        authorized: false,
        status: 403,
        error,
        response: NextResponse.json({ error }, { status: 403 }),
      };
    }
  }

  return { authorized: true, adminUserId };
}

export function withAdmin(handler, permissionSlug = null) {
  return async function (req, context) {
    const auth = await requireAdmin(req, permissionSlug);
    if (!auth.authorized) {
      return auth.response;
    }
    return handler(req, { ...context, adminUserId: auth.adminUserId });
  };
}


