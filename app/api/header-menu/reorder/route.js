import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HeaderMenuItem from "@/models/header_menu_item";
import { requireAdmin } from "@/lib/adminRequest";
import { invalidateHeaderMenuCache } from "@/lib/headerMenu";

export const dynamic = "force-dynamic";

export async function PUT(req) {
  const auth = await requireAdmin(req, "categories");
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];

    if (!ids.length) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    await HeaderMenuItem.bulkWrite(
      ids.map((id, index) => ({
        updateOne: {
          filter: { _id: id, type: "custom" },
          update: { $set: { position: index, updatedAt: new Date() } },
        },
      }))
    );

    invalidateHeaderMenuCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[header-menu reorder]", error);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}
