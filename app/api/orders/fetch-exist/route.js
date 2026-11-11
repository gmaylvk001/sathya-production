import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import { fetchExistOrdersForLiveUser } from "@/lib/fetchExistOrders";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const result = await fetchExistOrdersForLiveUser(userId);
    if (result.error) {
      return NextResponse.json(result, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    console.error("Error fetching exist orders for customer:", error);
    return NextResponse.json({
      error: "Failed to fetch exist orders",
      message: error.message,
    }, { status: 500 });
  }
}
