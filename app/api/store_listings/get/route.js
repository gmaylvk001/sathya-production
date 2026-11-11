import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreListing from "@/models/store_listings";
import { isUniletView, ownerFieldFilter } from "@/lib/storeView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Only the admin Store Listings page sends scope=admin; checkout and order pages need every store.
export async function GET(req) {
  try {
    await dbConnect();
    const adminScope = new URL(req.url).searchParams.get("scope") === "admin";
    const filter = adminScope ? ownerFieldFilter("store_owner", await isUniletView(req)) : {};
    let rows = await StoreListing.find(filter).sort({ created_at: -1, exist_id: -1 }).lean();
    if ((!rows || rows.length === 0) && !adminScope) {
      try {
        const Store = (await import("@/models/store")).default;
        const storeDocs = await Store.find({}).lean();
        if (storeDocs && storeDocs.length > 0) {
          rows = storeDocs.map(s => ({
            ...s,
            title: s.organisation_name || s.title,
            store_owner: s.store_owner || 'sathya'
          }));
        }
      } catch (fallbackErr) {
        console.warn("Store fallback error in store_listings/get:", fallbackErr);
      }
    }
    const cleanNull = (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      const u = t.toUpperCase();
      return u === "NULL" || u === "UNDEFINED" ? null : t;
    };
    const sanitizedRows = (rows || []).map((row) => ({
      ...row,
      branch_code: cleanNull(row.branch_code),
      phone: cleanNull(row.phone),
      phone_afterhours: cleanNull(row.phone_afterhours),
      address: cleanNull(row.address),
    }));

    return NextResponse.json(sanitizedRows, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    console.error("Error fetching store listings:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
