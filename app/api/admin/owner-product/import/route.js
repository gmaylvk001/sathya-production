import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import Product from "@/models/product";
import { normalizeRegion, SUPPORTED_REGIONS } from "@/lib/regionHelper";
import { buildHeaderMap, getCell } from "@/lib/storeImportHelpers";
import { requireAdmin } from "@/lib/adminRequest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_LISTED_ROWS = 100;

// Sheet cells may hold numbers or literal "NULL" text exported from MySQL.
function cleanCode(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text.toUpperCase() === "NULL" ? "" : text;
}

function parseStock(value) {
  const text = cleanCode(value).replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

function parseStockStatus(value) {
  const text = cleanCode(value).toLowerCase().replace(/[\s_-]+/g, "");
  if (!text) return null;
  if (text === "instock" || text === "1" || text === "yes") return "In Stock";
  if (text === "outofstock" || text === "0" || text === "no") return "Out of Stock";
  return null;
}

// A sheet status is used only when stock allows it; zero stock is always Out of Stock.
function resolveStockStatus(stock, sheetStatus) {
  if (stock !== null && stock <= 0) return "Out of Stock";
  if (sheetStatus) return sheetStatus;
  return stock !== null ? "In Stock" : null;
}

/**
 * POST /api/admin/owner-product/import
 * Form fields: file (.xlsx / .csv), region (delivery location)
 * Reads reference_item_code (Sathya product item_code), vendor_item_code, stock and optional stock_status.
 */
export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("excel");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "Please choose an Excel or CSV file" }, { status: 400 });
    }

    const region = normalizeRegion(String(formData.get("region") || "karnataka"));
    if (!SUPPORTED_REGIONS.includes(region)) {
      return NextResponse.json({ success: false, message: "Invalid delivery location" }, { status: 400 });
    }

    const fileName = (file.name || "").toLowerCase();
    const isCsv = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    if (!isCsv && !isExcel) {
      return NextResponse.json({ success: false, message: "Only .xlsx, .xls and .csv files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = isCsv
      ? XLSX.read(buffer.toString("utf-8"), { type: "string", raw: true })
      : XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, message: "File has no sheets" }, { status: 400 });
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "File has no data rows" }, { status: 400 });
    }

    const headerMap = buildHeaderMap(rows[0]);
    if (!headerMap.reference_item_code || !headerMap.vendor_item_code) {
      return NextResponse.json(
        { success: false, message: "File must have reference_item_code and vendor_item_code columns" },
        { status: 400 }
      );
    }

    // Last row wins when the same reference code appears more than once.
    const byReference = new Map();
    const skippedEmpty = [];
    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const referenceCode = cleanCode(getCell(row, headerMap, ["reference_item_code"]));
      const vendorCode = cleanCode(getCell(row, headerMap, ["vendor_item_code"]));
      if (!referenceCode || !vendorCode) {
        skippedEmpty.push({ row: excelRow, reference_item_code: referenceCode, vendor_item_code: vendorCode });
        return;
      }
      const stock = parseStock(getCell(row, headerMap, ["stock", "quantity", "qty"]));
      const stockStatus = resolveStockStatus(
        stock,
        parseStockStatus(getCell(row, headerMap, ["stock_status"]))
      );
      byReference.set(referenceCode.toLowerCase(), { row: excelRow, referenceCode, vendorCode, stock, stockStatus });
    });

    await dbConnect();

    const referenceCodes = [...byReference.values()].map((entry) => entry.referenceCode);
    const products = referenceCodes.length
      ? await Product.find(
          { item_code: { $in: referenceCodes } },
          { _id: 1, item_code: 1, name: 1, price: 1, special_price: 1, quantity: 1 }
        )
          .collation({ locale: "en", strength: 2 })
          .lean()
      : [];

    const productByCode = new Map();
    for (const product of products) {
      const key = String(product.item_code || "").trim().toLowerCase();
      if (key && !productByCode.has(key)) productByCode.set(key, product);
    }

    const notFound = [];
    const operations = [];
    for (const [key, entry] of byReference) {
      const product = productByCode.get(key);
      if (!product) {
        notFound.push({ row: entry.row, reference_item_code: entry.referenceCode });
        continue;
      }

      const price = Number(product.price) || 0;
      const specialPrice = Number(product.special_price) || 0;
      const fallbackStock = Number(product.quantity) || 0;

      const $set = {
        product_item_code: product.item_code,
        vendor_item_code: entry.vendorCode,
      };
      const $setOnInsert = {
        vendor_product_name: product.name || "",
        price,
        offer_price: specialPrice > 0 && specialPrice <= price ? specialPrice : 0,
        is_active: true,
        delivery_days: 1,
      };

      if (entry.stock !== null) $set.stock = entry.stock;
      else $setOnInsert.stock = fallbackStock;

      if (entry.stockStatus) $set.stock_status = entry.stockStatus;
      else $setOnInsert.stock_status = fallbackStock > 0 ? "In Stock" : "Out of Stock";

      operations.push({
        updateOne: {
          filter: { owner_id: "unilet", product_id: product._id, region },
          update: { $set, $setOnInsert },
          upsert: true,
        },
      });
    }

    let created = 0;
    let updated = 0;
    if (operations.length) {
      const result = await OwnerProduct.bulkWrite(operations, { ordered: false });
      created = result.upsertedCount || 0;
      updated = result.matchedCount || 0;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Newly mapped ${created}, updated ${updated}, not found ${notFound.length}, empty ${skippedEmpty.length}.`,
      region,
      totalRows: rows.length,
      created,
      updated,
      notFoundCount: notFound.length,
      notFound: notFound.slice(0, MAX_LISTED_ROWS),
      skippedEmptyCount: skippedEmpty.length,
      skippedEmpty: skippedEmpty.slice(0, MAX_LISTED_ROWS),
    });
  } catch (error) {
    console.error("Unilet products import error:", error);
    return NextResponse.json({ success: false, message: error.message || "Import failed" }, { status: 500 });
  }
}
