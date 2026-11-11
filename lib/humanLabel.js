/** True for a 24-char hex Mongo ObjectId string. */
export function looksLikeMongoId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

/** First candidate that looks like a human name, not a raw id. */
export function humanLabel(...candidates) {
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text && !looksLikeMongoId(text)) return text;
  }
  return "";
}
