/** Checkout order number: YYYYMMDD_OL_###### or YYYYMMDD_UL_###### */

export function buildOrderNumber(isUnilet, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const ymd = `${pick("year")}${pick("month")}${pick("day")}`;
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${ymd}_${isUnilet ? "UL" : "OL"}_${random}`;
}

export function isFormattedOrderNumber(orderNumber) {
  return /^\d{8}_(OL|UL)_\d{6}$/i.test(String(orderNumber || "").trim());
}
