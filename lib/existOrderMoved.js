import OrderNew from "@/models/orders_new";

function toText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null") return "";
  return text;
}

function matchKeys(value) {
  const text = toText(value);
  if (!text) return [];
  const values = new Set([text]);
  if (/^\d+(\.0+)?$/.test(text)) {
    const n = Math.trunc(Number(text));
    values.add(String(n));
    values.add(`${n}.0`);
  }
  return [...values];
}

async function loadMovedKeys(field, keys) {
  const found = new Set();
  const list = [...keys];
  const chunkSize = 2000;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const rows = await OrderNew.find({ [field]: { $in: chunk } }, { [field]: 1 }).lean();
    for (const row of rows) {
      matchKeys(row[field]).forEach((key) => found.add(key));
    }
  }
  return found;
}

export async function withMovedFlag(orders) {
  const orderNumberKeys = new Set();
  const existIdKeys = new Set();
  for (const order of orders) {
    matchKeys(order.order_number).forEach((key) => orderNumberKeys.add(key));
    matchKeys(order.exist_id).forEach((key) => existIdKeys.add(key));
  }

  const [movedNumbers, movedExistIds] = await Promise.all([
    loadMovedKeys("order_number", orderNumberKeys),
    loadMovedKeys("exist_id", existIdKeys),
  ]);

  return orders.map((order) => {
    const is_moved =
      matchKeys(order.order_number).some((key) => movedNumbers.has(key)) ||
      matchKeys(order.exist_id).some((key) => movedExistIds.has(key));
    return { ...order, is_moved };
  });
}
