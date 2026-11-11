// Admin order view "Invoice": ERP uploads the bill PDF to S3 and stores its key in orders.file_path.

export function buildInvoiceUrl(filePath) {
  const path = String(filePath || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(process.env.INVOICE_S3_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("INVOICE_S3_BASE_URL is not set in .env");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export function invoiceFileName(orderNumber) {
  const safe = String(orderNumber || "invoice").replace(/[^A-Za-z0-9_-]/g, "") || "invoice";
  return `${safe}.pdf`;
}
