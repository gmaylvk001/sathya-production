import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreListing, { STORE_LISTING_FIELDS, STORE_LISTING_NUMBER_FIELDS } from "@/models/store_listings";
import { parseExistId, parseNumberValue, slugify, stringifyValue } from "@/lib/storeImportHelpers";
import { branchConflictMessage, findBranchConflict, normalizeOwner } from "@/lib/storeListingBranch";

function buildListingUpdate(body) {
  const update = {};
  for (const field of STORE_LISTING_FIELDS) {
    if (!(field in body) && field !== "slug") continue;
    if (field === "created_at" || field === "updated_at") continue;

    if (field === "exist_id") {
      update.exist_id = parseExistId(body.exist_id);
      continue;
    }
    if (field === "instagram_stories") {
      if (body.instagram_stories === undefined || body.instagram_stories === null || body.instagram_stories === "") {
        update.instagram_stories = null;
      } else if (typeof body.instagram_stories === "string") {
        try {
          update.instagram_stories = JSON.parse(body.instagram_stories);
        } catch {
          update.instagram_stories = body.instagram_stories;
        }
      } else {
        update.instagram_stories = body.instagram_stories;
      }
      continue;
    }
    if (STORE_LISTING_NUMBER_FIELDS.has(field)) {
      const fallback = ["approved", "verified", "spam", "is_WH"].includes(field) ? 0 : null;
      update[field] = parseNumberValue(body[field], fallback);
      continue;
    }
    if (field === "store_owner") {
      const owner = String(body.store_owner || "sathya").trim().toLowerCase();
      update.store_owner = owner === "unilet" ? "unilet" : "sathya";
      continue;
    }
    update[field] = stringifyValue(body[field]);
  }

  if (!update.slug && update.title) {
    update.slug = slugify(update.title).slice(0, 255);
  }

  return update;
}

export async function PUT(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const id = body.id || body._id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid listing id is required" }, { status: 400 });
    }

    const update = buildListingUpdate(body);

    if (update.exist_id) {
      const conflict = await StoreListing.findOne({
        exist_id: update.exist_id,
        _id: { $ne: id },
      }).lean();
      if (conflict) {
        return NextResponse.json({ error: "exist_id already exists" }, { status: 409 });
      }
    }

    if ("branch_code" in update || "store_owner" in update) {
      const current = await StoreListing.findById(id).select("branch_code store_owner").lean();
      if (!current) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
      const nextCode = "branch_code" in update ? update.branch_code : current.branch_code;
      const nextOwner = "store_owner" in update ? update.store_owner : current.store_owner;
      const changed =
        String(nextCode || "").trim().toLowerCase() !== String(current.branch_code || "").trim().toLowerCase() ||
        normalizeOwner(nextOwner) !== normalizeOwner(current.store_owner);
      if (changed && (await findBranchConflict({ branchCode: nextCode, storeOwner: nextOwner, excludeId: id }))) {
        return NextResponse.json({ error: branchConflictMessage(nextCode, nextOwner) }, { status: 409 });
      }
    }

    const listing = await StoreListing.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, listing });
  } catch (error) {
    console.error("Error editing store listing:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
