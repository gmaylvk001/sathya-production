import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 400 });
    }

    if (existingUser.user_type !== "admin") {
      return NextResponse.json({ error: "Access denied: Admin credentials required" }, { status: 403 });
    }

    const isPassword = await bcrypt.compare(password, existingUser.password);

    if (!isPassword) return NextResponse.json({ error: "Incorrect Password" }, { status: 400 });

    // Create a JWT token with user_type embedded
    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        user_type: existingUser.user_type,
        role: existingUser.user_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Client still enforces single-browser session before calling this.
    // Set cookies here too (properly encoded) so middleware accepts /admin routes.
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
