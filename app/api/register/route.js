import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received body:", body); // Debug log

    const { name, mobile, email, password } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await connectDB();
    console.log("Database connected successfully"); // Debug log

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully"); // Debug log

    const newUser = new User({ name, mobile, email, password: hashedPassword });
    await newUser.save();
    console.log("User saved successfully"); // Debug log

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });

  } catch (error) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
