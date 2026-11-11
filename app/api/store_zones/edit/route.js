import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreZone from "@/models/store_zones";
import { parseExistId, slugify } from "@/lib/storeImportHelpers";

export async function PUT(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const id = body.id || body._id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid zone id is required" }, { status: 400 });
    }

    const zonename = String(body.zonename || "").trim() || null;
    let slug = String(body.slug || "").trim();
    if (!slug && zonename) slug = slugify(zonename);
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const status = Number(body.status);
    const update = {
      zonename,
      slug: slug.slice(0, 60),
      status: Number.isFinite(status) ? status : 0,
    };

    if (body.exist_id !== undefined) {
      update.exist_id = parseExistId(body.exist_id);
      if (update.exist_id) {
        const conflict = await StoreZone.findOne({
          exist_id: update.exist_id,
          _id: { $ne: id },
        }).lean();
        if (conflict) {
          return NextResponse.json({ error: "exist_id already exists" }, { status: 409 });
        }
      }
    }

    const zone = await StoreZone.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, zone });
  } catch (error) {
    console.error("Error editing store zone:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
