const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

// Validates the add/edit form body; returns { data } or { error }
export function parseStoreOwnerBody(body = {}) {
  const data = {
    name: toText(body.name),
    store_name: toText(body.store_name),
    email: toText(body.email).toLowerCase(),
    payment_gateway: toText(body.payment_gateway),
    state_name: toText(body.state_name),
    is_active: toFlag(body.is_active),
    price_on: toFlag(body.price_on),
    stock_on: toFlag(body.stock_on),
  };

  if (!data.name) return { error: "Name is required" };
  if (!data.store_name) return { error: "Store name is required" };
  if (data.email && !EMAIL_PATTERN.test(data.email)) return { error: "Enter a valid email address" };
  if (data.name.length > 255 || data.store_name.length > 255 || data.email.length > 255) {
    return { error: "Name, store name and email must be 255 characters or less" };
  }
  if (data.payment_gateway.length > 100 || data.state_name.length > 100) {
    return { error: "Payment gateway and state name must be 100 characters or less" };
  }

  return { data };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
