import * as XLSX from "xlsx";

/**
 * Converts an Excel date serial number or date string to a JavaScript Date object.
 * @param {number|string} val
 * @returns {Date|null}
 */
export function parseExcelDate(val) {
  if (val === undefined || val === null || val === "") return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Check if it's an Excel numeric serial date (e.g. 46121)
  const num = Number(val);
  if (!Number.isNaN(num) && num > 10000 && num < 100000) {
    // 25569 is the difference in days between 1900-01-01 and 1970-01-01
    const utcDays = Math.floor(num - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Otherwise try standard date string parsing
  const parsed = new Date(String(val).trim());
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Normalizes header string to clean alphanumeric key.
 * @param {string} header
 * @returns {string}
 */
function normalizeKey(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FIELD_MAPPINGS = {
  sno: ["sno", "sno", "serial", "serialno", "serialnumber", "id"],
  title: ["title", "offertitle", "cardtitle", "name"],
  category: ["category", "categoryname", "category_name", "maincategory", "cat"],
  description: ["description", "desc", "details"],
  imagePath: ["imagepath", "image", "imagename", "imagefile", "banner", "photo"],
  redirectUrl: ["redirecturl", "url", "link", "producturl", "categoryurl", "targeturl"],
  startDate: ["startdate", "start", "fromdate", "offerstart", "validfrom"],
  endDate: ["enddate", "end", "todate", "offerend", "validto"],
  orderBy: ["orderby", "order", "sortorder", "sequence", "priority"],
  state: ["state", "states", "region", "location"],
  offerName: ["offername", "offer", "campaign", "offertype"],
};

/**
 * Identifies standard field names based on raw Excel headers.
 * @param {Array<string>} headers
 * @returns {Record<string, string>} Mapping from raw header to standard key
 */
function buildHeaderMap(headers) {
  const map = {};
  for (const raw of headers) {
    const clean = normalizeKey(raw);
    let matchedKey = null;

    for (const [standardKey, aliases] of Object.entries(FIELD_MAPPINGS)) {
      if (aliases.includes(clean)) {
        matchedKey = standardKey;
        break;
      }
    }

    if (matchedKey) {
      map[raw] = matchedKey;
    }
  }
  return map;
}

function isCsvUpload(fileName = "", mimeType = "") {
  const name = String(fileName || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();
  if (name.endsWith(".csv")) return true;
  if (mime.includes("text/csv") || mime.includes("application/csv")) return true;
  return false;
}

/**
 * Parses uploaded Excel (.xlsx/.xls) or CSV (.csv) buffer into normalized row items.
 * @param {Buffer} excelBuffer
 * @param {{ fileName?: string, mimeType?: string }} [options]
 * @returns {{ rows: Array<object>, headers: Array<string>, totalRows: number }}
 */
export function parseCardOffersExcel(excelBuffer, options = {}) {
  if (!excelBuffer || !Buffer.isBuffer(excelBuffer) && !(excelBuffer instanceof Uint8Array)) {
    throw new Error("Spreadsheet file buffer is required.");
  }

  const buffer = Buffer.isBuffer(excelBuffer) ? excelBuffer : Buffer.from(excelBuffer);
  const csvMode = isCsvUpload(options.fileName, options.mimeType);

  let workbook;
  if (csvMode) {
    // Strip UTF-8 BOM if present so headers map correctly
    let csvText = buffer.toString("utf8");
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.slice(1);
    }
    workbook = XLSX.read(csvText, { type: "string", raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(
      csvMode
        ? "No data found in CSV file."
        : "No sheets found in Excel file."
    );
  }

  // Prefer 'Super Offer' sheet if present, otherwise default to first sheet
  const sheetName =
    workbook.SheetNames.find((name) => /super\s*offer|card\s*offer/i.test(name)) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" could not be read.`);
  }

  // Read raw 2D array of rows
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rawRows || rawRows.length < 2) {
    throw new Error(
      csvMode
        ? "CSV file is empty or missing data rows."
        : "Excel file is empty or missing data rows."
    );
  }

  // Find header row (the first row containing non-empty strings)
  let headerRowIndex = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.some((cell) => typeof cell === "string" && cell.trim().length > 0)) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = rawRows[headerRowIndex].map((h) => String(h || "").trim());
  const headerMap = buildHeaderMap(rawHeaders);

  const parsedRows = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rowData = rawRows[r];
    // Skip completely empty rows
    const hasData = rowData.some((cell) => cell !== "" && cell !== undefined && cell !== null);
    if (!hasData) continue;

    const rowObj = {};
    rawHeaders.forEach((header, idx) => {
      const fieldKey = headerMap[header] || header;
      rowObj[fieldKey] = rowData[idx] !== undefined ? rowData[idx] : "";
    });

    const rowNumber = r + 1; // 1-based index in the spreadsheet

    // Normalize values
    const title = String(rowObj.title || "").trim();
    const description = String(rowObj.description || "").trim();
    const rawImagePath = String(rowObj.imagePath || "").trim();
    const redirectUrl = String(rowObj.redirectUrl || "").trim();
    const rawState = String(rowObj.state || "").trim();
    const offerName = String(rowObj.offerName || "").trim();

    const startDate = parseExcelDate(rowObj.startDate);
    const endDate = parseExcelDate(rowObj.endDate);

    const orderByNum = Number(rowObj.orderBy);
    const orderBy = !Number.isNaN(orderByNum) ? orderByNum : parsedRows.length;

    parsedRows.push({
      rowNumber,
      sno: rowObj.sno || parsedRows.length + 1,
      title,
      category: String(rowObj.category || "").trim(),
      description,
      imagePath: rawImagePath,
      redirectUrl,
      startDate,
      endDate,
      rawStartDate: rowObj.startDate,
      rawEndDate: rowObj.endDate,
      orderBy,
      state: rawState ? rawState.toLowerCase() : "all",
      offerName,
      raw: rowObj,
    });
  }

  return {
    sheetName,
    headers: rawHeaders,
    totalRows: parsedRows.length,
    rows: parsedRows,
  };
}
