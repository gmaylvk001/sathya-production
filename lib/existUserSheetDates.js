import * as XLSX from "xlsx";
import { formatExistDateYmd } from "@/lib/existSheetDateFormat";

export { formatExistDateYmd };

const DEFAULT_DATE_FIELDS = ["created_at", "updated_at", "logged_in", "created", "updated"];

function normalizeHeader(name) {
  return String(name || "").toLowerCase().trim().replace(/[\s\-]+/g, "_");
}

function compactHeader(name) {
  return normalizeHeader(name).replace(/_/g, "");
}

function isDateHeader(header, dateFields) {
  const compact = compactHeader(header);
  const fields = Array.from(dateFields);
  if (fields.some((field) => compactHeader(field) === compact)) return true;
  return compact === "created" || compact === "updated" || compact === "createdon" || compact === "updatedon";
}

function normalizeYear(year) {
  if (year < 100) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

function applyAmPm(hour, ampm) {
  if (!ampm) return hour;
  const tag = String(ampm).toLowerCase();
  if (tag.startsWith("p") && hour < 12) return hour + 12;
  if (tag.startsWith("a") && hour === 12) return 0;
  return hour;
}

function dateFromYearMonthDay(year, month, day, hour = 0, minute = 0, second = 0) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const utc = new Date(Math.round((n - 25569) * 86400 * 1000));
  if (Number.isNaN(utc.getTime())) return null;
  return dateFromYearMonthDay(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds()
  );
}

function dateFromDateObject(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return dateFromYearMonthDay(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds()
  );
}

function parseDateText(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return excelSerialToDate(value);
  if (value instanceof Date) return dateFromDateObject(value);

  const text = String(value).trim().replace("T", " ").replace(/\s+/g, " ");
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToDate(Number(text));

  const timePart =
    "(?:[,\\s]+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?(?:\\s*([AaPp][Mm]?))?)?$";

  // 2026-09-10 17:23  (year-month-day)
  let match = text.match(new RegExp(`^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})${timePart}`));
  if (match) {
    return dateFromYearMonthDay(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      applyAmPm(Number(match[4] || 0), match[7]),
      Number(match[5] || 0),
      Number(match[6] || 0)
    );
  }

  // 10-09-2026 17:23  (day-month-year) — Indian sheet format
  match = text.match(new RegExp(`^(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{2,4})${timePart}`));
  if (match) {
    return dateFromYearMonthDay(
      normalizeYear(Number(match[3])),
      Number(match[2]),
      Number(match[1]),
      applyAmPm(Number(match[4] || 0), match[7]),
      Number(match[5] || 0),
      Number(match[6] || 0)
    );
  }

  return null;
}

function isIndianDayMonthText(value) {
  const text = String(value || "").trim().replace("T", " ").replace(/\s+/g, " ");
  return /^\d{1,2}-\d{1,2}-\d{2,4}(?:[,\s]+\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AaPp][Mm]?)?)?$/.test(text);
}

/**
 * Sheet: 10-09-2026 17:23 (day-month-year)
 * DB Date: 2026-09-10T17:23:00.000Z
 *
 * Prefer dashed Indian text (DD-MM-YYYY) over Excel serial / US m/d/yyyy display.
 */
export function parseExistUserSheetDate(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "object" && !(value instanceof Date) && ("w" in value || "v" in value)) {
    const textCandidates = [value.v, value.w].filter((item) => typeof item === "string" && item.trim());
    const indianText = textCandidates.find((item) => isIndianDayMonthText(item));
    if (indianText) {
      const parsed = parseDateText(indianText);
      if (parsed) return parsed;
    }

    const cellType = String(value.t || "").toLowerCase();
    if (cellType === "s" || cellType === "str") {
      const fromText = parseDateText(value.v) || parseDateText(value.w);
      if (fromText) return fromText;
    }

    if (typeof value.v === "number") return excelSerialToDate(value.v);
    if (value.v instanceof Date) return dateFromDateObject(value.v);

    for (const item of textCandidates) {
      const parsed = parseDateText(item);
      if (parsed) return parsed;
    }
    return null;
  }

  return parseDateText(value);
}

export function readExistUserSheetRows(buffer, isCsv, dateFields = DEFAULT_DATE_FIELDS) {
  const workbook = isCsv
    ? XLSX.read(buffer.toString("utf-8"), { type: "string", cellDates: false })
    : XLSX.read(buffer, { type: "buffer", cellDates: false });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { error: "File has no sheets" };

  const sheet = workbook.Sheets[sheetName];
  const ref = sheet["!ref"];
  if (!ref) return { rows: [] };

  const range = XLSX.utils.decode_range(ref);
  const headers = [];
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    headers[col] = cell ? String(cell.w || cell.v || "").trim() : "";
  }

  const rows = [];
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    const row = {};
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const header = headers[col];
      if (!header) continue;
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: col })];
      if (!cell) {
        row[header] = "";
        continue;
      }
      if (isDateHeader(header, dateFields)) {
        row[header] = {
          w: cell.w != null ? String(cell.w).trim() : "",
          v: cell.v,
          t: cell.t || "",
        };
      } else {
        row[header] = cell.v != null && cell.v !== "" ? cell.v : (cell.w || "");
      }
    }
    rows.push(row);
  }

  return { rows };
}
