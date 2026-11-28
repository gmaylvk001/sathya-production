import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import {
  buildListFilter,
  findRangeMovableIds,
  parseListParams,
} from "@/lib/existSathyaUsersList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One run is limited so a single click cannot queue an enormous move.
const MAX_RANGE_PAGES = 250;

// GET /api/exist_sathya_users/range-ids?fromPage=1&toPage=100&limit=20&q=&role=&move=&start=&end=
// Returns the ids of not-moved users inside that page range, using the same
// ordering and filters as the list.
export async function GET(req) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const { limit, move, q, role, start, end } = parseListParams(searchParams);
    const fromPage = parseInt(searchParams.get("fromPage") || "", 10);
    const toPage = parseInt(searchParams.get("toPage") || "", 10);

    if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 1 || toPage < fromPage) {
      return NextResponse.json({ message: "Enter a valid page range (from <= to)." }, { status: 400 });
    }
    if (toPage - fromPage + 1 > MAX_RANGE_PAGES) {
      return NextResponse.json(
        { message: `Select at most ${MAX_RANGE_PAGES} pages at a time.` },
        { status: 400 }
      );
    }

    const filter = buildListFilter({ q, role, start, end });
    const ids = await findRangeMovableIds({
      filter,
      move,
      fromRow: (fromPage - 1) * limit,
      rowCount: (toPage - fromPage + 1) * limit,
    });

    return NextResponse.json(
      { ids, fromPage, toPage, limit },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (error) {
    console.error("Error fetching exist sathya users range ids:", error);
    return NextResponse.json({ message: "Failed to load the page range" }, { status: 500 });
  }
}
