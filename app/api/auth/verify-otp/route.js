import connectDB from "@/lib/db";
import Otp from "@/models/Otp";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required." }, { status: 400 });
    }

    // Find the OTP record
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid OTP." }, { status: 400 });
    }

    // Check if expired
    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ message: "OTP expired." }, { status: 400 });
    }

    // Optionally delete OTP after verification to prevent reuse
  

    return NextResponse.json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
