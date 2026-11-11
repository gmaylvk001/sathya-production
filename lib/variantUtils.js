export function normalizeVariantValues(values = {}, attributeNames = []) {
  const next = {};
  const source = values && typeof values === "object" ? values : {};
  for (const name of attributeNames) {
    next[name] = String(source[name] ?? "").trim();
  }
  return next;
}

export function variantValue(value) {
  return String(value ?? "").trim();
}

export function valuesKeyFromNames(values = {}, attributeNames = []) {
  const source = values && typeof values === "object" ? values : {};
  return (attributeNames || [])
    .filter(Boolean)
    .map((name) => variantValue(source[name]).toLowerCase())
    .join("||");
}

export function activeSelections(values = {}, attributeNames = []) {
  const next = {};
  const source = values && typeof values === "object" ? values : {};
  for (const name of (attributeNames || [])) {
    if (!name) continue;
    const value = variantValue(source[name]);
    if (value) next[name] = value;
  }
  return next;
}

export function isProductPurchasable(product) {
  if (!product || typeof product !== "object") return false;
  const status = String(product.status || "").trim().toLowerCase();
  if (status === "inactive") return false;
  const stockStatus = String(product.stock_status || "").trim().toLowerCase();
  if (stockStatus === "out of stock") return false;
  const movement = String(product.movement || "").trim().toUpperCase();
  if (movement === "CUS-ORDER") return true;
  const qty = Number(product.quantity);
  return Number.isFinite(qty) && qty > 0;
}

export function isVariantValueAvailable(products, attrName, value, selected, attributeNames) {
  const target = variantValue(value);
  if (!target || !Array.isArray(products) || !attrName) return false;

  const validNames = (attributeNames || []).filter(Boolean);

  return products.some((product) => {
    if (!product) return false;
    if (variantValue(product.values?.[attrName]) !== target) return false;
    if (!isProductPurchasable(product)) return false;
    return validNames.every((name) => {
      if (name === attrName) return true;
      const selectedVal = variantValue(selected?.[name]);
      if (!selectedVal) return true;
      return variantValue(product.values?.[name]) === selectedVal;
    });
  });
}

export function findProductForSelection(products, selection, attributeNames, changedAttr = null) {
  if (!Array.isArray(products) || !products.length) return null;
  const validNames = (attributeNames || []).filter(Boolean);
  const normalized = activeSelections(selection, validNames);

  const exactMatches = products.filter((product) =>
    product &&
    validNames.every(
      (name) => variantValue(product.values?.[name]) === (normalized[name] || "")
    )
  );
  const exactInStock = exactMatches.find(isProductPurchasable);
  if (exactInStock) return exactInStock;
  if (exactMatches[0]) return exactMatches[0];

  if (changedAttr && normalized[changedAttr]) {
    const candidates = products.filter(
      (product) => product && variantValue(product.values?.[changedAttr]) === normalized[changedAttr]
    );
    if (!candidates.length) return null;
    const inStock = candidates.filter(isProductPurchasable);
    const pool = inStock.length ? inStock : candidates;

    let best = pool[0];
    let bestScore = -1;
    for (const product of pool) {
      let score = 0;
      for (const name of validNames) {
        if (name === changedAttr) continue;
        if (normalized[name] && variantValue(product.values?.[name]) === normalized[name]) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = product;
      }
    }
    return best;
  }

  return (
    products.find((product) =>
      product &&
      Object.entries(normalized).every(
        ([name, val]) => variantValue(product.values?.[name]) === val
      )
    ) || null
  );
}

export function uniqueVariantValues(products, attrName) {
  const values = [];
  if (!Array.isArray(products) || !attrName) return values;
  for (const product of products) {
    if (!product) continue;
    const value = variantValue(product.values?.[attrName]);
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}
