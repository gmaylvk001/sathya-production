import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { fetchExistOrdersForLiveUser } from "@/lib/fetchExistOrders";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await dbConnect();
    const { userId } = await req.json();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const result = await fetchExistOrdersForLiveUser(userId);
    if (result.error) {
      return NextResponse.json(result, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching exist orders:", error);
    return NextResponse.json({
      error: "Failed to fetch exist orders",
      message: error.message,
    }, { status: 500 });
  }
}
