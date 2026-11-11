import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { parseExistUserSheetDate, readExistUserSheetRows } from "@/lib/existUserSheetDates";
import ExistSathyaOrder, { EXIST_SATHYA_ORDER_FIELDS } from "@/models/ExistSathyaOrder";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DATE_FIELDS = new Set(["created_at", "updated_at", "offline_order_date"]);
const MIXED_FIELDS = new Set(["schema_request", "bajaj_do_checkout"]);

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

function getCell(row, headerMap, keys) {
  for (const key of keys) {
    const match = headerMap[key] || headerMap[compactKey(key)];
    if (match !== undefined && row[match] !== undefined && row[match] !== null && row[match] !== "") {
      return row[match];
    }
  }
  return "";
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

function mapRowToOrder(row) {
  const headerMap = buildHeaderMap(row);
  const order = {};
  const existId = parseExistId(getCell(row, headerMap, ["exist_id", "id"]));
  order.exist_id = existId;

  for (const field of EXIST_SATHYA_ORDER_FIELDS) {
    if (field === "exist_id") continue;
    let aliases = [field];
    if (field === "referrel_url") aliases = ["referrel_url", "referral_url"];
    if (field === "created_at") aliases = ["created_at", "createdat", "created", "created_on", "created-at"];
    if (field === "updated_at") aliases = ["updated_at", "updatedat", "updated", "updated_on", "updated-at"];
    if (field === "offline_order_date") aliases = ["offline_order_date", "offlineorderdate"];
    const raw = getCell(row, headerMap, aliases);

    if (DATE_FIELDS.has(field)) {
      order[field] = parseDateValue(raw);
      continue;
    }
    if (MIXED_FIELDS.has(field)) {
      const mixed = emptyToNull(raw);
      if (mixed === null) {
        order[field] = null;
      } else if (typeof mixed === "object") {
        order[field] = mixed;
      } else {
        const text = String(mixed).trim();
        try {
          order[field] = JSON.parse(text);
        } catch {
          order[field] = text === "" ? null : text;
        }
      }
      continue;
    }
    order[field] = stringifyValue(raw);
  }

  return order;
}

function parseJsonOrders(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch {
    // Fall through to loose SQL-export style objects.
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
      rows = parseJsonOrders(buffer.toString("utf-8"));
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
    const skippedOrders = [];

    const existing = await ExistSathyaOrder.find({}, { exist_id: 1, order_number: 1 }).lean();
    const existingIds = new Set(existing.map((item) => String(item.exist_id || "").trim()).filter(Boolean));
    const existingNumbers = new Set(existing.map((item) => String(item.order_number || "").trim()).filter(Boolean));
    const idsInFile = new Set();
    const numbersInFile = new Set();
    const toInsert = [];
    const dateUpdates = [];
    let datesUpdatedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const excelRow = index + 2;
      const order = mapRowToOrder(rows[index] || {});
      const existId = order.exist_id;
      const orderNumber = order.order_number;

      if (!existId && !orderNumber && !order.order_username && !order.order_phonenumber) {
        skippedCount += 1;
        if (errors.length < 50) {
          errors.push({ row: excelRow, error: "Empty row" });
        }
        continue;
      }

      const duplicateId = existId && (existingIds.has(existId) || idsInFile.has(existId));
      const duplicateNumber = orderNumber && (existingNumbers.has(orderNumber) || numbersInFile.has(orderNumber));

      if (duplicateId || duplicateNumber) {
        const dateUpdate = {};
        for (const field of DATE_FIELDS) {
          if (order[field] instanceof Date) dateUpdate[field] = order[field];
        }
        if (Object.keys(dateUpdate).length) {
          const idVariants = existId
            ? [existId, /^\d+$/.test(existId) ? Number(existId) : null].filter((item) => item !== null && item !== "")
            : [];
          dateUpdates.push({
            updateOne: {
              filter: existId
                ? { exist_id: { $in: idVariants } }
                : { order_number: orderNumber },
              update: { $set: dateUpdate },
            },
          });
        }
        skippedCount += 1;
        skippedExistingCount += 1;
        if (skippedOrders.length < 50) {
          skippedOrders.push({
            row: excelRow,
            exist_id: existId,
            order_number: orderNumber,
          });
        }
        continue;
      }

      if (existId) idsInFile.add(existId);
      if (orderNumber) numbersInFile.add(orderNumber);
      toInsert.push(order);
    }

    if (dateUpdates.length) {
      const result = await ExistSathyaOrder.bulkWrite(dateUpdates, { ordered: false });
      datesUpdatedCount = result.modifiedCount || 0;
    }

    const batchSize = 250;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      try {
        const inserted = await ExistSathyaOrder.insertMany(batch, { ordered: false });
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
      skippedOrders,
      errors,
    });
  } catch (error) {
    console.error("Exist sathya orders import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
