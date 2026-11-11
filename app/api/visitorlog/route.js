import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VisitorLog from "@/models/VisitorLog";

/** Resolve visitor IP from proxy / Next headers and normalize localhost. */
function getClientIp(request) {
  const raw =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.ip ||
    "";

  let ip = String(raw).trim();

  // IPv4 mapped in IPv6 → 192.168.1.1
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  // Local IPv6 loopback → readable IPv4
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip || "unknown";
}

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const ip = searchParams.get("ip")?.trim();
    const skip = (page - 1) * limit;

    const filter = {};
    if (ip) {
      // Match both ::1 and 127.0.0.1 when filtering localhost
      if (ip === "127.0.0.1" || ip === "::1") {
        filter.ip = { $in: ["127.0.0.1", "::1"] };
      } else {
        filter.ip = ip;
      }
    }

    const [logs, total, uniqueIps] = await Promise.all([
      VisitorLog.find(filter)
        .sort({ visitedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VisitorLog.countDocuments(filter),
      VisitorLog.distinct("ip", filter),
    ]);

    return NextResponse.json({
      success: true,
      total,
      uniqueIpCount: uniqueIps.length,
      uniqueIps,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      data: logs,
    });
  } catch (error) {
    console.error("Error in GET /api/visitorlog:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const ip = getClientIp(request);

    await VisitorLog.create({
      ip,
      page: body?.page || "",
      referer: body?.referer || "",
      userAgent: body?.userAgent || "",
    });

    return NextResponse.json({ success: true, ip });
  } catch (error) {
    console.error("Error in POST /api/visitorlog:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}