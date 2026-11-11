import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreZone from "@/models/store_zones";
import { parseExistId, slugify } from "@/lib/storeImportHelpers";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const zonename = String(body.zonename || "").trim() || null;
    let slug = String(body.slug || "").trim();
    if (!slug && zonename) slug = slugify(zonename);
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const status = Number(body.status);
    const payload = {
      exist_id: parseExistId(body.exist_id),
      zonename,
      slug: slug.slice(0, 60),
      status: Number.isFinite(status) ? status : 0,
    };

    if (payload.exist_id) {
      const exists = await StoreZone.findOne({ exist_id: payload.exist_id }).lean();
      if (exists) {
        return NextResponse.json({ error: "exist_id already exists" }, { status: 409 });
      }
    }

    const zone = await StoreZone.create(payload);
    return NextResponse.json({ success: true, zone }, { status: 201 });
  } catch (error) {
    console.error("Error adding store zone:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
