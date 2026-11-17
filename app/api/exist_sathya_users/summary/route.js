import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ensureExistUsersIndexesOnce, getSummary } from "@/lib/existSathyaUsersList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/exist_sathya_users/summary
// Whole-table counts (total, moved, not moved, role options, not moved per role).
export async function GET() {
  try {
    await dbConnect();
    await ensureExistUsersIndexesOnce();
    const summary = await getSummary();
    return NextResponse.json(summary, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching exist sathya users summary:", error);
    return NextResponse.json({ message: "Failed to load summary" }, { status: 500 });
  }
}
