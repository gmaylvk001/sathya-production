// 1. Accessories & Non-Electronic Blacklist Keywords
export const ACCESSORY_KEYWORDS = [
  'bag', 'backpack', 'sleeve', 'case', 'cover', 'pouch',
  'cable', 'cord', 'adapter', 'charger', 'stand', 'bracket',
  'mount', 'trolley', 'stabilizer', 'screen guard', 'tempered glass',
  'mouse pad', 'cleaning kit', 'accessory', 'accessories'
];

// 2. Physical Installation Appliance Whitelist
export const INSTALLATION_ELIGIBLE_CATEGORIES = [
  'air-conditioner', 'split-ac', 'window-ac', 'air conditioner', 'ac',
  'television', 'tv', 'led-tv', 'smart-tv', 'oled', 'qled',
  'washing-machine', 'washing machine', 'dryer', 'washer',
  'refrigerator', 'fridge', 'deep-freezer', 'freezer',
  'dishwasher', 'water-purifier', 'water purifier',
  'chimney', 'hob', 'cooktop',
  'geyser', 'water heater', 'water-heater'
];

// 3. Ineligible Categories for Physical Installation (Laptops, Mobiles, Audio, Gadgets, Wearables)
export const INSTALLATION_DISQUALIFIED_KEYWORDS = [
  'laptop', 'laptops', 'notebook', 'notebooks', 'desktop', 'desktops',
  'computer', 'computers', 'pc', 'macbook', 'chromebook',
  'mobile', 'mobiles', 'smartphone', 'smartphones',
  'tablet', 'tablets', 'ipad',
  'audio', 'speaker', 'speakers', 'soundbar', 'home theatre',
  'headphone', 'headphones', 'earphone', 'earphones', 'earbuds',
  'smartwatch', 'smart watch', 'wearable', 'wearables',
  'gadget', 'gadgets'
];

/**
 * Safely extracts all product text attributes (name, title, slug, categories, subcategories)
 * regardless of whether categories are strings, ObjectIds, or populated objects.
 */
export const getProductText = (product) => {
  if (!product) return '';
  const parts = [
    product.name,
    product.title,
    product.slug,
    typeof product.category === 'string' ? product.category : product.category?.name,
    product.category?.category_name,
    product.category?.slug,
    product.category_name,
    product.categoryName,
    typeof product.subcategory === 'string' ? product.subcategory : product.subcategory?.name,
    product.subcategory?.subcategory_name,
    product.subcategory?.slug,
    product.subcategory_name,
    product.sub_category_new_name
  ].filter(Boolean).map(s => String(s).toLowerCase());
  return parts.join(' ');
};

/**
 * Determines if a product is eligible for Extended Warranty.
 * Rejects accessories / consumables and products priced under ₹2,000.
 */
export function isExtendedWarrantyEligible(product) {
  if (!product) return false;
  const text = getProductText(product);
  if (!text) return false;

  // Check if matches accessory blacklist
  const isAccessory = ACCESSORY_KEYWORDS.some(kw => {
    if (kw.includes(' ') || kw.includes('-')) {
      return text.includes(kw);
    }
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(text) || (product.slug && String(product.slug).toLowerCase().includes(kw));
  });
  if (isAccessory) return false;

  const price = Number(product.special_price || product.price || 0);
  if (price < 2000) return false;

  return true;
}

/**
 * Determines if a product is eligible for physical Installation & Demo Service.
 * - ONLY allows physical installation appliance categories:
 *   Air Conditioners, Televisions, Washing Machines, Refrigerators,
 *   Water Purifiers, Chimneys, Geysers, Dishwashers.
 * - Disqualifies Computers & Laptops, Mobiles & Tablets, Audio/Speakers, Gadgets, and Accessories.
 */
export function isInstallationEligible(product) {
  if (!product) return false;
  const text = getProductText(product);
  if (!text) return false;

  // 1. Accessories NEVER have installation service
  const isAccessory = ACCESSORY_KEYWORDS.some(kw => {
    if (kw.includes(' ') || kw.includes('-')) {
      return text.includes(kw);
    }
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(text) || (product.slug && String(product.slug).toLowerCase().includes(kw));
  });
  if (isAccessory) return false;

  // 2. Disqualified non-appliance categories (Laptops, Mobiles, Tablets, Audio, Gadgets)
  const isDisqualified = INSTALLATION_DISQUALIFIED_KEYWORDS.some(kw => {
    if (kw.includes(' ') || kw.includes('-')) {
      return text.includes(kw);
    }
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(text);
  });
  if (isDisqualified) return false;

  // 3. Match against physical installation appliance whitelist
  return INSTALLATION_ELIGIBLE_CATEGORIES.some(c => {
    if (c === 'tv') {
      return /\btv\b/i.test(text) || text.includes('television') || text.includes('smart-tv') || text.includes('led-tv');
    }
    if (c === 'ac') {
      return /\bac\b/i.test(text) || text.includes('air-conditioner') || text.includes('split-ac') || text.includes('air conditioner');
    }
    return text.includes(c);
  });
}
