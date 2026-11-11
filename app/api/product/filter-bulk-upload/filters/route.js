import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import SathyaFilter from "@/models/sathya_filters";
import { cell, makeSlug, normalizeRows } from "../_helpers";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("excel");

    if (!file) {
      return NextResponse.json({ error: "Excel or CSV file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const rows = normalizeRows(rawRows);

    if (!rows.length) {
      return NextResponse.json({ error: "No data found in file." }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      detected_headers: Object.keys(rows[0] || {}),
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const id = cell(row, "id");
        const filter_group_id = cell(row, "filter_group_id", "filter_grp_id");
        const filter_name = cell(row, "filter_name");
        const slugRaw = cell(row, "slug");

        if (!id) throw new Error("id is required");
        if (!filter_group_id) throw new Error("filter_group_id is required");
        if (!filter_name) throw new Error("filter_name is required");

        const slug = slugRaw || makeSlug(filter_name);
        const existing = await SathyaFilter.findOne({ id });

        if (existing) {
          existing.filter_group_id = filter_group_id;
          existing.filter_name = filter_name;
          existing.slug = slug;
          await existing.save();
          results.updated++;
        } else {
          await SathyaFilter.create({ id, filter_group_id, filter_name, slug });
          results.created++;
        }
      } catch (error) {
        results.failed++;
        if (results.errors.length < 50) {
          results.errors.push({ row: rowNumber, error: error.message, data: row });
        }
      }
    }

    return NextResponse.json({
      message: `Filters: ${results.created} created, ${results.updated} updated, ${results.failed} failed`,
      details: results,
    });
  } catch (error) {
    console.error("Filters bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to process filters bulk upload", details: error.message },
      { status: 500 }
    );
  }
}
