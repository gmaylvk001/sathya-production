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

function clockFromSerial(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  let fraction = n - Math.floor(n);
  if (fraction < 0) fraction += 1;
  let totalSeconds = Math.round(fraction * 86400);
  if (totalSeconds >= 86400) totalSeconds = 0;
  return {
    hour: Math.floor(totalSeconds / 3600),
    minute: Math.floor((totalSeconds % 3600) / 60),
    second: totalSeconds % 60,
  };
}

function textHasClock(value) {
  return /\d{1,2}:\d{1,2}/.test(String(value || ""));
}

function textHasSeconds(value) {
  return /\d{1,2}:\d{1,2}:\d{1,2}/.test(String(value || ""));
}

function formatShowsSeconds(format) {
  const stripped = String(format || "").replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
  return /s/i.test(stripped);
}

function applySheetClock(date, serial, formatText, sourceText) {
  if (!(date instanceof Date)) return date;
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let day = date.getUTCDate();
  let hour = date.getUTCHours();
  let minute = date.getUTCMinutes();
  let second = date.getUTCSeconds();

  // SheetJS prints an Excel date with a US month-day format, so 12-09-2026
  // (12 September) can arrive as 9/12/26. That text is only the serial's
  // month and day swapped. Keep the serial date, which is the day-month-year
  // value shown on the sheet.
  if (typeof serial === "number") {
    const fromSerial = excelSerialToDate(serial);
    if (
      fromSerial &&
      fromSerial.getUTCFullYear() === year &&
      day === fromSerial.getUTCMonth() + 1 &&
      month === fromSerial.getUTCDate() &&
      day !== fromSerial.getUTCDate()
    ) {
      year = fromSerial.getUTCFullYear();
      month = fromSerial.getUTCMonth() + 1;
      day = fromSerial.getUTCDate();
      if (!textHasClock(sourceText)) {
        hour = fromSerial.getUTCHours();
        minute = fromSerial.getUTCMinutes();
        second = fromSerial.getUTCSeconds();
      }
    }
  }

  if (!textHasClock(sourceText) && typeof serial === "number") {
    const clock = clockFromSerial(serial);
    if (clock) {
      hour = clock.hour;
      minute = clock.minute;
      second = clock.second;
    }
  }

  if (!textHasSeconds(sourceText) && !formatShowsSeconds(formatText)) second = 0;
  return dateFromYearMonthDay(year, month, day, hour, minute, second);
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
  // Excel's "/" in a date format is the locale separator, so SheetJS may
  // return 12/03/2026 or 12/3/26 for a cell that Excel shows as 12-03-2026.
  return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}(?:[,\s]+\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AaPp][Mm]?)?)?$/.test(text);
}

/**
 * Sheet format is day-month-year, 24-hour time.
 * 12-09-2026 23:36 → 2026-09-12T23:36:00.000Z
 * 13-03-2026 19:27 → 2026-03-13T19:27:00.000Z
 *
 * Plain sheet text is read as day-month-year. A numeric Excel cell can be
 * formatted month-day by SheetJS (9/12/26 for 12 September). When that text is
 * only the stored day and month reversed, the stored serial date is kept.
 * Seconds are kept only when the sheet shows them.
 */
export function parseExistUserSheetDate(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "object" && !(value instanceof Date) && ("w" in value || "v" in value)) {
    const serial = typeof value.v === "number" ? value.v : null;
    const textCandidates = [value.w, value.v].filter((item) => typeof item === "string" && item.trim());
    const indianText = textCandidates.find((item) => isIndianDayMonthText(item));
    if (indianText) {
      const parsed = parseDateText(indianText);
      if (parsed) return applySheetClock(parsed, serial, value.z, indianText);
    }

    const cellType = String(value.t || "").toLowerCase();
    if (cellType === "s" || cellType === "str") {
      const fromText = parseDateText(value.v) || parseDateText(value.w);
      if (fromText) return applySheetClock(fromText, serial, value.z, value.v || value.w);
    }

    if (typeof value.v === "number") return applySheetClock(excelSerialToDate(value.v), value.v, value.z, value.w);
    if (value.v instanceof Date) return dateFromDateObject(value.v);

    for (const item of textCandidates) {
      const parsed = parseDateText(item);
      if (parsed) return applySheetClock(parsed, serial, value.z, item);
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
          z: cell.z != null ? String(cell.z) : "",
        };
      } else {
        row[header] = cell.v != null && cell.v !== "" ? cell.v : (cell.w || "");
      }
    }
    rows.push(row);
  }

  return { rows };
}
