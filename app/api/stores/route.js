import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import StoreListing from "@/models/store_listings";
import { attachFeaturedProductsToStores } from "@/lib/storesWithFeaturedProducts";
import { getCanonicalDistrict } from "@/lib/storeDistrictHelper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  await connectDB();

  try {
    const storeType = req.nextUrl?.searchParams?.get("storeType")?.trim().toLowerCase();

    // Prefer StoreListing (Real Sathya Showrooms used by Checkout)
    let stores = await StoreListing.find({}).sort({ created_at: -1, exist_id: -1 }).lean();

    // Fallback if StoreListing has no rows
    if (!stores || stores.length === 0) {
      try {
        const Store = (await import("@/models/store")).default;
        stores = await Store.find({}).lean();
      } catch (e) {
        stores = [];
      }
    }

    try {
      stores = await attachFeaturedProductsToStores(stores);
    } catch (e) {
      // Non-fatal if featured products attachment fails
    }

    stores = stores.map((s) => ({
      ...s,
      name: s.title || s.name || s.organisation_name || s.store_name || "",
      title: s.title || s.organisation_name || s.name || s.store_name || "",
      organisation_name: s.organisation_name || s.title || s.name || "",
      store_name: s.store_name || s.title || s.organisation_name || s.name || "",
      district: getCanonicalDistrict(s),
    }));

    if (storeType === "multi-brand" || storeType === "multi brand store") {
      stores = stores.filter((s) => s.multibrandstore === true);
    } else if (storeType === "executive" || storeType === "executive store") {
      stores = stores.filter((s) => s.multibrandstore !== true);
    }

    return NextResponse.json({ success: true, data: stores }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stores" },
      { status: 500 }
    );
  }
}
