import connectDB from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendRobeetaOtp } from "@/lib/sms";
import { checkOtpSendLimits } from "@/lib/rateLimit";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { mobile } = await req.json();

    // Validate 10-digit Indian mobile number
    if (!mobile || !/^[6-9][0-9]{9}$/.test(mobile)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }

    await connectDB();

    const limited = await checkOtpSendLimits(req, mobile);
    if (limited) return limited;

    // Generate random 4-digit OTP (1000 - 9999)
    const otp = randomInt(1000, 10000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Upsert OTP record for this mobile
    await Otp.findOneAndUpdate(
      { mobile },
      { otp, expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Dispatch SMS via Robeeta SMS Gateway
    const smsResult = await sendRobeetaOtp(mobile, otp);
    if (!smsResult.success) {
      console.warn("[OTP] Robeeta dispatch error:", smsResult.error || smsResult.response);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send SMS to your mobile number. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
