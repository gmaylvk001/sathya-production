/**
 * Bank Logo Helper & Normalization Engine
 * Sathya Store E-Commerce
 */

export const STATIC_BANK_ASSET_MAP = {
  HDFC: "/images/banks/hdfc.svg",
  SBI: "/images/banks/sbi.svg",
  AXIS: "/images/banks/axis.svg",
  ICICI: "/images/banks/icici.svg",
  KOTAK: "/images/banks/kotak.svg",
  RBL: "/images/banks/rbl.svg",
  SCB: "/images/banks/scb.svg",
};

/**
 * Normalized Bank Code Resolver
 * @param {string} [code]
 * @param {string} [name]
 * @returns {string}
 */
export function normalizeBankIdentifier(code = "", name = "") {
  const upperCode = (code || "").trim().toUpperCase();
  const upperName = (name || "").trim().toUpperCase();

  if (upperCode === "HDFC" || upperName.includes("HDFC")) return "HDFC";
  if (upperCode === "SBI" || upperName.includes("STATE BANK") || upperName.includes("SBI")) return "SBI";
  if (upperCode === "AXIS" || upperName.includes("AXIS")) return "AXIS";
  if (upperCode === "ICICI" || upperName.includes("ICICI")) return "ICICI";
  if (upperCode === "KOTAK" || upperName.includes("KOTAK")) return "KOTAK";
  if (upperCode === "BOB" || upperName.includes("BARODA")) return "BOB";
  if (upperCode === "RBL" || upperName.includes("RBL") || upperName.includes("RATNAKAR")) return "RBL";
  if (upperCode === "SCB" || upperName.includes("STANDARD CHARTERED")) return "SCB";
  if (upperCode === "YES" || upperName.includes("YES BANK")) return "YES";
  if (upperCode === "INDUSIND" || upperName.includes("INDUSIND")) return "INDUSIND";
  if (upperCode === "FEDERAL" || upperName.includes("FEDERAL")) return "FEDERAL";

  return upperCode || "BANK";
}

/**
 * Dynamic URL Sanitizer
 * Detects obsolete/broken upload paths like `/uploads/banks/sbi.png` or `/uploads/banks/axis.png`
 * and points them to existing verified assets in `/images/banks/`.
 * @param {string} [rawUrl]
 * @param {string} [normalizedCode]
 * @returns {string}
 */
export function sanitizeBankLogoUrl(rawUrl = "", normalizedCode = "") {
  if (!rawUrl || typeof rawUrl !== "string") {
    return normalizedCode && STATIC_BANK_ASSET_MAP[normalizedCode]
      ? STATIC_BANK_ASSET_MAP[normalizedCode]
      : "";
  }

  const trimmed = rawUrl.trim();

  // If path points to the empty legacy /uploads/banks/ directory
  if (trimmed.startsWith("/uploads/banks/")) {
    const filename = trimmed
      .replace("/uploads/banks/", "")
      .split(".")[0]
      ?.toUpperCase();

    const targetCode = filename || normalizedCode;
    if (targetCode && STATIC_BANK_ASSET_MAP[targetCode]) {
      return STATIC_BANK_ASSET_MAP[targetCode];
    }
  }

  return trimmed;
}
