import dbConnect from "@/lib/db";
import EcomBanner from "@/models/ecom_banner_info";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const banner = await EcomBanner.findOne({ title });
    return NextResponse.json({ banner });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
