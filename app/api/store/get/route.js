import connectDB from "@/lib/db";
import StoreListing from "@/models/store_listings";
import { getCanonicalDistrict } from "@/lib/storeDistrictHelper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await connectDB();
  try {
    let stores = await StoreListing.find({}).sort({ created_at: -1, exist_id: -1 }).lean();

    if (!stores || stores.length === 0) {
      try {
        const store = (await import("@/models/store")).default;
        stores = await store.find({}).lean();
      } catch (e) {
        stores = [];
      }
    }

    const mappedStores = (stores || []).map((s) => ({
      ...s,
      name: s.title || s.name || s.organisation_name || s.store_name || "",
      title: s.title || s.organisation_name || s.name || s.store_name || "",
      organisation_name: s.organisation_name || s.title || s.name || "",
      store_name: s.store_name || s.title || s.organisation_name || s.name || "",
      district: getCanonicalDistrict(s),
      city: s.city || getCanonicalDistrict(s),
      status: s.status || "Active",
    }));

    return new Response(JSON.stringify({ success: true, data: mappedStores }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to fetch stores" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}