import connectDB from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    // Check OTP
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid OTP." }, { status: 400 });
    }

    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ message: "OTP expired." }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 400 });
    }

    // Hash password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    // Remove OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
