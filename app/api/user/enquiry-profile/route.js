import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/enquiry-profile
 * Logged-in user only → name / mobile / email from ecom_users_info (User model).
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.split(" ")[1] || "";

    if (!token) {
      return NextResponse.json(
        { success: false, loggedIn: false, message: "Not logged in" },
        { status: 200 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, loggedIn: false, message: "Invalid or expired token" },
        { status: 200 }
      );
    }

    const userId = decoded?.userId != null ? String(decoded.userId) : "";
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, loggedIn: false, message: "Invalid user" },
        { status: 200 }
      );
    }

    await dbConnect();
    const user = await User.findById(userId)
      .select("name last_name mobile email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, loggedIn: false, message: "User not found" },
        { status: 200 }
      );
    }

    const name = [user.name, user.last_name].filter(Boolean).join(" ").trim();

    return NextResponse.json({
      success: true,
      loggedIn: true,
      user_id: String(user._id),
      name: name || String(user.name || "").trim() || "",
      phone: user.mobile != null ? String(user.mobile).trim() : "",
      email: user.email != null ? String(user.email).trim() : "",
    });
  } catch (err) {
    console.error("enquiry-profile error:", err);
    return NextResponse.json(
      { success: false, loggedIn: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
