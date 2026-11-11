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

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const { name, module, description, status } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Permission name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const slug = createSlug(trimmedName);

    if (!slug) {
      return NextResponse.json({ error: "Invalid permission name" }, { status: 400 });
    }

    const existingPermission = await Permission.findOne({
      $or: [{ name: trimmedName }, { slug }],
    });

    if (existingPermission) {
      return NextResponse.json({ error: "Permission already exists" }, { status: 400 });
    }

    const newPermission = new Permission({
      name: trimmedName,
      slug,
      description: description?.trim() || "",
    });

    if (module?.trim()) {
      newPermission.module = module.trim();
    }

    if (status) {
      newPermission.status = status;
    }

    await newPermission.save();

    return NextResponse.json({ message: "Permission created successfully" }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Permission already exists" }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
