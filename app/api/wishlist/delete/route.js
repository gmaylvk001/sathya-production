import connectDB from "@/lib/db";
import Wishlist from "@/models/ecom_wishlist_info";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function DELETE(req) {
  try {
    const token = req.headers.get("authorization");
    if (!token || !token.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const authToken = token.replace("Bearer ", "");
    const { userId } = verifyToken(authToken);
    if (!userId) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ message: "Product ID is required" }, { status: 400 });
    }

    await connectDB();

    const result = await Wishlist.deleteOne({
      userId: userId,
      productId: productId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Wishlist item not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Product removed from wishlist",
    }, { status: 200 });
  } catch (error) {
    console.error("DELETE wishlist error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
