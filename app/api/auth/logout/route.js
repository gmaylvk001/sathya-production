import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import { revokeAdminSession } from "@/lib/adminSession";

export async function POST(req) {
  try {
    const header = req.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.userId && decoded?.sid) {
        await connectDB();
        await revokeAdminSession(decoded.userId, decoded.sid);
      }
    }
  } catch {
    // An expired token still counts as signed out in the browser.
  }

  return Response.json({ success: true });
}
