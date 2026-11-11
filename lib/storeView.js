import StoreOwners from "@/models/store_owners";

export const STORE_VIEW_COOKIE = "session_store";

export async function uniletOwnerExists() {
  try {
    return Boolean(await StoreOwners.exists({ store_name: { $regex: /^unilet$/i } }));
  } catch {
    return false;
  }
}

// Unilet View switch on -> unilet records; otherwise sathya records.
// Only applies while a "unilet" store owner exists.
export async function isUniletView(req) {
  const wantsUnilet = req.cookies?.get(STORE_VIEW_COOKIE)?.value === "unilet";
  if (!wantsUnilet) return false;
  return uniletOwnerExists();
}

export function ownerFieldFilter(field, uniletView) {
  return uniletView
    ? { [field]: { $regex: /^unilet$/i } }
    : { [field]: { $not: /^unilet$/i } };
}

export function orderOwnerFilter(uniletView) {
  return ownerFieldFilter("order_owner", uniletView);
}
