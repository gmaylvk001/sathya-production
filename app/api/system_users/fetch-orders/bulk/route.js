import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/adminRequest";
import { bulkFetchExistOrders } from "@/lib/bulkFetchExistOrders";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/system_users/fetch-orders/bulk  { afterId?, limit?, mode? }
 * mode: "pending" (default) = not yet fetched | "refetch" = already fetched (check new exist orders)
 * Bulk exist orders fetch for admin users (System Users page).
 */
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "refetch" ? "refetch" : "pending";
    const result = await bulkFetchExistOrders({
      userType: "admin",
      afterId: body?.afterId,
      limit: body?.limit,
      mode,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bulk exist orders fetch error:", error);
    return NextResponse.json({ error: "Failed to bulk fetch exist orders", message: error.message }, { status: 500 });
  }
}
