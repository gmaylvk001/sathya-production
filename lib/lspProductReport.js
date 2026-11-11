import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import Product from "@/models/product";

// Exist ProductReportForLSP (artisan LspProductReport).
const LSP_DATA_URL =
  process.env.LSP_PRICE_API_URL ||
  "http://13.127.238.26/eprice/admin/cron/competitor_lsp_data_fetch_api.php?cmpid=sathya";

const SKIP_ITEM_CODES = new Set(["IP15128BLUMTP43"]);

const MAIL_TO = ["thomas@sathya.org", "md@sathyaindia.com", "dhanasekaran.m@sathya.org"];
const MAIL_CC = [
  "ram@eywamedia.com",
  "ranga@eywamedia.com",
  "sharath@eywamedia.com",
  "suba.p@sathya.email",
  "gandhi@sathyaindia.com",
  "senraj@eywamedia.com",
  "ajithajith33398@gmail.com",
];
const MAIL_SUBJECT = "SATHYA.STORE - LSP Price Updation";
const MAX_ATTACHMENT_MB = 20;

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// PHP number_format($n): rounded to an integer with thousands separators.
function numberFormat(value) {
  return Math.round(toNum(value)).toLocaleString("en-US");
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function competitorsText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function saveRawData(fileBase, text) {
  try {
    const dir = path.join(process.cwd(), "storage", "lsp_price");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${fileBase}.json`), text);
  } catch (err) {
    console.warn("[lsp_report] Could not save raw data:", err.message);
  }
}

async function fetchLspData() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(LSP_DATA_URL, { cache: "no-store", signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// final_lsp_is / final_hsp_is is { competitor: price }; the last entry wins.
function pickLastEntry(value) {
  let competitor = "";
  let price = 0;
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      competitor = key;
      price = toNum(val);
    }
  }
  return { competitor, price };
}

function buildExcel(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "LSP");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

async function sendReportMail(fileName, buffer) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: MAIL_TO,
    cc: MAIL_CC,
    subject: MAIL_SUBJECT,
    html: "Hello, Please find the attached PDF - www.sathya.store",
    attachments: [{ filename: fileName, content: buffer }],
  });
}

/**
 * Fetch competitor LSP/HSP prices, update products.lsp fields, mail the Excel report.
 * @param {{ sendMail?: boolean }} options
 */
export async function runLspProductReport({ sendMail = true } = {}) {
  const randNo = Math.floor(1111 + Math.random() * (9999 - 1111 + 1));
  const fileBase = `lsp_${todayInKolkata()}_${randNo}`;

  const rawText = await fetchLspData();
  saveRawData(fileBase, rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("LSP data is not valid JSON");
  }
  const list = (Array.isArray(data) ? data : Object.values(data || {})).filter(
    (d) => d && typeof d === "object" && String(d.product_code ?? "").trim()
  );
  if (!list.length) {
    return { updated: 0, rows: 0, mailed: false, message: "No LSP data received" };
  }

  await Product.updateMany({}, { $set: { lsp: 0 } });

  // item_code match is case-insensitive like the exist MySQL lookup.
  const codes = [...new Set(list.map((d) => String(d.product_code).trim()))];
  const products = await Product.find({ item_code: { $in: codes } })
    .collation({ locale: "en", strength: 2 })
    .select("item_code is_common_type final_price od_final_price id_final_price")
    .lean();
  const productByCode = new Map();
  const idsByCode = new Map();
  for (const p of products) {
    const key = String(p.item_code || "").trim().toLowerCase();
    if (!productByCode.has(key)) productByCode.set(key, p);
    if (!idsByCode.has(key)) idsByCode.set(key, []);
    idsByCode.get(key).push(p._id);
  }

  const ops = [];
  const rows = [];

  for (const item of list) {
    const itemCode = String(item?.product_code ?? "").trim();
    if (!itemCode) continue;

    const isLsp = item.type === "lsp";
    const competitors = isLsp ? item.all_lsp_competitors : item.all_hsp_competitors;
    const { competitor: lspCompetitor, price: lsp } = pickLastEntry(
      isLsp ? item.final_lsp_is : item.final_hsp_is
    );

    const storePrice = toNum(item.product_store_price);
    const savePercent = storePrice ? ((storePrice - lsp) * 100) / storePrice : 0;

    const codeKey = itemCode.toLowerCase();
    const product = productByCode.get(codeKey);
    if (!product || SKIP_ITEM_CODES.has(itemCode)) continue;

    const update = {
      lsp,
      lsp_competitor: lspCompetitor,
      lsp_updated_at: new Date(),
    };

    const finalPrice = toNum(product.final_price);
    if (
      Number(product.is_common_type) === 1 &&
      lsp > 0 &&
      finalPrice > 0 &&
      product.od_final_price != null &&
      product.id_final_price != null
    ) {
      const ratio = lsp / finalPrice;
      update.id_lspfinal_price = round2(toNum(product.id_final_price) * ratio);
      update.od_lspfinal_price = round2(toNum(product.od_final_price) * ratio);
    }

    ops.push({
      updateMany: { filter: { _id: { $in: idsByCode.get(codeKey) } }, update: { $set: update } },
    });

    rows.push({
      "Product EAN ID": item.product_ean_id ?? "",
      "Product Code": item.product_code ?? "",
      "Product Price": lsp,
      "SAP Price": item.product_sap_price ?? "",
      "Store Price": item.product_store_price ?? "",
      "Product Price Vs Store Price": numberFormat(savePercent),
      "SAP Price Vs Store Price": numberFormat(item.save_sap_price_by_branch_price),
      Type: item.type ?? "",
      "All Competitors": competitorsText(competitors),
    });
  }

  if (ops.length) {
    await Product.bulkWrite(ops, { ordered: true });
  }

  let mailed = false;
  if (rows.length && sendMail) {
    const buffer = buildExcel(rows);
    const sizeMb = buffer.length / 1048576;
    if (sizeMb <= MAX_ATTACHMENT_MB) {
      await sendReportMail(`${fileBase}.xlsx`, buffer);
      mailed = true;
      console.info(`[lsp_report] LSP Update Success: ${new Date().toISOString()}`);
    }
  }

  return { updated: ops.length, rows: rows.length, mailed };
}
