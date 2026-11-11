import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { uniletOwnerExists } from "@/lib/storeView";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ exists: await uniletOwnerExists() }, { status: 200 });
  } catch (error) {
    console.error("Error checking unilet store owner:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
