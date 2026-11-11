import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Role from "@/models/Role";
import "@/models/Permission";
import { requireAdmin } from "@/lib/adminRequest";

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const roles = await Role.find()
      .populate("permissions", "name slug")
      .sort({ createdAt: -1 });
    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
