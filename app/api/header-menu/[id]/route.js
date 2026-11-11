import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HeaderMenuItem from "@/models/header_menu_item";
import { requireAdmin } from "@/lib/adminRequest";
import { invalidateHeaderMenuCache } from "@/lib/headerMenu";

export const dynamic = "force-dynamic";

const PERMISSION = "categories";

export async function PUT(req, { params }) {
  const auth = await requireAdmin(req, PERMISSION);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const item = await HeaderMenuItem.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    if (body.status !== "Active" && body.status !== "Inactive") {
      return NextResponse.json({ error: "status must be 'Active' or 'Inactive'" }, { status: 400 });
    }

    item.status = body.status;
    await item.save();
    invalidateHeaderMenuCache();
    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[header-menu PUT]", error);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdmin(req, PERMISSION);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const deleted = await HeaderMenuItem.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    invalidateHeaderMenuCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[header-menu DELETE]", error);
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}
