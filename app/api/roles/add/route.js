import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Role from "@/models/Role";
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

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const { name, description, permissionIds } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const slug = createSlug(trimmedName);

    if (!slug) {
      return NextResponse.json({ error: "Invalid role name" }, { status: 400 });
    }

    const existingRole = await Role.findOne({
      $or: [{ name: trimmedName }, { slug }],
    });

    if (existingRole) {
      return NextResponse.json({ error: "Role already exists" }, { status: 400 });
    }

    const uniquePermissionIds = [...new Set((permissionIds || []).filter(Boolean))];
    const validPermissionIds = uniquePermissionIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validPermissionIds.length > 0) {
      const permissionCount = await Permission.countDocuments({
        _id: { $in: validPermissionIds },
      });

      if (permissionCount !== validPermissionIds.length) {
        return NextResponse.json({ error: "One or more selected permissions are invalid" }, { status: 400 });
      }
    }

    const newRole = new Role({
      name: trimmedName,
      slug,
      description: description?.trim() || "",
      permissions: validPermissionIds,
    });

    await newRole.save();

    return NextResponse.json({ message: "Role created successfully" }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Role already exists" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
