import dbConnect from "@/lib/db";
import BlogFaq from "@/models/BlogFaq";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ success: false, error: "FAQ IDs are required" }, { status: 400 });
    }

    await BlogFaq.deleteMany({ _id: { $in: body.ids } });

    return NextResponse.json({ success: true, message: "FAQs deleted successfully" });
  } catch (error) {
    console.error("Error bulk deleting FAQs:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
