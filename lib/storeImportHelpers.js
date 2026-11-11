/**
 * Shared helpers for store_zones / store_listings Excel/CSV/JSON import.
 */

export function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

export function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(Math.round((n - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateValue(value) {
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

export function parseExistId(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function stringifyValue(value) {
  const cleaned = emptyToNull(value);
  if (cleaned === null) return null;
  if (typeof cleaned === "object") return JSON.stringify(cleaned);
  return String(cleaned).trim();
}

export function parseNumberValue(value, fallback = null) {
  const cleaned = emptyToNull(value);
  if (cleaned === null) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export function buildHeaderMap(row) {
  const map = {};
  for (const header of Object.keys(row || {})) {
    map[String(header).toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_")] = header;
  }
  return map;
}

export function getCell(row, headerMap, keys) {
  for (const key of keys) {
    const match = headerMap[key];
    if (match !== undefined && row[match] !== undefined && row[match] !== null && row[match] !== "") {
      return row[match];
    }
  }
  return "";
}

export function parseJsonRows(text) {
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

export function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
