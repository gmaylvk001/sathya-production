// utils/compareHelpers.js
//
// Utility functions for the Compare feature:
//   - checkProductAvailability: PDP-aligned stock & online purchasing validator
//   - extractSmartSpecs:   deep DB field parsing for TVs, Appliances, Mobiles & Laptops
//   - normalizeAttributes: builds the union of attribute rows for the compare table
//   - mergeCompareLists:   client-side dedup helper for optimistic UI during sync
//   - trackCompareAdd / trackCompareRemove / trackCompareView: GA4 analytics events

import { ADD_CART_ALLOWED_MOVEMENTS, isMovementAllowed } from '../lib/addCartConfig.js';
import { toast } from 'react-toastify';

// ─── Stock & Online Purchasing Availability (PDP Aligned) ────────────────────

/**
 * Validates product stock and online cart availability matching ProductClient.js logic.
 * Products with movements outside ADD_CART_ALLOWED_MOVEMENTS (like NON ROL) are "Sold Out Online".
 */
export function checkProductAvailability(product) {
  if (!product) {
    return { inStock: false, canAddToCart: false, label: 'Out of Stock' };
  }

  const qty = Number(product.quantity || 0);
  const status = String(product.stock_status || '').trim();
  const movement = String(product.movement || '').trim();

  // If quantity is 0 or explicitly Out of Stock
  if (qty <= 0 || status === 'Out of Stock') {
    return { inStock: false, canAddToCart: false, label: 'Out of Stock' };
  }

  // Check movement against allowed cart movements (PDP rule)
  const movementAllowed = isMovementAllowed(movement);
  if (!movementAllowed) {
    return { inStock: false, canAddToCart: false, label: 'Sold Out Online' };
  }

  return { inStock: true, canAddToCart: true, label: `In Stock (${qty} units)` };
}

// ─── HTML helpers (product description/specs often stored as <ul><li>...) ────

function stripHtmlBasic(input) {
  return String(input ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Remove HTML tags for safe display — never drops the actual text content. */
export function stripHtml(input) {
  if (input === null || input === undefined) return '';
  return stripHtmlBasic(input).replace(/\s+/g, ' ').trim();
}

/**
 * Split HTML/plain specs into individual lines.
 * Supports closed <li>...</li> and messy unclosed <li>Item<li>Item2 patterns.
 */
function extractListLines(str) {
  const text = String(str ?? '');
  if (!text.trim()) return [];

  // 1) Properly closed <li>...</li>
  const closed = [];
  text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    const cleaned = stripHtmlBasic(inner).replace(/\s+/g, ' ').trim();
    if (cleaned) closed.push(cleaned);
    return '';
  });
  if (closed.length) return closed;

  // 2) Unclosed / broken list: split on <li ...>
  if (/<li[\s>]/i.test(text)) {
    const parts = text
      .split(/<li[^>]*>/i)
      .map((part) => stripHtmlBasic(part).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      // drop leftover wrapper words like "ul" noise already stripped
      .filter((part) => !/^(ul|ol|div|span)$/i.test(part));
    if (parts.length) return parts;
  }

  // 3) Plain text / other HTML → single cleaned blob, then split lines
  const plain = stripHtmlBasic(text);
  if (!plain) return [];
  return plain
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Turn key_specifications / highlights (plain or HTML) into clean lines
 * like "Display: HD LED" / "Connectivity: 2 HDMI | 1 USB".
 */
function flattenSpecEntries(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // Join array fragments first — CMS often stores broken HTML across array items
  const joined = list
    .map((item) => (item === null || item === undefined ? '' : String(item)))
    .filter((s) => s.trim() !== '')
    .join('');

  if (!joined.trim()) return [];

  // If any HTML list markers exist, parse the whole joined string as one HTML block
  if (/<li[\s>]|<\/li>|<ul[\s>]|<ol[\s>]/i.test(joined)) {
    return extractListLines(joined);
  }

  // Otherwise keep each array item as its own plain line
  const entries = [];
  list.forEach((item) => {
    extractListLines(item).forEach((line) => entries.push(line));
  });
  return entries;
}

/** Parse "Key: Value" only when key looks like a real label (not leftover HTML junk). */
function parseKeyValueLine(line) {
  const clean = stripHtml(line);
  if (!clean || !clean.includes(':')) return null;

  const colonIdx = clean.indexOf(':');
  const key = clean.slice(0, colonIdx).trim();
  const value = clean.slice(colonIdx + 1).trim();

  if (!key || !value) return null;
  // Reject garbage keys that still look like markup leftovers
  if (/[<>]|\/li|\/ul|\/ol/i.test(key)) return null;
  if (key.length > 60) return null;

  return { key, value };
}

// ─── Smart Spec Extraction ───────────────────────────────────────────────────

/**
 * Intelligently extracts rich specification attributes from product properties,
 * title, highlights, key_specifications, and description when structured fields are sparse.
 */
function extractSmartSpecs(product) {
  const specs = new Map();
  if (!product) return specs;

  const rawHighlights = flattenSpecEntries(product.product_highlights);
  const rawKeySpecs = flattenSpecEntries(product.key_specifications);
  // Keep description short after strip — huge HTML blobs slow compare regexes
  const plainDescription = stripHtml(product.description || '').slice(0, 1500);
  const text = [
    product.name || '',
    plainDescription,
    ...rawHighlights,
    ...rawKeySpecs,
  ].join(' ');

  // 1. Brand (avoiding raw Mongo ObjectId)
  const brandName = formatBrandName(product);
  if (brandName) {
    specs.set('Brand', brandName);
  }

  // 2. Model / Series
  if (product.model_number && String(product.model_number).trim()) {
    specs.set('Model / Series', String(product.model_number).trim());
  } else {
    // Extract series or model from parentheses in name, e.g. "Sony ... (K-75S30 Series)" or "(UA75U8500FUXXL, Black)"
    const parenMatch = (product.name || '').match(/\(([^)]+)\)/);
    if (parenMatch) {
      const cleanModel = parenMatch[1].split(',')[0].trim();
      if (cleanModel && cleanModel.length < 35) {
        specs.set('Model / Series', cleanModel);
      }
    } else {
      const codeMatch = (product.name || '').match(/\b([A-Z0-9]{4,}-[A-Z0-9]+|[A-Z]{1,2}-[0-9]{2,}[A-Z0-9]+|UA\d+[A-Z0-9]+)\b/i);
      if (codeMatch) specs.set('Model / Series', codeMatch[0]);
    }
  }

  // 3. Screen Size / Capacity
  if (product.size && String(product.size).trim()) {
    specs.set('Screen Size / Capacity', String(product.size).trim());
  } else {
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:inch|Inch|\"|cm)/i);
    if (sizeMatch) {
      specs.set('Screen Size / Capacity', `${sizeMatch[1]} Inch`);
    } else {
      const capMatch = text.match(/(\d+(?:\.\d+)?)\s*(Ton|Litres|Litre|L|Kg|kg)\b/i);
      if (capMatch) specs.set('Capacity', `${capMatch[1]} ${capMatch[2]}`);
    }
  }

  // 4. Display Type (LED / QNED / OLED / QLED / Crystal UHD / Mini LED)
  if (/\b(Mini\s*LED|QNED\s*Mini\s*LED)\b/i.test(text)) {
    specs.set('Display Type', 'QNED Mini LED');
  } else if (/\bQNED\b/i.test(text)) {
    specs.set('Display Type', 'QNED');
  } else if (/\b(QD-OLED|OLED)\b/i.test(text)) {
    specs.set('Display Type', 'OLED');
  } else if (/\b(Neo\s*QLED|QLED)\b/i.test(text)) {
    specs.set('Display Type', 'QLED');
  } else if (/\bCrystal\s*UHD\b/i.test(text)) {
    specs.set('Display Type', 'Crystal UHD');
  } else if (/\bLED\b/i.test(text)) {
    specs.set('Display Type', 'LED');
  }

  // 5. Resolution / Display Tech (Normalized to avoid false differences)
  if (/\b(4K Ultra HD|4K UHD|4K|Ultra HD|3840\s*[xX]\s*2160)\b/i.test(text)) {
    specs.set('Resolution / Display', '4K Ultra HD');
  } else if (/\b(8K Ultra HD|8K UHD|8K)\b/i.test(text)) {
    specs.set('Resolution / Display', '8K Ultra HD');
  } else if (/\b(Full HD|FHD|1080[pP]|1920\s*[xX]\s*1080)\b/i.test(text)) {
    specs.set('Resolution / Display', 'Full HD (1080p)');
  } else if (/\b(HD Ready|HD|720[pP]|1366\s*[xX]\s*768)\b/i.test(text)) {
    specs.set('Resolution / Display', 'HD Ready');
  }

  // 6. Refresh Rate
  const hzMatch = text.match(/\b(120\s*Hz|144\s*Hz|240\s*Hz|100\s*Hz|60\s*Hz)\b/i);
  if (hzMatch) {
    specs.set('Refresh Rate', hzMatch[0].replace(/\s+/g, ' '));
  } else if (specs.has('Resolution / Display')) {
    specs.set('Refresh Rate', '50 / 60 Hz');
  }

  // 7. Sound / Audio Output
  const soundTech = [];
  if (/Dolby\s*Atmos/i.test(text)) soundTech.push('Dolby Atmos');
  else if (/Dolby\s*Audio/i.test(text)) soundTech.push('Dolby Audio');
  if (/AI\s*(?:Sound|Acoustic)/i.test(text)) soundTech.push('AI Acoustic Sound');
  if (/Q-Symphony/i.test(text)) soundTech.push('Q-Symphony');
  const wattMatch = text.match(/\b(\d+)\s*(?:W|Watts?)\s*(?:Audio|Sound|Speaker|Output)?\b/i);
  const watt = wattMatch ? `${wattMatch[1]}W` : '20W';
  specs.set(
    'Sound / Audio Output',
    soundTech.length > 0 ? `${watt} (${soundTech.join(', ')})` : `${watt} Stereo Sound`
  );

  // 8. Operating System / Platform
  if (/\bGoogle\s*TV\b/i.test(text)) {
    specs.set('Operating System', 'Google TV');
  } else if (/\bWebOS\b/i.test(text)) {
    specs.set('Operating System', 'WebOS');
  } else if (/\bTizen\b/i.test(text)) {
    specs.set('Operating System', 'Tizen');
  } else if (/\bAndroid\s*TV\b/i.test(text)) {
    specs.set('Operating System', 'Android TV');
  } else if (/\b(iOS|iPadOS)\b/i.test(text)) {
    specs.set('Operating System', 'iOS');
  } else if (/\bWindows\b/i.test(text)) {
    specs.set('Operating System', 'Windows 11');
  }

  // 9. Smart Features & Voice Assistants
  const feats = [];
  if (/Google\s*Assistant/i.test(text)) feats.push('Google Assistant');
  if (/Alexa/i.test(text)) feats.push('Alexa');
  if (/AI\s*ThinQ/i.test(text)) feats.push('LG AI ThinQ');
  if (/Magic\s*Remote/i.test(text)) feats.push('Magic Remote');
  if (/AirPlay/i.test(text)) feats.push('Apple AirPlay');
  if (/Chromecast/i.test(text)) feats.push('Chromecast Built-in');
  if (/SmartThings/i.test(text)) feats.push('SmartThings');
  if (/Voice/i.test(text) && feats.length === 0) feats.push('Voice Control');
  if (feats.length > 0) {
    specs.set('Smart Features', feats.slice(0, 3).join(', '));
  } else if (specs.has('Operating System')) {
    specs.set('Smart Features', 'Smart Apps & Screen Mirroring');
  }

  // 10. Connectivity (HDMI, USB, Wi-Fi, Bluetooth)
  const conn = [];
  if (/HDMI\s*2\.1/i.test(text)) conn.push('HDMI 2.1');
  else if (/HDMI/i.test(text)) conn.push('HDMI');
  if (/USB/i.test(text)) conn.push('USB');
  conn.push('Wi-Fi', 'Bluetooth');
  specs.set('Connectivity', conn.join(', '));

  // 11. RAM & Internal Storage (Phones / Laptops)
  const ramStorageMatch =
    text.match(/(\d+\s*GB)\s*RAM\s*[/+]\s*(\d+\s*GB)\s*(?:ROM|Storage)?/i) ||
    text.match(/(\d+)\s*[/+]\s*(\d+)\s*GB/i);
  if (ramStorageMatch) {
    specs.set('RAM & Storage', ramStorageMatch[0]);
  } else {
    const ramMatch = text.match(/(\d+\s*GB)\s*RAM/i);
    if (ramMatch) specs.set('RAM', ramMatch[1]);
    const storageMatch = text.match(/(\d+\s*(?:GB|TB))\s*(?:ROM|Storage|SSD|HDD)/i);
    if (storageMatch) specs.set('Internal Storage', storageMatch[1]);
  }

  // 12. Energy Rating / Star (ACs, Refrigerators)
  if (product.star && String(product.star).trim()) {
    specs.set('Energy Rating', `${product.star} Star`);
  } else {
    const starMatch = text.match(/([1-5])\s*Star/i);
    if (starMatch) specs.set('Energy Rating', `${starMatch[1]} Star`);
  }

  // 13. Manufacturer Warranty
  if (product.warranty) {
    specs.set(
      'Manufacturer Warranty',
      `${product.warranty} Year${Number(product.warranty) > 1 ? 's' : ''} Comprehensive Warranty`
    );
  } else {
    const warMatch = text.match(/(\d+)\s*Year(?:s)?\s*(?:Comprehensive)?\s*Warranty/i);
    if (warMatch) {
      specs.set('Manufacturer Warranty', warMatch[0]);
    } else {
      specs.set('Manufacturer Warranty', '1 Year Comprehensive Manufacturer Warranty');
    }
  }

  // 14. Item Code
  if (product.item_code && String(product.item_code).trim()) {
    specs.set('Item Code', String(product.item_code).trim());
  }

  return specs;
}

// ─── Attribute Normalization ─────────────────────────────────────────────────

/**
 * Builds the ordered union of comparable attributes across all selected products.
 *
 * @param {Array<Object>} products — fully-populated product objects
 * @returns {Array<{ key: string, values: Array<string|null>, group: string, isDifferent: boolean }>}
 */
export function normalizeAttributes(products) {
  if (!products || products.length === 0) return [];

  // Parse each product's attributes into a Map<key, value>
  const productMaps = products.map((item) => {
    const product = item?.productData || item;
    const map = new Map();

    // 1. Smart extracted specs from title, size, star, description, highlights
    const smartSpecs = extractSmartSpecs(product);
    smartSpecs.forEach((val, k) => map.set(k, val));

    // 2. Parse "Key: Value" lines from key_specifications / highlights (HTML-safe)
    //    Keeps list content like Display / Connectivity / Sound / USP intact.
    const addSpecLines = (raw) => {
      flattenSpecEntries(raw).forEach((line) => {
        const parsed = parseKeyValueLine(line);
        if (parsed && !map.has(parsed.key)) {
          map.set(parsed.key, parsed.value);
        } else if (!parsed) {
          // Non key:value list item (e.g. "Dolby Atmos", "60 Hz Refresh Rate")
          const plain = stripHtml(line);
          if (plain && plain.length <= 80 && !map.has(plain)) {
            // Prefer attaching known feature phrases under a stable label when possible
            if (/hz|refresh/i.test(plain) && !map.has('Refresh Rate')) {
              map.set('Refresh Rate', plain);
            } else if (/dolby|atmos|speaker|sound/i.test(plain) && map.has('Sound')) {
              map.set('Sound', `${map.get('Sound')}; ${plain}`);
            } else if (!map.has(plain)) {
              // store as feature row only if it doesn't look like a sentence
              if (!/\.$/.test(plain) && plain.split(' ').length <= 8) {
                map.set(plain, 'Yes');
              }
            }
          }
        }
      });
    };
    addSpecLines(product?.key_specifications);
    addSpecLines(product?.product_highlights);

    // 3. Top-level filter object keys (e.g. { capacity: "1.5 Ton", star_rating: "5 Star" })
    if (product?.filter && typeof product.filter === 'object') {
      Object.entries(product.filter).forEach(([key, value]) => {
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        if (!map.has(label) && value !== undefined && value !== null && String(value).trim() !== '') {
          map.set(label, String(value));
        }
      });
    }

    return map;
  });

  // Build the union of all attribute keys, preserving order of appearance
  const keyOrder = [];
  const seen = new Set();
  productMaps.forEach((map) => {
    map.forEach((_, key) => {
      if (!seen.has(key)) {
        seen.add(key);
        keyOrder.push(key);
      }
    });
  });

  // Build each row with difference check & logical group classification
  return keyOrder.map((key) => {
    const values = productMaps.map((map) => map.get(key) || null);

    // Calculate if values differ across compared products
    const cleanVals = values.map((v) => (v ? String(v).trim().toLowerCase() : ''));

    // Suppress Diff badge on Item Code / SKU since each product always has unique codes
    const isDifferent =
      !/item code|sku/i.test(key) &&
      cleanVals.length > 1 &&
      new Set(cleanVals).size > 1;

    // Determine group
    let group = 'Technical Specifications';
    if (/brand|model|item code|category|warranty/i.test(key)) {
      group = 'Overview';
    } else if (
      /screen|size|display|resolution|refresh|audio|sound|operating system|smart|connectivity|ram|storage|processor|capacity/i.test(
        key
      )
    ) {
      group = 'Key Specifications';
    }

    return {
      key,
      values,
      group,
      isDifferent,
    };
  });
}

/**
 * Tries to parse a value as a number for "best value" highlighting in the table.
 * Returns the numeric value, or null if it cannot be parsed.
 *
 * @param {string|null} val
 * @returns {number|null}
 */
export function parseNumericValue(val) {
  if (!val) return null;
  // Strip common suffixes: "₹", "INR", "W", "kg", "L", "Star", etc.
  const cleaned = String(val).replace(/[₹,INR\s]/g, '').match(/[\d.]+/);
  return cleaned ? parseFloat(cleaned[0]) : null;
}

// ─── Compare List Merge (Client-side) ────────────────────────────────────────

/**
 * Merges a guest's localStorage compare list into the DB-fetched list, respecting:
 *   - Deduplication by productId
 *   - Max 4 items total (existing DB items take priority)
 *
 * This mirrors the server-side merge logic and is used for optimistic UI updates
 * while the real /api/compare/merge call is in-flight.
 *
 * @param {Array<{ productId: string, category_slug: string }>} localList
 * @param {Array<{ productId: string, category_slug: string }>} dbList
 * @returns {Array<{ productId: string, category_slug: string }>} merged list (max 4)
 */
export function mergeCompareLists(localList, dbList) {
  const existingIds = new Set(dbList.map((item) => String(item.productId)));
  const newItems = localList.filter((item) => !existingIds.has(String(item.productId)));
  const availableSlots = 4 - dbList.length;
  return [...dbList, ...newItems.slice(0, availableSlots)];
}

// ─── Analytics Helpers ───────────────────────────────────────────────────────
// Follow the same window.gtag pattern as utils/nextjs-event-tracking.js

/**
 * Fire GA4 event when a product is added to the compare list.
 * @param {{ productId: string, productName: string, category_slug: string }} param
 */
export function trackCompareAdd({ productId, productName, category_slug }) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'compare_add', {
      product_id: productId,
      product_name: productName,
      category: category_slug,
    });
  }
}

/**
 * Fire GA4 event when a product is removed from the compare list.
 * @param {{ productId: string, productName: string }} param
 */
export function trackCompareRemove({ productId, productName }) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'compare_remove', {
      product_id: productId,
      product_name: productName,
    });
  }
}

/**
 * Fire GA4 event when the user navigates to the compare page.
 * @param {{ count: number, category_slug: string }} param
 */
export function trackCompareView({ count, category_slug }) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'compare_view', {
      item_count: count,
      category: category_slug,
    });
  }
}

/**
 * Safely format brand name, avoiding raw MongoDB ObjectIds
 * @param {object} product
 * @returns {string}
 */
export function formatBrandName(product) {
  if (!product) return '';
  if (product.brand_name && !/^[0-9a-fA-F]{24}$/.test(product.brand_name)) {
    return product.brand_name;
  }
  if (typeof product.brand === 'object' && product.brand?.brand_name) {
    return product.brand.brand_name;
  }
  if (typeof product.brand === 'string' && !/^[0-9a-fA-F]{24}$/.test(product.brand)) {
    return product.brand;
  }
  if (product.name && typeof product.name === 'string') {
    const firstWord = product.name.trim().split(/\s+/)[0];
    if (firstWord && !/^\d+$/.test(firstWord)) {
      return firstWord.toUpperCase();
    }
  }
  return '';
}

// ─── Compare Toast Notification Helpers ─────────────────────────────────────

export const COMPARE_TOAST_ID = 'compare-status-toast';
export const COMPARE_ERROR_TOAST_ID = 'compare-error-toast';

export function getCompareToastPosition() {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 'top-center';
  }
  return 'top-right';
}

export function notifyCompareSuccess(productName) {
  try {
    toast.dismiss(COMPARE_TOAST_ID);
  } catch {
    // safe guard
  }

  return toast.success(`"${productName || 'Product'}" added to compare!`, {
    toastId: COMPARE_TOAST_ID,
    position: getCompareToastPosition(),
    autoClose: 2500, // 2-3s auto-dismiss per specification
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false, // Prevents mobile touch/hover from freezing timer
    pauseOnFocusLoss: false, // Prevents timer freeze when window/focus shifts
    closeButton: true, // Direct manual close button support
    draggable: true,
  });
}

export function notifyCompareError(message, toastId = COMPARE_ERROR_TOAST_ID) {
  try {
    toast.dismiss(toastId);
  } catch {
    // safe guard
  }

  return toast.error(message, {
    toastId,
    position: getCompareToastPosition(),
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    pauseOnFocusLoss: false,
    closeButton: true,
    draggable: true,
  });
}
