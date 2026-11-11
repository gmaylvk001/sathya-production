import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Warranty from "@/models/Warranty";

export async function GET(request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) return NextResponse.json({ warranties: [] });

  const warranties = await Warranty.find({
    name: { $regex: q, $options: "i" },
    status: "Active",
  })
    .limit(20)
    .lean();

  return NextResponse.json({ warranties });
}