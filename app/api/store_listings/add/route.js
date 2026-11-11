import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreListing, { STORE_LISTING_FIELDS, STORE_LISTING_NUMBER_FIELDS } from "@/models/store_listings";
import { parseExistId, parseNumberValue, slugify, stringifyValue } from "@/lib/storeImportHelpers";
import { branchConflictMessage, findBranchConflict } from "@/lib/storeListingBranch";

function buildListingPayload(body) {
  const payload = {};
  for (const field of STORE_LISTING_FIELDS) {
    if (field === "exist_id") {
      payload.exist_id = parseExistId(body.exist_id);
      continue;
    }
    if (field === "created_at" || field === "updated_at") continue;
    if (field === "instagram_stories") {
      if (body.instagram_stories === undefined || body.instagram_stories === null || body.instagram_stories === "") {
        payload.instagram_stories = null;
      } else if (typeof body.instagram_stories === "string") {
        try {
          payload.instagram_stories = JSON.parse(body.instagram_stories);
        } catch {
          payload.instagram_stories = body.instagram_stories;
        }
      } else {
        payload.instagram_stories = body.instagram_stories;
      }
      continue;
    }
    if (STORE_LISTING_NUMBER_FIELDS.has(field)) {
      const fallback = ["approved", "verified", "spam", "is_WH"].includes(field) ? 0 : null;
      payload[field] = parseNumberValue(body[field], fallback);
      continue;
    }
    if (field === "store_owner") {
      const owner = String(body.store_owner || "sathya").trim().toLowerCase();
      payload.store_owner = owner === "unilet" ? "unilet" : "sathya";
      continue;
    }
    payload[field] = stringifyValue(body[field]);
  }

  if (!payload.slug && payload.title) {
    payload.slug = slugify(payload.title).slice(0, 255);
  }

  return payload;
}

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const payload = buildListingPayload(body);

    if (payload.exist_id) {
      const exists = await StoreListing.findOne({ exist_id: payload.exist_id }).lean();
      if (exists) {
        return NextResponse.json({ error: "exist_id already exists" }, { status: 409 });
      }
    }

    if (await findBranchConflict({ branchCode: payload.branch_code, storeOwner: payload.store_owner })) {
      return NextResponse.json(
        { error: branchConflictMessage(payload.branch_code, payload.store_owner) },
        { status: 409 }
      );
    }

    const listing = await StoreListing.create(payload);
    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch (error) {
    console.error("Error adding store listing:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
