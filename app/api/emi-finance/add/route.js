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

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const lastRecord = await EmiFinance.findOne().sort({ id: -1 }).select("id").lean();
    const nextId = (lastRecord?.id || 0) + 1;

    const autoSlug = body.slug?.trim() || generateSlug(name);
    const useSlugForUrl = Boolean(body.useSlugForUrl);

    const newFinance = new EmiFinance({
      id: nextId,
      name,
      slug: autoSlug,
      useSlugForUrl,
      status: body.status || "Active",
    });

    await newFinance.save();
    return NextResponse.json(
      { success: true, message: "EMI Finance created successfully", data: newFinance },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/emi-finance/add:", error);
    return NextResponse.json(
      { success: false, error: "Error creating finance bank", message: error?.message },
      { status: 500 }
    );
  }
}
