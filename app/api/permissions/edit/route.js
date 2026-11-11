import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Permission from "@/models/Permission";
import { requireAdmin } from "@/lib/adminRequest";

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { permissionId, name, module, description, status } = await req.json();

    if (!permissionId) {
      return NextResponse.json({ error: "Permission ID is required" }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Permission name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const slug = createSlug(trimmedName);

    if (!slug) {
      return NextResponse.json({ error: "Invalid permission name" }, { status: 400 });
    }

    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    const existingPermission = await Permission.findOne({
      $or: [{ name: trimmedName }, { slug }],
      _id: { $ne: permissionId },
    });

    if (existingPermission) {
      return NextResponse.json({ error: "Permission already exists" }, { status: 400 });
    }

    const updateData = {
      name: trimmedName,
      slug,
      description: description?.trim() || "",
    };

    if (module !== undefined) {
      updateData.module = module?.trim() || "";
    }

    if (status) {
      updateData.status = status;
    }

    const updatedPermission = await Permission.findByIdAndUpdate(
      permissionId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Permission updated successfully",
      permission: updatedPermission,
    });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Permission already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
