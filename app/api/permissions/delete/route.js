import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Permission from "@/models/Permission";
import { requireAdmin } from "@/lib/adminRequest";

export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { permissionId } = await req.json();

    if (!permissionId) {
      return NextResponse.json({ error: "Permission ID is required" }, { status: 400 });
    }

    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    await Permission.findByIdAndDelete(permissionId);

    return NextResponse.json({ success: true, message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
