/** Keep first occurrence of each _id (ObjectId, string, or missing). */
export function uniqueById(items = [], getId = (item) => item?._id) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const raw = getId(item);
    const id = raw == null ? "" : String(raw);
    if (!id) {
      out.push(item);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

export function listKey(id, index, prefix = "") {
  return `${prefix}${id ?? "item"}-${index}`;
}
