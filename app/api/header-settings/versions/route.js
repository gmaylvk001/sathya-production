import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/adminRequest";
import HeaderSettingsVersion from "@/models/HeaderSettingsVersion";

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();
    const versions = await HeaderSettingsVersion.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({ success: true, data: versions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching header settings versions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}
