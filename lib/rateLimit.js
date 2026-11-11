import RateLimit from "@/models/RateLimit";
import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiter backed by MongoDB so limits hold across
 * server restarts and multiple instances. Requires an active DB connection.
 */
export async function consumeRateLimit(key, limit, windowMs) {
  const now = new Date();

  const active = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (active) {
    return {
      allowed: active.count <= limit,
      retryAfter: Math.max(1, Math.ceil((active.expiresAt - now) / 1000)),
    };
  }

  try {
    await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, expiresAt: new Date(now.getTime() + windowMs) } },
      { upsert: true }
    );
  } catch (err) {
    // Concurrent first request created the window; count against it instead.
    if (err?.code === 11000) return consumeRateLimit(key, limit, windowMs);
    throw err;
  }

  return { allowed: true, retryAfter: 0 };
}

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function tooManyRequests(message, retryAfter) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Applies the shared limits for any route that sends an OTP SMS:
 * 1 send per 60s and 5 per hour per mobile, 20 per hour per IP.
 * Returns a 429 response when blocked, otherwise null.
 */
export async function checkOtpSendLimits(req, mobile) {
  const ip = getClientIp(req);

  const ipLimit = await consumeRateLimit(`otp-send:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return tooManyRequests("Too many OTP requests. Please try again later.", ipLimit.retryAfter);
  }

  const cooldown = await consumeRateLimit(`otp-send:cooldown:${mobile}`, 1, 60 * 1000);
  if (!cooldown.allowed) {
    return tooManyRequests(
      `Please wait ${cooldown.retryAfter} seconds before requesting another OTP.`,
      cooldown.retryAfter
    );
  }

  const hourly = await consumeRateLimit(`otp-send:hour:${mobile}`, 5, 60 * 60 * 1000);
  if (!hourly.allowed) {
    return tooManyRequests(
      "Too many OTP requests for this number. Please try again later.",
      hourly.retryAfter
    );
  }

  return null;
}
