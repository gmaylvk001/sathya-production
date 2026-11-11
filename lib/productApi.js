// Shared product API helper with per-section localStorage caching (24h TTL)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheKey = (section) => `cache_${section}`;

const readCache = (section) => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(cacheKey(section));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || typeof parsed.data === 'undefined') return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      try { localStorage.removeItem(cacheKey(section)); } catch (e) {}
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('readCache error', err);
    return null;
  }
};

const writeCache = (section, fullData) => {
  try {
    if (typeof window === 'undefined') return;
    const payload = { timestamp: Date.now(), data: fullData, meta: { light: false } };
    try {
      localStorage.setItem(cacheKey(section), JSON.stringify(payload));
      return;
    } catch (err) {
      // Quota exceeded or other storage error — fall back to light cache
      try {
        const light = createLightProducts(fullData);
        const lightPayload = { timestamp: Date.now(), data: light, meta: { light: true } };
        localStorage.setItem(cacheKey(section), JSON.stringify(lightPayload));
      } catch (err2) {
        console.warn('writeCache failed to store even light payload', err2);
        try { localStorage.removeItem(cacheKey(section)); } catch (e) {}
      }
    }
  } catch (err) {
    console.error('writeCache error', err);
  }
};

const createLightProducts = (products) => {
  if (!Array.isArray(products)) return products;
  return products.map(p => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    images: p.images ? [p.images[0]] : [],
    price: p.price,
    special_price: p.special_price,
    item_code: p.item_code,
    brand: p.brand,
    brand_name: p.brand_name || (p.brand && typeof p.brand === 'string' ? p.brand : ''),
  }));
};

export async function getProducts(options = { preferNetwork: false }) {
  try {
    // If preferNetwork is false, try cache first
    if (!options.preferNetwork) {
      const cached = readCache('products');
      if (cached && cached.data) {
        // return cached.data (may be light or full)
        // In background, try to refresh full data if cached is light
        if (cached.meta && cached.meta.light) {
          // refresh asynchronously but do not block
          (async () => {
            try {
              const res = await fetch('/api/product/get?field=item_code,name,brand_code,images,name,slug,price,special_price'); 
              if (res.ok) {
                const fresh = await res.json();
                writeCache('products', fresh);
              }
            } catch (e) { /* ignore background refresh errors */ }
          })();
        }
        return cached.data;
      }
    }

    // Fetch from network
    const res = await fetch('/api/product/get?field=item_code,name,brand_code,images,name,slug,price,special_price');
    if (!res.ok) {
      try { const txt = await res.text(); return JSON.parse(txt); } catch { return []; }
    }
    const data = await res.json();

    // Attempt to cache full data (will fallback to light if quota exceeded)
    try { writeCache('products', data); } catch (e) { /* noop */ }

    return data;
  } catch (err) {
    console.error('getProducts error', err);
    // final fallback: return cached light if present
    try {
      const cached = readCache('products');
      if (cached && cached.data) return cached.data;
    } catch (e) {}
    return [];
  }
}
