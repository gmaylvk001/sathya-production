import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { formatExistDateYmd, parseExistUserSheetDate, readExistUserSheetRows } from "@/lib/existUserSheetDates";
import PaymentsNew from "@/models/payments_new";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PAYMENT_FIELDS = [
  "user_id",
  "ModeType",
  "PaymentMode",
  "ModeReference",
  "ReferenceDate",
  "status",
  "created_at",
  "updated_at",
  "ModeValue",
  "payment_id",
  "payment_date",
  "pinelab_plural_orderid",
  "pinelab_payment_id",
];

const DATE_FIELDS = new Set(["ReferenceDate", "created_at", "updated_at", "payment_date"]);
const STRING_DATE_FIELDS = new Set(["payment_date"]);

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function parseDateValue(value) {
  return parseExistUserSheetDate(value);
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

function compactKey(name) {
  return String(name || "").toLowerCase().trim().replace(/[\s_\-]/g, "");
}

function buildHeaderMap(row) {
  const map = {};
  for (const header of Object.keys(row || {})) {
    const normalized = String(header).toLowerCase().trim().replace(/[\s\-]+/g, "_");
    map[normalized] = header;
    map[normalized.replace(/_/g, "")] = header;
    map[compactKey(header)] = header;
  }
  return map;
}

function fieldAliases(field) {
  const lower = field.toLowerCase();
  const aliases = [lower, field, compactKey(field)];
  if (field === "ModeType") aliases.push("mode_type");
  if (field === "PaymentMode") aliases.push("payment_mode");
  if (field === "ModeReference") aliases.push("mode_reference");
  if (field === "ReferenceDate") aliases.push("reference_date", "referencedate");
  if (field === "ModeValue") aliases.push("mode_value");
  if (field === "created_at") aliases.push("created", "createdat", "created_on", "created-at");
  if (field === "updated_at") aliases.push("updated", "updatedat", "updated_on", "updated-at");
  if (field === "payment_date") aliases.push("paymentdate", "payment_on");
  return aliases;
}

function getCell(row, headerMap, keys) {
  for (const key of keys) {
    const match = headerMap[String(key).toLowerCase().trim().replace(/\s+/g, "_")]
      || headerMap[compactKey(key)];
    if (match !== undefined && row[match] !== undefined && row[match] !== null && row[match] !== "") {
      return row[match];
    }
  }
  return "";
}

function mapRowToPayment(row) {
  const headerMap = buildHeaderMap(row);
  const payment = {
    exist_id: parseExistId(getCell(row, headerMap, ["exist_id", "id"])),
  };

  for (const field of PAYMENT_FIELDS) {
    const raw = getCell(row, headerMap, fieldAliases(field));
    if (DATE_FIELDS.has(field)) {
      const parsed = parseDateValue(raw);
      payment[field] = STRING_DATE_FIELDS.has(field)
        ? (parsed ? formatExistDateYmd(parsed) : null)
        : parsed;
      continue;
    }
    payment[field] = stringifyValue(raw);
  }

  return payment;
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
      const sheet = readExistUserSheetRows(buffer, isCsv, DATE_FIELDS);
      if (sheet.error) {
        return NextResponse.json({ error: sheet.error }, { status: 400 });
      }
      rows = sheet.rows;
    }

    if (!rows.length) {
      return NextResponse.json({ error: "File has no data rows" }, { status: 400 });
    }

    let addedCount = 0;
    let skippedCount = 0;
    let skippedExistingCount = 0;
    const errors = [];
    const skippedRows = [];

    const existing = await PaymentsNew.find(
      { exist_id: { $type: "string" } },
      { exist_id: 1 }
    ).lean();
    const existingIds = new Set(existing.map((item) => String(item.exist_id || "").trim()).filter(Boolean));
    const idsInFile = new Set();
    const toInsert = [];
    const dateUpdates = [];
    let datesUpdatedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const excelRow = index + 2;
      const payment = mapRowToPayment(rows[index] || {});
      const existId = payment.exist_id;

      if (!existId && !payment.payment_id && !payment.user_id && !payment.ModeValue) {
        skippedCount += 1;
        if (errors.length < 50) {
          errors.push({ row: excelRow, error: "Empty row" });
        }
        continue;
      }

      if (!existId) {
        skippedCount += 1;
        if (errors.length < 50) {
          errors.push({ row: excelRow, error: "exist_id / id is required" });
        }
        continue;
      }

      if (existingIds.has(existId) || idsInFile.has(existId)) {
        const dateUpdate = {};
        for (const field of DATE_FIELDS) {
          if (STRING_DATE_FIELDS.has(field)) {
            if (payment[field]) dateUpdate[field] = payment[field];
          } else if (payment[field] instanceof Date) {
            dateUpdate[field] = payment[field];
          }
        }
        if (Object.keys(dateUpdate).length) {
          const idVariants = [existId, /^\d+$/.test(existId) ? Number(existId) : null].filter(
            (item) => item !== null && item !== ""
          );
          dateUpdates.push({
            updateOne: {
              filter: { exist_id: { $in: idVariants } },
              update: { $set: dateUpdate },
            },
          });
        }
        skippedCount += 1;
        skippedExistingCount += 1;
        if (skippedRows.length < 50) {
          skippedRows.push({
            row: excelRow,
            exist_id: existId,
            payment_id: payment.payment_id,
          });
        }
        continue;
      }

      idsInFile.add(existId);
      toInsert.push(payment);
    }

    if (dateUpdates.length) {
      const result = await PaymentsNew.bulkWrite(dateUpdates, { ordered: false });
      datesUpdatedCount = result.modifiedCount || 0;
    }

    const batchSize = 250;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      try {
        const inserted = await PaymentsNew.insertMany(batch, { ordered: false });
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
      message: `Import completed. Added ${addedCount}, dates updated ${datesUpdatedCount}, skipped existing ${skippedExistingCount}, other skipped ${skippedCount - skippedExistingCount}.`,
      addedCount,
      datesUpdatedCount,
      skippedCount,
      skippedExistingCount,
      skippedRows,
      errors,
    });
  } catch (error) {
    console.error("Exist payments import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
