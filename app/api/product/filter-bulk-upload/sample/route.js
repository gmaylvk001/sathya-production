import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const SAMPLES = {
  "filter-groups": {
    filename: "filter_groups_bulk_upload_sample.xlsx",
    headers: ["id", "filter_grp_name", "sort_order", "slug"],
    rows: [{ id: "1", filter_grp_name: "Brand", sort_order: 1, slug: "brand" }],
  },
  filters: {
    filename: "filters_bulk_upload_sample.xlsx",
    headers: ["id", "filter_group_id", "filter_name", "slug"],
    rows: [{ id: "1", filter_group_id: "1", filter_name: "Samsung", slug: "samsung" }],
  },
  "product-filters": {
    filename: "product_filters_bulk_upload_sample.xlsx",
    headers: ["id", "product_id", "filter_id"],
    rows: [{ id: "1", product_id: "PRODUCT_ID_OR_ITEM_CODE", filter_id: "1" }],
  },
  products: {
    filename: "products_bulk_upload_sample.xlsx",
    headers: ["id", "item_code", "product_type"],
    rows: [
      { id: "1", item_code: "ITEM001", product_type: "Electronics" },
      { id: "2", item_code: "ITEM002", product_type: "" },
    ],
  },
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const sample = SAMPLES[type];
    if (!sample) {
      return NextResponse.json(
        { error: "Invalid type. Use filter-groups, filters, product-filters, or products." },
        { status: 400 }
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(sample.rows, { header: sample.headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${sample.filename}"`,
      },
    });
  } catch (error) {
    console.error("Sample download error:", error);
    return NextResponse.json({ error: "Failed to generate sample file" }, { status: 500 });
  }
}
