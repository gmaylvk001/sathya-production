import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import { requireAdmin } from "@/lib/adminRequest";
import { normalizeRegion } from "@/lib/regionHelper";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/admin/owner-product/export
 * Query: search (optional), region (optional; omit or "all" = every region)
 * Excel of Unilet OwnerProduct rows — includes import-friendly columns first.
 */
export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const reqRegion = searchParams.get("region") || searchParams.get("state") || "";

    const listQuery = { owner_id: "unilet" };
    if (reqRegion && reqRegion !== "all") {
      listQuery.region = normalizeRegion(reqRegion);
    }

    let list = await OwnerProduct.find(listQuery)
      .populate("product_id", "name slug price special_price quantity item_code")
      .sort({ updatedAt: -1 })
      .lean();

    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const pName = (item.product_id?.name || item.vendor_product_name || "").toLowerCase();
        const pItemCode = (item.product_item_code || item.product_id?.item_code || "").toLowerCase();
        const vItemCode = (item.vendor_item_code || "").toLowerCase();
        const prodId = (item.product_id?._id?.toString() || "").toLowerCase();
        return (
          pName.includes(s) ||
          pItemCode.includes(s) ||
          vItemCode.includes(s) ||
          prodId.includes(s)
        );
      });
    }

    const rows = list.map((item, index) => {
      const parent = item.product_id || {};
      const referenceCode = item.product_item_code || parent.item_code || "";
      const vendorCode =
        item.vendor_item_code || (referenceCode ? `${referenceCode}_U` : "");
      const stock = item.stock ?? parent.quantity ?? 0;
      const stockStatus =
        item.stock_status || (Number(stock) > 0 ? "In Stock" : "Out of Stock");

      return {
        // Import-compatible columns (same names as import sample)
        reference_item_code: referenceCode,
        vendor_item_code: vendorCode,
        stock: Number(stock) || 0,
        stock_status: stockStatus,
        // Extra admin columns from the Unilet Products table
        id: index + 1,
        product_mongo_id: parent._id ? String(parent._id) : "",
        title: parent.name || item.vendor_product_name || "",
        price: item.price ?? parent.price ?? 0,
        offer_price: item.offer_price ?? 0,
        is_active: item.is_active !== false ? "Active" : "Inactive",
        delivery_days: item.delivery_days ?? 1,
        region: item.region || "karnataka",
        movement: item.movement || "",
        owner_product_id: item._id ? String(item._id) : "",
        updated_at: item.updatedAt
          ? new Date(item.updatedAt).toISOString()
          : "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(
      rows.length
        ? rows
        : [
            {
              reference_item_code: "",
              vendor_item_code: "",
              stock: "",
              stock_status: "",
              id: "",
              product_mongo_id: "",
              title: "",
              price: "",
              offer_price: "",
              is_active: "",
              delivery_days: "",
              region: "",
              movement: "",
              owner_product_id: "",
              updated_at: "",
            },
          ]
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unilet Products");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `unilet_products_export_${dateStamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Cache-Control": "no-store",
        "X-Export-Count": String(rows.length),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/owner-product/export error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Export failed" },
      { status: 500 }
    );
  }
}
