import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import StoreZone, { STORE_ZONE_FIELDS, STORE_ZONE_NUMBER_FIELDS } from "@/models/store_zones";
import {
  buildHeaderMap,
  getCell,
  parseDateValue,
  parseExistId,
  parseJsonRows,
  parseNumberValue,
  slugify,
  stringifyValue,
} from "@/lib/storeImportHelpers";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DATE_FIELDS = new Set(["created_at", "updated_at"]);

function mapRowToZone(row) {
  const headerMap = buildHeaderMap(row);
  const now = new Date();
  const zone = {};
  zone.exist_id = parseExistId(getCell(row, headerMap, ["exist_id", "id"]));

  for (const field of STORE_ZONE_FIELDS) {
    if (field === "exist_id") continue;
    const raw = getCell(row, headerMap, [field]);

    if (DATE_FIELDS.has(field)) {
      zone[field] = parseDateValue(raw) || now;
      continue;
    }
    if (STORE_ZONE_NUMBER_FIELDS.has(field)) {
      zone[field] = parseNumberValue(raw, 0);
      continue;
    }
    zone[field] = stringifyValue(raw);
  }

  if (!zone.slug && zone.zonename) {
    zone.slug = slugify(zone.zonename);
  }
  if (zone.status == null) zone.status = 0;

  return zone;
}

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("excel") || formData.get("file") || formData.get("json");
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = (file.name || "").toLowerCase();
    const isJson = fileName.endsWith(".json");
    const isCsv = fileName.endsWith(".csv");
    const isXlsx = fileName.endsWith(".xlsx");
    if (!isJson && !isCsv && !isXlsx) {
      return NextResponse.json({ error: "Only .xlsx, .csv and .json files are allowed" }, { status: 400 });
    }

    let rows = [];
    const buffer = Buffer.from(await file.arrayBuffer());
    if (isJson) {
      rows = parseJsonRows(buffer.toString("utf-8"));
      if (!rows) {
        return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
      }
    } else {
      const workbook = isCsv
        ? XLSX.read(buffer.toString("utf-8"), { type: "string", cellDates: true })
        : XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ error: "File has no sheets" }, { status: 400 });
      }
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    }

    if (!rows.length) {
      return NextResponse.json({ error: "File has no data rows" }, { status: 400 });
    }

    let addedCount = 0;
    let skippedCount = 0;
    let skippedExistingCount = 0;
    const errors = [];
    const skippedRows = [];

    const existing = await StoreZone.find({}, { exist_id: 1 }).lean();
    const existingIds = new Set(existing.map((item) => String(item.exist_id || "").trim()).filter(Boolean));
    const idsInFile = new Set();
    const toInsert = [];

    for (let index = 0; index < rows.length; index++) {
      const excelRow = index + 2;
      const zone = mapRowToZone(rows[index] || {});
      const existId = zone.exist_id;

      if (!existId && !zone.zonename && !zone.slug) {
        skippedCount += 1;
        if (errors.length < 50) errors.push({ row: excelRow, error: "Empty row" });
        continue;
      }

      if (!zone.slug) {
        skippedCount += 1;
        if (errors.length < 50) errors.push({ row: excelRow, error: "Slug is required" });
        continue;
      }

      if (existId && (existingIds.has(existId) || idsInFile.has(existId))) {
        skippedCount += 1;
        skippedExistingCount += 1;
        if (skippedRows.length < 50) {
          skippedRows.push({ row: excelRow, exist_id: existId, zonename: zone.zonename });
        }
        continue;
      }

      if (existId) idsInFile.add(existId);
      toInsert.push(zone);
    }

    const batchSize = 250;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      try {
        const inserted = await StoreZone.insertMany(batch, { ordered: false });
        addedCount += inserted.length;
      } catch (error) {
        const writeErrors = error.writeErrors || error.result?.getWriteErrors?.() || [];
        const failedCount = writeErrors.length || 0;
        const insertedCount =
          error.result?.insertedCount ?? error.insertedDocs?.length ?? Math.max(0, batch.length - failedCount);
        addedCount += insertedCount;
        skippedCount += failedCount;
        skippedExistingCount += failedCount;
        if (failedCount === 0 && error.message) {
          errors.push({ row: i + 2, error: error.message });
          skippedCount += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Added ${addedCount}, skipped existing ${skippedExistingCount}, other skipped ${skippedCount - skippedExistingCount}.`,
      addedCount,
      skippedCount,
      skippedExistingCount,
      skippedRows,
      errors,
    });
  } catch (error) {
    console.error("Store zones import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
