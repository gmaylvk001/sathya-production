import connectDB from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Wishlist from "@/models/ecom_wishlist_info";
import { enableProductMailSending } from "@/lib/wishlistMail";

export async function POST(req) {
  try {
    const token = req.headers.get("authorization");
    const authtoken = token?.replace("Bearer ", "");
    if (!authtoken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = verifyToken(authtoken);
    const body = await req.json();
    const { productId } = body;
    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Wishlist.findOne({ userId, productId });
    if (existing) {
      return NextResponse.json(
        { message: "Already in wishlist", wishlistItem: existing },
        { status: 200 }
      );
    }

    const result = await Wishlist.create({
      userId,
      productId,
      mailsSent: 0,
      alertsEnabled: true,
      createdAt: new Date(),
    });

    await enableProductMailSending(productId);

    return NextResponse.json(
      {
        message: "Product added to wishlist",
        wishlistItem: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
