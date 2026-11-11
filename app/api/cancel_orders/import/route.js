import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import { verifyToken } from "@/lib/verifyToken";
import CancelOrders from "@/models/cancel_orders";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_LEN = { order_number: 45, order_id: 45, customer_id: 45, order_status: 255, reason: 255 };

function toText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  return String(value).trim();
}

function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(Math.round((n - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Accepts Excel dates/serials, "DD-MM-YYYY HH:mm[:ss]", "DD/MM/YYYY ..." and "YYYY-MM-DD HH:mm:ss"
function parseDateValue(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return excelSerialToDate(value);

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToDate(text);

  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmy) {
    const [, d, m, y, hh = "0", mi = "0", ss = "0"] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text.includes(" ") && !text.includes("T") ? text.replace(" ", "T") : text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildHeaderMap(row) {
  const map = {};
  for (const header of Object.keys(row || {})) {
    map[String(header).toLowerCase().trim().replace(/\s+/g, "_")] = header;
  }
  return map;
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

function mapRow(row) {
  const headerMap = buildHeaderMap(row);
  const now = new Date();
  const comments = toText(getCell(row, headerMap, ["comments", "comment"]));
  const createdAt = parseDateValue(getCell(row, headerMap, ["created_at"])) || now;
  const updatedAt = parseDateValue(getCell(row, headerMap, ["updated_at"])) || createdAt;

  return {
    exist_id: toText(getCell(row, headerMap, ["exist_id", "id"])) || null,
    order_number: toText(getCell(row, headerMap, ["order_number"])),
    order_id: toText(getCell(row, headerMap, ["order_id"])),
    customer_id: toText(getCell(row, headerMap, ["customer_id"])),
    order_status: toText(getCell(row, headerMap, ["order_status"])),
    reason: toText(getCell(row, headerMap, ["reason"])),
    comments: comments || null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function validateRow(doc) {
  const missing = ["order_number", "order_id", "customer_id", "order_status"].filter((f) => !doc[f]);
  if (missing.length) return `Missing ${missing.join(", ")}`;
  for (const [field, max] of Object.entries(MAX_LEN)) {
    if (doc[field] && doc[field].length > max) return `${field} longer than ${max} characters`;
  }
  return null;
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let decoded = null;
    try {
      decoded = token ? verifyToken(token) : null;
    } catch {
      decoded = null;
    }
    if (!decoded) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("excel");
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = (file.name || "").toLowerCase();
    const isCsv = fileName.endsWith(".csv");
    const isXlsx = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    if (!isCsv && !isXlsx) {
      return NextResponse.json({ error: "Only .xlsx, .xls and .csv files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // CSV is read raw so "01-06-2026" stays a DD-MM-YYYY string instead of being guessed as MM-DD
    const workbook = isCsv
      ? XLSX.read(buffer.toString("utf-8"), { type: "string", raw: true })
      : XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "File has no sheets" }, { status: 400 });
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    if (!rows.length) {
      return NextResponse.json({ error: "File has no data rows" }, { status: 400 });
    }

    const existing = await CancelOrders.find(
      { exist_id: { $type: "string" } },
      { exist_id: 1 }
    ).lean();
    const existingIds = new Set(existing.map((r) => r.exist_id));
    const idsInFile = new Set();

    const toInsert = [];
    const skippedRows = [];
    const errors = [];
    let skippedExistingCount = 0;
    let invalidCount = 0;

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const doc = mapRow(row || {});

      const error = validateRow(doc);
      if (error) {
        invalidCount += 1;
        if (errors.length < 50) errors.push({ row: excelRow, error });
        return;
      }

      if (doc.exist_id && (existingIds.has(doc.exist_id) || idsInFile.has(doc.exist_id))) {
        skippedExistingCount += 1;
        if (skippedRows.length < 50) {
          skippedRows.push({ row: excelRow, exist_id: doc.exist_id, order_number: doc.order_number });
        }
        return;
      }

      if (doc.exist_id) idsInFile.add(doc.exist_id);
      else delete doc.exist_id;
      toInsert.push(doc);
    });

    // Native insert keeps the exist created_at / updated_at (Mongoose timestamps would overwrite them)
    let addedCount = 0;
    const batchSize = 500;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      try {
        const result = await CancelOrders.collection.insertMany(batch, { ordered: false });
        addedCount += result.insertedCount;
      } catch (error) {
        const inserted = error.result?.insertedCount ?? error.insertedCount ?? 0;
        const failed = batch.length - inserted;
        addedCount += inserted;
        skippedExistingCount += failed;
        if (errors.length < 50) errors.push({ row: "-", error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Added ${addedCount}, skipped existing ${skippedExistingCount}, invalid ${invalidCount}.`,
      totalRows: rows.length,
      addedCount,
      skippedExistingCount,
      invalidCount,
      skippedRows,
      errors,
    });
  } catch (error) {
    console.error("cancel_orders import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
