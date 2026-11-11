const ANY_REGEX = /^(any|all)$/i;

export function isAnyValue(value) {
  return value == null || String(value).trim() === "" || ANY_REGEX.test(String(value).trim());
}

export function normalizeOfferValue(value, fallback = "ANY") {
  const text = String(value ?? "").trim();
  if (!text || ANY_REGEX.test(text)) return fallback;
  return text;
}

function compactText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function fieldMatches(offerValue, selectedValue) {
  if (isAnyValue(offerValue) || isAnyValue(selectedValue)) return true;
  const offer = String(offerValue).trim().toLowerCase();
  const selected = String(selectedValue).trim().toLowerCase();
  if (offer === selected) return true;
  const compactOffer = compactText(offer);
  const compactSelected = compactText(selected);
  if (!compactOffer || !compactSelected) return false;
  if (compactOffer === compactSelected) return true;
  const shorter = compactOffer.length <= compactSelected.length ? compactOffer : compactSelected;
  const longer = shorter === compactOffer ? compactSelected : compactOffer;
  return shorter.length >= 3 && longer.includes(shorter);
}

export function categoryMatches(offerCategory, productCategory) {
  if (isAnyValue(offerCategory)) return true;
  const selected = String(productCategory || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes(String(offerCategory).trim().toLowerCase());
}

/**
 * Pincode prefix → district / metro used as exchange zone.
 * 4-digit keys win over 3-digit (Theni vs Madurai, Tiruppur vs Erode, etc.).
 */
const PIN_PREFIX_TO_CITY = {
  // Chennai metro + surroundings (zone "Chennai 01" covers these)
  600: "Chennai",
  601: "Chennai",
  602: "Chennai",
  6020: "Tiruvallur",
  6021: "Tiruvallur",
  6022: "Tiruvallur",
  6023: "Tiruvallur",
  603: "Chennai",
  6031: "Chengalpattu",
  6032: "Chengalpattu",
  6033: "Chengalpattu",
  6034: "Chengalpattu",

  // Rest of Tamil Nadu (all major districts)
  604: "Viluppuram",
  605: "Viluppuram",
  6050: "Puducherry",
  6051: "Puducherry",
  606: "Kallakurichi",
  6064: "Tiruvannamalai",
  6065: "Tiruvannamalai",
  6066: "Tiruvannamalai",
  6067: "Tiruvannamalai",
  6068: "Tiruvannamalai",
  607: "Cuddalore",
  608: "Cuddalore",
  609: "Mayiladuthurai",
  610: "Tiruvarur",
  611: "Nagapattinam",
  612: "Thanjavur",
  613: "Thanjavur",
  614: "Thanjavur",
  620: "Tiruchirappalli",
  621: "Tiruchirappalli",
  6216: "Perambalur",
  6217: "Perambalur",
  6218: "Ariyalur",
  622: "Pudukkottai",
  623: "Ramanathapuram",
  624: "Dindigul",
  625: "Madurai",
  6255: "Theni",
  6256: "Theni",
  626: "Virudhunagar",
  627: "Tirunelveli",
  6277: "Tenkasi",
  6278: "Tenkasi",
  628: "Thoothukudi",
  629: "Kanyakumari",
  630: "Sivaganga",
  631: "Kanchipuram",
  632: "Vellore",
  6324: "Ranipet",
  6325: "Tirupathur",
  635: "Krishnagiri",
  6352: "Dharmapuri",
  636: "Salem",
  6367: "Dharmapuri",
  6368: "Dharmapuri",
  6369: "Dharmapuri",
  637: "Namakkal",
  638: "Erode",
  6386: "Tiruppur",
  6387: "Tiruppur",
  639: "Karur",
  641: "Coimbatore",
  6416: "Tiruppur",
  6417: "Tiruppur",
  642: "Coimbatore",
  6421: "Tiruppur",
  643: "Nilgiris",

  // Karnataka / Kerala (common)
  560: "Bengaluru",
  561: "Bengaluru",
  562: "Bengaluru",
  682: "Ernakulam",
  673: "Kozhikode",
  691: "Kollam",
  695: "Thiruvananthapuram",
};

/** Also match admin zones like "Karur 01", "Namakkal 01", "Chennai 01". */
function cityZoneAliases(city) {
  const name = String(city || "").trim();
  if (!name) return [];
  return [name, `${name} 01`, `${name}01`, `${name} 1`, `${name}-01`];
}

export function cityForPincodePrefix(pincode) {
  const digits = String(pincode || "").replace(/\D/g, "");
  if (digits.length < 3) return null;
  if (digits.length >= 4) {
    const four = PIN_PREFIX_TO_CITY[parseInt(digits.slice(0, 4), 10)];
    if (four) return four;
  }
  return PIN_PREFIX_TO_CITY[parseInt(digits.slice(0, 3), 10)] || null;
}

export function collectZoneAliases({
  pincode = "",
  city = "",
  region = "",
  stateName = "",
  zoneNames = [],
} = {}) {
  const fromPrefix = cityForPincodePrefix(pincode);
  const aliases = [
    pincode,
    city,
    region,
    stateName,
    fromPrefix,
    ...cityZoneAliases(fromPrefix),
    ...cityZoneAliases(city),
    ...zoneNames,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(aliases)];
}

export function zoneMatchesOffer(offerZone, zoneAliases = []) {
  if (isAnyValue(offerZone)) return true;
  return zoneAliases.some((alias) => fieldMatches(offerZone, alias));
}

export function specificityScore(offer, { zone = "", zoneAliases = [] } = {}) {
  let score = 0;
  if (!isAnyValue(offer.categoryName)) score += 8;
  if (!isAnyValue(offer.type)) score += 4;
  if (!isAnyValue(offer.brand)) score += 4;
  if (!isAnyValue(offer.condition)) score += 2;
  if (!isAnyValue(offer.zone)) {
    const offerZone = String(offer.zone).trim().toLowerCase();
    const aliases = [zone, ...zoneAliases]
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
    if (aliases.includes(offerZone)) score += 3;
  }
  return score;
}

export function uniqueSorted(values) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function collectDescendantIds(categories, parentId) {
  const root = String(parentId);
  const childrenByParent = new Map();
  for (const category of categories) {
    const parent = category.parentid && category.parentid !== "none" ? String(category.parentid) : null;
    if (!parent) continue;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(String(category._id));
  }

  const ids = [root];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    for (const childId of childrenByParent.get(current) || []) {
      if (!ids.includes(childId)) {
        ids.push(childId);
        queue.push(childId);
      }
    }
  }
  return ids;
}
