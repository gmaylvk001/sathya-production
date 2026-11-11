import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExistSathyaUser from "@/models/ExistSathyaUser";
import { buildRoleQuery, processExistUserMoves } from "@/lib/moveExistUser";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DEFAULT_BATCH = 100;
const MAX_BATCH = 200;

function parseBatchSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH;
  return Math.min(MAX_BATCH, Math.max(1, Math.trunc(n)));
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const mode = String(body.mode || "").trim();
    const batchSize = parseBatchSize(body.batchSize);

    if (!["selected", "role", "all"].includes(mode)) {
      return NextResponse.json({ error: "mode must be selected, role, or all" }, { status: 400 });
    }

    let existUsers = [];
    let done = true;
    let cursor = null;

    if (mode === "selected") {
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      const validIds = [...new Set(ids)].filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, batchSize);
      if (!validIds.length) {
        return NextResponse.json({
          success: true,
          moved: 0,
          skipped: [],
          skippedCount: 0,
          failed: 0,
          scanned: 0,
          done: true,
          cursor: null,
        });
      }
      existUsers = await ExistSathyaUser.find({ _id: { $in: validIds } }).lean();
      done = true;
      cursor = null;
    } else {
      if (mode === "role" && (body.role_id === undefined || body.role_id === null || body.role_id === "")) {
        return NextResponse.json({ error: "role_id is required for role move" }, { status: 400 });
      }

      const query = mode === "role" ? buildRoleQuery(body.role_id) : {};
      if (body.cursor && mongoose.Types.ObjectId.isValid(body.cursor)) {
        query._id = { $gt: new mongoose.Types.ObjectId(body.cursor) };
      }

      existUsers = await ExistSathyaUser.find(query)
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();

      done = existUsers.length < batchSize;
      cursor = existUsers.length ? String(existUsers[existUsers.length - 1]._id) : null;
    }

    const result = await processExistUserMoves(existUsers);
    const skippedCount = result.skipped.length;

    return NextResponse.json({
      success: true,
      moved: result.moved,
      skipped: result.skipped.slice(0, 50),
      skippedCount,
      failed: result.failed,
      scanned: existUsers.length,
      mappedDetailsCount: result.mappedDetailsCount,
      done,
      cursor,
    });
  } catch (error) {
    console.error("Error bulk moving exist sathya users:", error);
    return NextResponse.json({ error: "Failed to bulk move users", message: error.message }, { status: 500 });
  }
}
