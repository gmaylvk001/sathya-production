import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Role from "@/models/Role";
import { requireAdmin } from "@/lib/adminRequest";

export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { roleId } = await req.json();

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await Role.findByIdAndDelete(roleId);

    return NextResponse.json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
