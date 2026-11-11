import dbConnect from "@/lib/db";
import Useraddress from "@/models/ecom_user_address_info";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ message: "Address fetched successfully", userAddress: [] }, { status: 200 });
    }
    let useraddress = [];
    try {
      useraddress = await Useraddress.find({ userId: userId }).lean();
    } catch {
      useraddress = [];
    }
    return NextResponse.json(
      { message: "Address fetched successfully", userAddress: useraddress || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching Useraddress:", error);
    return NextResponse.json({ message: "Address fetched successfully", userAddress: [] }, { status: 200 });
  }
}
