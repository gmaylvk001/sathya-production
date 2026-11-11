import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import SathyaFilterGroup from "@/models/sathya_filter_groups";
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
        const filter_grp_name = cell(row, "filter_grp_name");
        const slugRaw = cell(row, "slug");
        const sortRaw = cell(row, "sort_order");

        if (!id) throw new Error("id is required");
        if (!filter_grp_name) throw new Error("filter_grp_name is required");

        const slug = slugRaw || makeSlug(filter_grp_name);
        const sort_order = sortRaw !== "" && !Number.isNaN(Number(sortRaw)) ? Number(sortRaw) : 0;

        const existing = await SathyaFilterGroup.findOne({ id });

        if (existing) {
          existing.filter_grp_name = filter_grp_name;
          existing.slug = slug;
          existing.sort_order = sort_order;
          await existing.save();
          results.updated++;
        } else {
          await SathyaFilterGroup.create({ id, filter_grp_name, sort_order, slug });
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
      message: `Filter Groups: ${results.created} created, ${results.updated} updated, ${results.failed} failed`,
      details: results,
    });
  } catch (error) {
    console.error("Filter group bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to process filter group bulk upload", details: error.message },
      { status: 500 }
    );
  }
}
