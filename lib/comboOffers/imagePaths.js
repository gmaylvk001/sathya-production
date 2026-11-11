/**
 * Pure helpers for combo marketing images (safe for client + server).
 * Product.images and ComboOffer.marketingImage store filename only under /uploads/products/.
 */

export function normalizeComboImageFilename(img) {
  if (!img) return "";
  let s = String(img).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("blob:") || s.startsWith("data:")) {
    try {
      s = decodeURIComponent(s.split("?")[0].split("/").pop() || "");
    } catch {
      s = s.split("?")[0].split("/").pop() || "";
    }
    return s;
  }
  s = s.replace(/^\/+/, "").replace(/^uploads\/products\//i, "");
  if (s.includes("/")) s = s.split("/").pop() || s;
  return s;
}

export function comboImagePublicUrl(img) {
  if (!img) return "";
  const s = String(img).trim();
  if (/^https?:\/\//i.test(s) || s.startsWith("blob:") || s.startsWith("data:")) {
    return s;
  }
  if (s.startsWith("/uploads/")) return s;
  const filename = normalizeComboImageFilename(s);
  return filename ? `/uploads/products/${filename}` : "";
}
