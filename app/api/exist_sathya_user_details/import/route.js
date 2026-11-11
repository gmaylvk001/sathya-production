import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import ExistSathyaUserDetail, {
  EXIST_SATHYA_USER_DETAIL_FIELDS,
  EXIST_SATHYA_USER_DETAIL_NUMBER_FIELDS,
} from "@/models/ExistSathyaUserDetail";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DATE_FIELDS = new Set(["created_at", "updated_at"]);

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(Math.round((n - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") return excelSerialToDate(value);
  const text = String(value).trim().replace("T", " ");
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToDate(text);
  const normalized = text.includes(" ") && !text.includes("T") ? text.replace(" ", "T") : text;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseExistId(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  const text = String(value).trim();
  return text === "" ? null : text;
}

function stringifyValue(value) {
  const cleaned = emptyToNull(value);
  if (cleaned === null) return null;
  if (typeof cleaned === "object") return JSON.stringify(cleaned);
  return String(cleaned).trim();
}

function parseNumberValue(value) {
  const cleaned = emptyToNull(value);
  if (cleaned === null) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function getCell(row, headerMap, keys) {
  for (const key of keys) {
    const match = headerMap[key];
    if (match !== undefined && row[match] !== undefined && row[match] !== null && row[match] !== "") {
      return row[match];
    }
  }
  return "";
}

function buildHeaderMap(row) {
  const map = {};
  for (const header of Object.keys(row || {})) {
    map[String(header).toLowerCase().trim().replace(/\s+/g, "_")] = header;
  }
  return map;
}

function fieldAliases(field) {
  if (field === "exist_id") return ["exist_id", "id"];
  if (field === "user_id") return ["user_id"];
  if (field === "phonenumber") return ["phonenumber", "phone_number", "phone"];
  if (field === "altnumber") return ["altnumber", "alt_number", "alternate_number"];
  return [field.toLowerCase()];
}

function mapRowToDetail(row) {
  const headerMap = buildHeaderMap(row);
  const now = new Date();
  const detail = {};
  detail.exist_id = parseExistId(getCell(row, headerMap, ["exist_id", "id"]));

  for (const field of EXIST_SATHYA_USER_DETAIL_FIELDS) {
    if (field === "exist_id") continue;
    const raw = getCell(row, headerMap, fieldAliases(field));

    if (DATE_FIELDS.has(field)) {
      detail[field] = parseDateValue(raw) || now;
      continue;
    }
    if (field === "user_id") {
      detail[field] = parseExistId(raw);
      continue;
    }
    if (EXIST_SATHYA_USER_DETAIL_NUMBER_FIELDS.has(field)) {
      detail[field] = parseNumberValue(raw);
      continue;
    }
    detail[field] = stringifyValue(raw);
  }

  return detail;
}

function parseJsonRows(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch {
    // Fall through
  }

  try {
    const wrapped = `[${trimmed.replace(/,\s*$/, "")}]`;
    const parsed = JSON.parse(wrapped);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
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

    const existing = await ExistSathyaUserDetail.find({}, { exist_id: 1 }).lean();
    const existingIds = new Set(existing.map((item) => String(item.exist_id || "").trim()).filter(Boolean));
    const idsInFile = new Set();
    const toInsert = [];

    for (let index = 0; index < rows.length; index++) {
      const excelRow = index + 2;
      const detail = mapRowToDetail(rows[index] || {});
      const existId = detail.exist_id;

      if (!existId && !detail.user_id && !detail.username && !detail.phonenumber && !detail.address) {
        skippedCount += 1;
        if (errors.length < 50) {
          errors.push({ row: excelRow, error: "Empty row" });
        }
        continue;
      }

      if (existId && (existingIds.has(existId) || idsInFile.has(existId))) {
        skippedCount += 1;
        skippedExistingCount += 1;
        if (skippedRows.length < 50) {
          skippedRows.push({
            row: excelRow,
            exist_id: existId,
            user_id: detail.user_id,
          });
        }
        continue;
      }

      if (existId) idsInFile.add(existId);
      toInsert.push(detail);
    }

    const batchSize = 250;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      try {
        const inserted = await ExistSathyaUserDetail.insertMany(batch, { ordered: false });
        addedCount += inserted.length;
      } catch (error) {
        const writeErrors = error.writeErrors || error.result?.getWriteErrors?.() || [];
        const failedCount = writeErrors.length || 0;
        const insertedCount = error.result?.insertedCount
          ?? error.insertedDocs?.length
          ?? Math.max(0, batch.length - failedCount);
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
    console.error("Exist sathya user details import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
