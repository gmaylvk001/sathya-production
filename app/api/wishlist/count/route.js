import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

import connectDB from "@/lib/db";
import Wishlist from "@/models/ecom_wishlist_info";

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ count: 0 });

    const { userId } = verifyToken(token);
    await connectDB();

    const count = await Wishlist.countDocuments({ userId: userId });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("Wishlist count error", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}