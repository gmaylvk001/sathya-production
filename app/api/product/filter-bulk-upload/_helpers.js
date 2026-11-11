export const makeSlug = (text = "") =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Normalize Excel header keys: trim, lowercase, spaces/dashes -> underscore */
export const normalizeRows = (rows = []) =>
  rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      const normalized = String(key)
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
        .replace(/[\s\-]+/g, "_");
      out[normalized] = value;
    }
    return out;
  });

/** Read cell; convert Excel numbers cleanly (1 not 1.0) */
export const cell = (row, ...keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || String(value).trim() === "") continue;

    if (typeof value === "number") {
      return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, "");
    }

    const text = String(value).trim();
    if (/^\d+\.0+$/.test(text)) return text.replace(/\.0+$/, "");
    return text;
  }
  return "";
};
