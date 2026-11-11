import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/verifyToken"; // Your JWT decode logic
import connectDB from "@/lib/db";
import Wishlist from "@/models/ecom_wishlist_info";

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ count: 0 });

    const { userId } = verifyToken(token);
    await connectDB();

    const count = await Wishlist.countDocuments({ user: userId });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("Wishlist count error", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
