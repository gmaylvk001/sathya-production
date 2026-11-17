import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExistSathyaUser from "@/models/ExistSathyaUser";
import {
  annotateRow,
  buildListFilter,
  ensureExistUsersIndexesOnce,
  findMoveFilteredPage,
  getLiveSets,
  LIST_PROJECTION,
  LIST_SORT,
  parseListParams,
} from "@/lib/existSathyaUsersList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

// GET /api/exist_sathya_users/get?page=1&limit=20&q=&role=&move=&start=&end=
// Returns one page of rows plus the total matching count.
export async function GET(req) {
  try {
    await dbConnect();
    await ensureExistUsersIndexesOnce();

    const { page, limit, move, q, role, start, end } = parseListParams(req.nextUrl.searchParams);
    const filter = buildListFilter({ q, role, start, end });
    const sets = await getLiveSets();

    let total;
    let rows;

    if (move) {
      const result = await findMoveFilteredPage({ filter, move, sets, page, limit });
      total = result.total;
      rows = result.rows;
    } else {
      [total, rows] = await Promise.all([
        ExistSathyaUser.countDocuments(filter),
        ExistSathyaUser.find(filter)
          .select(LIST_PROJECTION)
          .sort(LIST_SORT)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);
    }

    return NextResponse.json(
      {
        data: rows.map((row) => annotateRow(row, sets)),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching exist sathya users:", error);
    return NextResponse.json({ message: "Failed to load exist users" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
