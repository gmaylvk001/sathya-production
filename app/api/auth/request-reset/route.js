import connectDB from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

const RESET_OTP_CAMPAIGN_ID = "cf9169a3-6c2c-4aa4-b53c-4d0e0dc8e96c";

async function sendOtpViaNodemailer(email, otpValue) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Password Reset OTP",
    text: `Your OTP is ${otpValue}. It expires in 10 minutes.`,
  });
}

async function sendOtpViaEygr(email, userName, otpValue) {
  const auth = process.env.EYGR_EMAIL_AUTH;
  const apiUrl =
    process.env.EYGR_EMAIL_API_URL || "https://app.eygr.in/api/send-email";

  const formData = new FormData();
  formData.append("campaign_id", RESET_OTP_CAMPAIGN_ID);
  formData.append("email", email);
  formData.append("params", JSON.stringify([userName, otpValue]));

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: auth,
    },
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { raw: await response.text().catch(() => "") };
  }

  const failed =
    !response.ok ||
    data?.success === false ||
    data?.status === "error" ||
    data?.status === "failed" ||
    Boolean(data?.error);

  if (failed) {
    const detail =
      data?.error || data?.message || `Eygr email API returned ${response.status}`;
    throw new Error(detail);
  }

  return data;
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email." },
        { status: 400 }
      );
    }

    const hasNodemailer =
      Boolean(process.env.EMAIL_USER) && Boolean(process.env.EMAIL_PASSWORD);
    const hasEygr = Boolean(process.env.EYGR_EMAIL_AUTH);

    if (!hasNodemailer && !hasEygr) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Set EMAIL_USER and EMAIL_PASSWORD, or EYGR_EMAIL_AUTH.",
        },
        { status: 503 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Email is not registered." },
        { status: 404 }
      );
    }

    const userName = user.name || "Customer";
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });
    await Otp.create({
      email,
      otp: otpValue,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    if (hasNodemailer) {
      await sendOtpViaNodemailer(email, otpValue);
    } else {
      await sendOtpViaEygr(email, userName, otpValue);
    }

    return NextResponse.json(
      { message: "OTP sent to your email." },
      { status: 200 }
    );
  } catch (error) {
    console.error("request-reset Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
