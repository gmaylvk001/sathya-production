import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomePage from "@/models/homePage";

export async function GET() {
  try {
    await dbConnect();
    let page = await HomePage.findOne().lean();
    if (!page) {
      page = await HomePage.create({ name: "Home Page", status: "active", components: [] });
      page = page.toObject();
    }
    return NextResponse.json({
      success: true,
      page: { ...page, componentCount: page.components?.length || 0 },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
