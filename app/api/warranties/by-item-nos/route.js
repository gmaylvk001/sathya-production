import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Warranty from "@/models/Warranty";

export async function GET(request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const item_nos = searchParams.get("item_nos") || "";

  if (!item_nos) return NextResponse.json({ warranties: [] });

  const ids = item_nos.split(",").map((s) => s.trim()).filter(Boolean);

  const warranties = await Warranty.find({
    item_no: { $in: ids },
  }).lean();

  return NextResponse.json({ warranties });
}