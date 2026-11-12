import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HeaderMenuItem from "@/models/header_menu_item";
import Category from "@/models/ecom_category_info";
import { requireAdmin } from "@/lib/adminRequest";
import {
  getHeaderMenuSettings,
  invalidateHeaderMenuCache,
  listHeaderMenuItemsForAdmin,
} from "@/lib/headerMenu";

export const dynamic = "force-dynamic";

const PERMISSION = "categories";

export async function GET(req) {
  const auth = await requireAdmin(req, PERMISSION);
  if (!auth.authorized) return auth.response;

  try {
    const [items, settings] = await Promise.all([
      listHeaderMenuItemsForAdmin(),
      getHeaderMenuSettings(),
    ]);
    return NextResponse.json({ data: items, settings });
  } catch (error) {
    console.error("[header-menu GET]", error);
    return NextResponse.json({ error: "Failed to load header menu" }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireAdmin(req, PERMISSION);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const type = body.type === "custom" ? "custom" : body.type === "category" ? "category" : "";

    if (!type) {
      return NextResponse.json({ error: "type must be 'category' or 'custom'" }, { status: 400 });
    }

    const last = await HeaderMenuItem.findOne({}).sort({ position: -1 }).select("position").lean();
    const position = last ? (Number(last.position) || 0) + 1 : 0;

    if (type === "category") {
      const categoryId = String(body.category_id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return NextResponse.json({ error: "Valid category_id is required" }, { status: 400 });
      }

      const cat = await Category.findById(categoryId).select("category_name status").lean();
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      const exists = await HeaderMenuItem.findOne({ type: "category", category_id: categoryId }).lean();
      if (exists) {
        return NextResponse.json({ error: "This category is already in the header menu" }, { status: 409 });
      }

      const item = await HeaderMenuItem.create({
        type,
        category_id: categoryId,
        label: String(body.label || "").trim() || cat.category_name,
        position,
        status: "Active",
      });
      invalidateHeaderMenuCache();
      return NextResponse.json({ data: item }, { status: 201 });
    }

    const label = String(body.label || "").trim();
    const href = String(body.href || "").trim();
    if (!label || !href) {
      return NextResponse.json({ error: "label and href are required for custom links" }, { status: 400 });
    }
    if (!href.startsWith("/") && !/^https?:\/\//i.test(href)) {
      return NextResponse.json(
        { error: "href must start with / (site page) or http(s):// (external link)" },
        { status: 400 }
      );
    }

    const item = await HeaderMenuItem.create({ type, label, href, position, status: "Active" });
    invalidateHeaderMenuCache();
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[header-menu POST]", error);
    return NextResponse.json({ error: "Failed to add menu item" }, { status: 500 });
  }
}
