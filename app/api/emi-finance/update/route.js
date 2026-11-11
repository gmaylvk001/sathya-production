import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmiFinance from "@/models/EmiFinance";

function generateSlug(name = "") {
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
    await dbConnect();
    const body = await req.json();
    const { id, _id, name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const query = _id ? { _id } : { id: Number(id) };
    const existing = await EmiFinance.findOne(query);

    if (!existing) {
      return NextResponse.json({ success: false, error: "EMI Finance record not found" }, { status: 404 });
    }

    existing.name = name.trim();
    if (body.slug !== undefined) {
      existing.slug = body.slug.trim() || generateSlug(name);
    }
    if (body.useSlugForUrl !== undefined) {
      existing.useSlugForUrl = Boolean(body.useSlugForUrl);
    }
    if (body.status) {
      existing.status = body.status;
    }

    await existing.save();

    return NextResponse.json(
      { success: true, message: "EMI Finance updated successfully", data: existing },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/emi-finance/update:", error);
    return NextResponse.json(
      { success: false, error: "Error updating finance bank", message: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return PUT(req);
}
