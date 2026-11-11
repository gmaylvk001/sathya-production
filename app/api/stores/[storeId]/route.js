import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Store from "@/models/store";
import { attachFeaturedProductsToStores } from "@/lib/storesWithFeaturedProducts";

/**
 * Particular store API for sending data to another site.
 * Lookup by location_id only.
 * Example: /api/stores/LOC001
 */
export async function GET(request, context) {
  const { storeId } = await context.params;
  const locationId = String(storeId || "").trim();

  if (!locationId) {
    return NextResponse.json(
      { success: false, error: "Location ID is required." },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    const store = await Store.findOne({ location_id: locationId }).lean();

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 }
      );
    }

    const [data] = await attachFeaturedProductsToStores([store]);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch store" },
      { status: 500 }
    );
  }
}
