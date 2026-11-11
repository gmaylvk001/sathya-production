import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Role from "@/models/Role";
import "@/models/Permission";
import { requireAdmin } from "@/lib/adminRequest";

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { roleId } = await params;

    const role = await Role.findById(roleId).populate("permissions", "name slug");
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role, { status: 200 });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
