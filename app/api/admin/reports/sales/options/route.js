import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StoreListing from "@/models/store_listings";
import StoreZone from "@/models/store_zones";
import Category from "@/models/ecom_category_info";
import { getAdminUserId } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = [
  "Billed",
  "Cancelled",
  "Complete",
  "failure",
  "Order Accepted",
  "Order Placed",
  "ordered",
  "Payment Initiated",
  "pending",
];

function isMainCategory(category) {
  const parent = String(category?.parentid ?? "").trim().toLowerCase();
  return !parent || parent === "none" || parent === "null";
}

function zoneCodeValue(existId) {
  const number = Number(String(existId ?? "").trim());
  return Number.isFinite(number) ? String(number) : "";
}

export async function GET(req) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    await dbConnect();

    const [zones, stores, categories] = await Promise.all([
      StoreZone.find({}).select("exist_id zonename slug").lean(),
      StoreListing.find({ store_owner: "sathya" })
        .select("title branch_code zone_code")
        .lean(),
      Category.find({ status: "Active" }).select("category_name parentid").lean(),
    ]);

    const zoneOptions = zones
      .map((zone) => {
        const zoneCode = zoneCodeValue(zone.exist_id);
        return {
          value: String(zone.exist_id || zone._id),
          label: zone.zonename || zone.slug || "Zone",
          zoneCode,
        };
      })
      .filter((zone) => zone.label && zone.zoneCode)
      .sort((a, b) => a.label.localeCompare(b.label));

    const storeOptions = stores
      .map((store) => {
        const branch = String(store.branch_code || "").trim();
        const title = String(store.title || "").trim() || "Store";
        return {
          value: String(store._id),
          label: branch ? `${title} (${branch})` : title,
          zoneCode: store.zone_code == null ? "" : String(store.zone_code),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const categoryOptions = categories
      .filter(isMainCategory)
      .map((category) => ({
        value: String(category._id),
        label: category.category_name || "Category",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      success: true,
      zones: zoneOptions,
      stores: storeOptions,
      statuses: ORDER_STATUSES.map((status) => ({ value: status, label: status })),
      paymentMethods: [
        { value: "online", label: "Online" },
        { value: "Cash on Delivery", label: "Cash on Delivery" },
      ],
      categories: categoryOptions,
    });
  } catch (error) {
    console.error("Sales report options error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load sales filters" },
      { status: 500 }
    );
  }
}
