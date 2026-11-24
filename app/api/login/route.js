import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";
import { startAdminSession } from "@/lib/adminSession";

const INVALID_LOGIN = "Invalid email or password";
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: INVALID_LOGIN }, { status: 400 });
    }

    await connectDB();

    const ip = getClientIp(req);
    const ipLimit = await consumeRateLimit(`admin-login:ip:${ip}`, 30, WINDOW_MS);
    if (!ipLimit.allowed) {
      return tooManyRequests("Too many login attempts. Please try again later.", ipLimit.retryAfter);
    }

    const emailLimit = await consumeRateLimit(`admin-login:email:${email}`, 8, WINDOW_MS);
    if (!emailLimit.allowed) {
      return tooManyRequests("Too many login attempts. Please try again later.", emailLimit.retryAfter);
    }

    const existingUser = await User.findOne({ email });

    let passwordOk = false;
    if (existingUser?.user_type === "admin" && existingUser.password) {
      try {
        passwordOk = await bcrypt.compare(password, existingUser.password);
      } catch {
        passwordOk = false;
      }
    }

    if (!passwordOk) {
      return NextResponse.json({ error: INVALID_LOGIN }, { status: 400 });
    }

    if (existingUser.status === "Inactive") {
      return NextResponse.json({ error: "This account is inactive" }, { status: 403 });
    }

    const sid = await startAdminSession(existingUser._id);
    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        user_type: existingUser.user_type,
        role: existingUser.user_type,
        sid,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const response = NextResponse.json(
      {
        message: "User Login",
        token,
        role: existingUser.user_type,
        userId: existingUser._id,
      },
      { status: 200 }
    );
    response.cookies.set("admin_token", token, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    response.cookies.set("token", token, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return response;

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
