// app/api/users/get/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    await dbConnect();

    const customerCount = await User.countDocuments({ user_type: "user" });

    return NextResponse.json(
      { success: true, customerCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
