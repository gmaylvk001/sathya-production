/**
 * lib/storeDistrictHelper.js
 *
 * Multi-DB & Schema-Resilient Store District Extraction & Strict District Isolation Helper.
 * Handles schema variations across collections:
 *   - store.district
 *   - store.district_name
 *   - store.state_district
 *   - store.badge
 *   - store.city
 *   - store.address?.district / store.address?.city
 *   - store.service_area / store.location
 *   - store.title / store.organisation_name / store.name
 *   - 6-digit Indian PIN code ranges
 */

// Comprehensive town / area / city to canonical district dictionary
export const KNOWN_TOWNS_TO_DISTRICT = {
  // ── Tamil Nadu Districts & Towns ──
  // Dindigul
  dindigul: 'Dindigul',
  palani: 'Dindigul',
  kodaikanal: 'Dindigul',
  oddanchatram: 'Dindigul',
  odanchatram: 'Dindigul',
  nilakottai: 'Dindigul',
  nilakkottai: 'Dindigul',
  natham: 'Dindigul',
  batlagundu: 'Dindigul',
  vathalagundu: 'Dindigul',
  chinnalapatti: 'Dindigul',
  vedasandur: 'Dindigul',
  vadamadurai: 'Dindigul',
  gujiliamparai: 'Dindigul',
  athoor: 'Dindigul',
  reddiarchatram: 'Dindigul',

  // Madurai
  madurai: 'Madurai',
  iyerbanglow: 'Madurai',
  sellur: 'Madurai',
  goripalayam: 'Madurai',
  mattuthavani: 'Madurai',
  simmakkal: 'Madurai',
  othakadai: 'Madurai',
  tirumangalam: 'Madurai',
  thirumangalam: 'Madurai',
  melur: 'Madurai',
  usilampatti: 'Madurai',
  sholavandan: 'Madurai',
  vadipatti: 'Madurai',
  avaniyapuram: 'Madurai',

  // Chennai & Suburbs
  chennai: 'Chennai',
  moulivakkam: 'Chennai',
  paraniputhur: 'Chennai',
  chromepet: 'Chennai',
  padi: 'Chennai',
  omr: 'Chennai',
  neelankarai: 'Chennai',
  washermenpet: 'Chennai',
  oldwashermenpet: 'Chennai',
  tambaram: 'Chennai',
  porur: 'Chennai',
  guindy: 'Chennai',
  velachery: 'Chennai',
  annanagar: 'Chennai',
  tnagar: 'Chennai',
  ambattur: 'Chennai',
  avadi: 'Chennai',
  perambur: 'Chennai',
  mylapore: 'Chennai',
  vadapalani: 'Chennai',
  medavakkam: 'Chennai',
  sholinganallur: 'Chennai',
  alwarpet: 'Chennai',
  adyar: 'Chennai',
  kilpauk: 'Chennai',
  royapettah: 'Chennai',
  triplicane: 'Chennai',
  nungambakkam: 'Chennai',
  egmore: 'Chennai',
  saidapet: 'Chennai',
  koyambedu: 'Chennai',
  madhavaram: 'Chennai',
  redhills: 'Chennai',
  kolathur: 'Chennai',

  // Coimbatore
  coimbatore: 'Coimbatore',
  singanallur: 'Coimbatore',
  vadavalli: 'Coimbatore',
  annur: 'Coimbatore',
  goundermills: 'Coimbatore',
  tatabad: 'Coimbatore',
  mettupalayam: 'Coimbatore',
  pollachi: 'Coimbatore',
  sundarapuram: 'Coimbatore',
  kuniyamuthur: 'Coimbatore',
  saravanampatti: 'Coimbatore',
  gandhipuram: 'Coimbatore',
  sulur: 'Coimbatore',
  kinathukadavu: 'Coimbatore',
  karamadai: 'Coimbatore',

  // Tiruchirappalli
  tiruchirapalli: 'Tiruchirappalli',
  tiruchirappalli: 'Tiruchirappalli',
  trichy: 'Tiruchirappalli',
  kattur: 'Tiruchirappalli',
  srirangam: 'Tiruchirappalli',
  thennur: 'Tiruchirappalli',
  ariyamangalam: 'Tiruchirappalli',
  tollgate: 'Tiruchirappalli',
  thillainagar: 'Tiruchirappalli',
  manapparai: 'Tiruchirappalli',
  thuvakudi: 'Tiruchirappalli',

  // Salem
  salem: 'Salem',
  meyyanur: 'Salem',
  annapark: 'Salem',
  dadagapatti: 'Salem',
  gugai: 'Salem',
  attur: 'Salem',
  omalur: 'Salem',
  mettur: 'Salem',
  edappadi: 'Salem',
  suramangalam: 'Salem',
  junction: 'Salem',

  // Cuddalore
  cuddalore: 'Cuddalore',
  vadakuthu: 'Cuddalore',
  virudhachalam: 'Cuddalore',
  vriddhachalam: 'Cuddalore',
  chidambaram: 'Cuddalore',
  neyveli: 'Cuddalore',
  panruti: 'Cuddalore',
  kattumannarkoil: 'Cuddalore',
  kurinjipadi: 'Cuddalore',
  tittagudi: 'Cuddalore',

  // Thanjavur
  thanjavur: 'Thanjavur',
  kumbakonam: 'Thanjavur',
  pattukkottai: 'Thanjavur',
  thiruvaiyaru: 'Thanjavur',
  peravurani: 'Thanjavur',

  // Sivaganga
  sivaganga: 'Sivaganga',
  sivagangai: 'Sivaganga',
  karaikudi: 'Sivaganga',
  devakottai: 'Sivaganga',
  manamadurai: 'Sivaganga',
  thiruppuvanam: 'Sivaganga',

  // Dharmapuri
  dharmapuri: 'Dharmapuri',
  kariamangalam: 'Dharmapuri',
  harur: 'Dharmapuri',
  palacode: 'Dharmapuri',
  pennagaram: 'Dharmapuri',

  // Viluppuram
  viluppuram: 'Viluppuram',
  villupuram: 'Viluppuram',
  senji: 'Viluppuram',
  gingee: 'Viluppuram',
  tindivanam: 'Viluppuram',
  marakkanam: 'Viluppuram',

  // Kallakurichi
  kallakurichi: 'Kallakurichi',
  ulundurpet: 'Kallakurichi',
  sankarapuram: 'Kallakurichi',
  thirukoilur: 'Kallakurichi',

  // Krishnagiri
  krishnagiri: 'Krishnagiri',
  hosur: 'Krishnagiri',
  pochampalli: 'Krishnagiri',
  denkanikottai: 'Krishnagiri',
  uthangarai: 'Krishnagiri',

  // Namakkal
  namakkal: 'Namakkal',
  komarapalyam: 'Namakkal',
  komarapalayam: 'Namakkal',
  tiruchengode: 'Namakkal',
  rasipuram: 'Namakkal',
  paramathi: 'Namakkal',
  velur: 'Namakkal',

  // Erode
  erode: 'Erode',
  sathyamangalam: 'Erode',
  gobichettipalayam: 'Erode',
  anthiyur: 'Erode',
  puliampatti: 'Erode',
  perundurai: 'Erode',
  bhavani: 'Erode',

  // Tiruppur
  tiruppur: 'Tiruppur',
  tirupur: 'Tiruppur',
  avinashi: 'Tiruppur',
  palladam: 'Tiruppur',
  dharapuram: 'Tiruppur',
  udumalpet: 'Tiruppur',
  udumalaipettai: 'Tiruppur',
  vellakoil: 'Tiruppur',
  kangeyam: 'Tiruppur',

  // Theni
  theni: 'Theni',
  periyakulam: 'Theni',
  bodinayakanur: 'Theni',
  bodinayakkanur: 'Theni',
  bodi: 'Theni',
  cumbum: 'Theni',
  chinnamanur: 'Theni',
  andipatti: 'Theni',
  kombai: 'Theni',
  uthamapalayam: 'Theni',
  devadanapatti: 'Theni',

  // Tirunelveli
  tirunelveli: 'Tirunelveli',
  palayamkottai: 'Tirunelveli',
  ambasamudram: 'Tirunelveli',
  cheranmahadevi: 'Tirunelveli',
  valliyur: 'Tirunelveli',

  // Tenkasi
  tenkasi: 'Tenkasi',
  sankarankovil: 'Tenkasi',
  kadayanallur: 'Tenkasi',
  courtallam: 'Tenkasi',
  alangulam: 'Tenkasi',

  // Thoothukudi
  thoothukudi: 'Thoothukudi',
  tuticorin: 'Thoothukudi',
  kovilpatti: 'Thoothukudi',
  tiruchendur: 'Thoothukudi',
  kayalpattinam: 'Thoothukudi',

  // Virudhunagar
  virudhunagar: 'Virudhunagar',
  sivakasi: 'Virudhunagar',
  rajapalayam: 'Virudhunagar',
  aruppukkottai: 'Virudhunagar',
  srivilliputhur: 'Virudhunagar',
  sattur: 'Virudhunagar',

  // Vellore
  vellore: 'Vellore',
  katpadi: 'Vellore',
  gudiyatham: 'Vellore',

  // Ranipet
  ranipet: 'Ranipet',
  arokkonam: 'Ranipet',
  arakkonam: 'Ranipet',
  walajapet: 'Ranipet',
  sholinghur: 'Ranipet',

  // Tirupathur
  tirupathur: 'Tirupathur',
  ambur: 'Tirupathur',
  vaniyambadi: 'Tirupathur',

  // Tiruvannamalai
  tiruvannamalai: 'Tiruvannamalai',
  polur: 'Tiruvannamalai',
  arani: 'Tiruvannamalai',
  chengappalli: 'Tiruvannamalai',

  // Kanchipuram
  kanchipuram: 'Kanchipuram',
  sriperumbudur: 'Kanchipuram',
  walajabad: 'Kanchipuram',

  // Chengalpattu
  chengalpattu: 'Chengalpattu',
  maraimalainagar: 'Chengalpattu',
  maduranthakam: 'Chengalpattu',
  mamallapuram: 'Chengalpattu',
  guduvanchery: 'Chengalpattu',
  kelambakkam: 'Chengalpattu',

  // Tiruvallur
  tiruvallur: 'Tiruvallur',
  thiruvallur: 'Tiruvallur',
  ponneri: 'Tiruvallur',
  gummidipoondi: 'Tiruvallur',
  tiruttani: 'Tiruvallur',

  // Kanyakumari
  kanyakumari: 'Kanyakumari',
  nagercoil: 'Kanyakumari',
  marthandam: 'Kanyakumari',
  thuckalay: 'Kanyakumari',
  colachel: 'Kanyakumari',

  // Karur
  karur: 'Karur',
  kulithalai: 'Karur',
  velayuthampalayam: 'Karur',

  // Pudukkottai
  pudukkottai: 'Pudukkottai',
  aranthangi: 'Pudukkottai',

  // Ramanathapuram
  ramanathapuram: 'Ramanathapuram',
  ramnad: 'Ramanathapuram',
  paramakudi: 'Ramanathapuram',
  rameswaram: 'Ramanathapuram',

  // Nagapattinam
  nagapattinam: 'Nagapattinam',
  velankanni: 'Nagapattinam',

  // Tiruvarur
  tiruvarur: 'Tiruvarur',
  thiruvarur: 'Tiruvarur',
  mannargudi: 'Tiruvarur',

  // Mayiladuthurai
  mayiladuthurai: 'Mayiladuthurai',
  sirkazhi: 'Mayiladuthurai',

  // Ariyalur & Perambalur
  ariyalur: 'Ariyalur',
  perambalur: 'Perambalur',

  // Nilgiris
  nilgiris: 'Nilgiris',
  ooty: 'Nilgiris',
  coonoor: 'Nilgiris',
  kotagiri: 'Nilgiris',

  // ── Kerala Districts & Towns ──
  kozhikode: 'Kozhikode',
  calicut: 'Kozhikode',
  kollam: 'Kollam',
  punalur: 'Kollam',
  kochi: 'Ernakulam',
  ernakulam: 'Ernakulam',
  thiruvananthapuram: 'Thiruvananthapuram',
  trivandrum: 'Thiruvananthapuram',
  thrissur: 'Thrissur',
  palakkad: 'Palakkad',
  kannur: 'Kannur',
  malappuram: 'Malappuram',
  kottayam: 'Kottayam',
  alappuzha: 'Alappuzha',
  kasaragod: 'Kasaragod',
  wayanad: 'Wayanad',
  idukki: 'Idukki',
  pathanamthitta: 'Pathanamthitta',

  // ── Andhra Pradesh & Telangana ──
  nuzvidu: 'Eluru',
  eluru: 'Eluru',
  kadiri: 'Sri Sathya Sai',
  tuni: 'Kakinada',
  kakinada: 'Kakinada',
  narsapur: 'West Godavari',
  kavali: 'Nellore',
  nellore: 'Nellore',
  vijayawada: 'NTR',
  guntur: 'Guntur',
  visakhapatnam: 'Visakhapatnam',
  tirupati: 'Tirupati',
  kurnool: 'Kurnool',
  anantapur: 'Anantapur',
  kadapa: 'YSR Kadapa',
  rajahmundry: 'East Godavari',
  ongole: 'Prakasam',
  chittoor: 'Chittoor',
  srikakulam: 'Srikakulam',
  vizianagaram: 'Vizianagaram',
  hyderabad: 'Hyderabad',
  secunderabad: 'Hyderabad',
  warangal: 'Warangal',

  // ── Karnataka Districts & Towns ──
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  mysuru: 'Mysuru',
  mysore: 'Mysuru',
  mangaluru: 'Dakshina Kannada',
  mangalore: 'Dakshina Kannada',
  hubballi: 'Dharwad',
  hubli: 'Dharwad',
  belagavi: 'Belagavi',
  davangere: 'Davangere',
  ballari: 'Ballari',
  shivamogga: 'Shivamogga',
  tumakuru: 'Tumakuru',
  udupi: 'Udupi',
};

/** Road and street keywords to skip when parsing backwards through address lines */
const ROAD_INDICATORS = new Set([
  'road', 'rd', 'street', 'st', 'highway', 'hwy', 'salai', 'bypass', 'lane', 'avenue', 'ave', 'cross'
]);

/**
 * Clean and normalize a string candidate:
 * Returns null if invalid or falsy string ('null', 'undefined', 'n/a', 'none', '')
 */
function cleanCandidate(val) {
  if (val == null) return null;
  if (typeof val === 'object') {
    // Handle { name: 'Dindigul' } or { label: 'Dindigul' } or { district: 'Dindigul' }
    return cleanCandidate(val.name || val.label || val.district || val.value || val.title);
  }
  const str = String(val).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === '0'
  ) {
    return null;
  }
  return str;
}

/**
 * Format string as Title Case (e.g., "dindigul" -> "Dindigul", "tamil nadu" -> "Tamil Nadu")
 */
function toTitleCase(str) {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolves a raw location/district string to canonical district name via dictionary or title casing.
 */
function resolveKnownDistrict(rawStr) {
  if (!rawStr) return null;
  const cleanKey = rawStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (KNOWN_TOWNS_TO_DISTRICT[cleanKey]) {
    return KNOWN_TOWNS_TO_DISTRICT[cleanKey];
  }
  return null;
}

/**
 * Multi-DB & Schema-Resilient Canonical District Extractor
 *
 * Inspects all possible schema representations across MongoDB collections & external APIs:
 * 1. store.district
 * 2. store.district_name
 * 3. store.state_district
 * 4. store.badge
 * 5. store.address?.district
 * 6. store.city / store.address?.city
 * 7. Token analysis on store.title / store.name / store.organisation_name
 * 8. store.service_area / store.location keywords
 * 9. Backwards parsing on store.address (skipping road/street suffixes like "Chennai - Kumbakonam Road")
 * 10. Authoritative 6-digit Indian PIN code prefix analysis
 *
 * @param {object} store - Store item from store_listings, stores, or external API
 * @returns {string} - Normalized canonical district name (e.g. "Dindigul", "Chennai", "Cuddalore"), or "Other"
 */
export function getCanonicalDistrict(store) {
  if (!store || typeof store !== 'object') return 'Other';

  // 1. Direct candidate fields across all schemas
  const directCandidates = [
    store.district,
    store.district_name,
    store.state_district,
    store.badge,
    typeof store.address === 'object' && store.address !== null ? store.address.district : null,
    store.city,
    typeof store.address === 'object' && store.address !== null ? store.address.city : null,
  ];

  for (const candidate of directCandidates) {
    const cleaned = cleanCandidate(candidate);
    if (cleaned) {
      const known = resolveKnownDistrict(cleaned);
      if (known) return known;
      // If it looks like a valid single/multi-word district name, return title-cased
      const alphaOnly = cleaned.replace(/[^a-zA-Z\s]/g, '').trim();
      if (alphaOnly.length >= 3 && !ROAD_INDICATORS.has(alphaOnly.toLowerCase())) {
        return toTitleCase(alphaOnly);
      }
    }
  }

  // 2. Token match on store.title, store.name, store.organisation_name, store.store_name
  // Handles real Sathya store names like "Dindigul", "Dindigul-2", "Moulivakkam", "Vadakuthu", "Paraniputhur-Warehouse"
  const titleCandidates = [
    store.title,
    store.name,
    store.organisation_name,
    store.store_name,
  ];
  for (const tc of titleCandidates) {
    const cleaned = cleanCandidate(tc);
    if (cleaned) {
      // Split on punctuation/spaces, e.g. "Dindigul-2" -> ["dindigul", "2"], "Paraniputhur-Warehouse" -> ["paraniputhur", "warehouse"]
      const tokens = cleaned.toLowerCase().split(/[\s,._\-#/]+/).filter(Boolean);
      for (const token of tokens) {
        const cleanToken = token.replace(/[^a-z0-9]/g, '');
        if (cleanToken && KNOWN_TOWNS_TO_DISTRICT[cleanToken]) {
          return KNOWN_TOWNS_TO_DISTRICT[cleanToken];
        }
      }
    }
  }

  // 3. Scan store.service_area or store.location keywords
  // e.g. "Moulivakkam, Chennai" -> "Chennai", "Paraniputhur, Chennai" -> "Chennai"
  const areaCandidates = [store.service_area, store.location];
  for (const ac of areaCandidates) {
    const cleaned = cleanCandidate(ac);
    if (cleaned) {
      const tokens = cleaned.toLowerCase().split(/[\s,._\-#/]+/).filter(Boolean);
      for (let i = tokens.length - 1; i >= 0; i--) {
        const cleanToken = tokens[i].replace(/[^a-z0-9]/g, '');
        if (cleanToken && KNOWN_TOWNS_TO_DISTRICT[cleanToken]) {
          return KNOWN_TOWNS_TO_DISTRICT[cleanToken];
        }
      }
    }
  }

  // 4. Backwards parsing on store.address string
  // Skips road/street names like "Chennai - Kumbakonam Road" in "Vadakuthu"
  const rawAddress = typeof store.address === 'string' ? store.address : (store.location || '');
  if (rawAddress && typeof rawAddress === 'string') {
    const tokens = rawAddress.toLowerCase().split(/[\s,._\-#/]+/).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const cleanToken = tokens[i].replace(/[^a-z0-9]/g, '');
      const nextToken = i < tokens.length - 1 ? tokens[i + 1].replace(/[^a-z0-9]/g, '') : '';
      if (ROAD_INDICATORS.has(nextToken)) {
        continue; // Skip street/road names like "Madurai Road" or "Kumbakonam Road"
      }
      if (cleanToken && KNOWN_TOWNS_TO_DISTRICT[cleanToken]) {
        return KNOWN_TOWNS_TO_DISTRICT[cleanToken];
      }
    }
  }

  // 5. Authoritative 6-digit Indian PIN code boundary matching
  const pinRaw = String(store.zipcode || store.pincode || store.zip || rawAddress || '');
  const pinMatch = pinRaw.match(/\b(6\d{5}|5\d{5})\b/);
  if (pinMatch) {
    const pin = parseInt(pinMatch[1], 10);
    // Theni district pincodes (625512 - 625533, 625562, 625579, 625601 - 625605)
    if (
      (pin >= 625512 && pin <= 625533) ||
      pin === 625562 ||
      pin === 625579 ||
      (pin >= 625601 && pin <= 625605)
    ) {
      return 'Theni';
    }
    const p3 = Math.floor(pin / 1000);
    if (p3 === 624) return 'Dindigul';
    if (p3 === 628) return 'Thoothukudi';
    if (p3 === 627) return 'Tirunelveli';
    if (p3 === 625) return 'Madurai';
    if (p3 >= 600 && p3 <= 603) return 'Chennai';
    if (p3 === 641 || p3 === 642) return 'Coimbatore';
    if (p3 === 620 || p3 === 621) return 'Tiruchirappalli';
    if (p3 === 636) return 'Salem';
    if (p3 === 638) return 'Erode';
    if (p3 === 637) return 'Namakkal';
    if (p3 >= 612 && p3 <= 614) return 'Thanjavur';
    if (p3 === 635) return 'Krishnagiri';
    if (p3 === 607 || p3 === 608) return 'Cuddalore';
    if (p3 === 605 || p3 === 606) return 'Viluppuram';
    if (p3 === 622) return 'Pudukkottai';
    if (p3 === 626) return 'Virudhunagar';
    if (p3 === 629) return 'Kanyakumari';
    if (p3 === 630) return 'Sivaganga';
    if (p3 === 639) return 'Karur';
    if (p3 === 673) return 'Kozhikode';
    if (p3 === 691) return 'Kollam';
    if (p3 === 682) return 'Ernakulam';
    if (p3 >= 560 && p3 <= 591) return 'Bengaluru';
  }

  // 6. Final fallback to city field if present
  const fallbackCity = cleanCandidate(store.city);
  if (fallbackCity) {
    return toTitleCase(fallbackCity);
  }

  return 'Other';
}

/**
 * 100% Strict District Match Predicate
 *
 * Checks if a store belongs strictly to the target district.
 * If targetDistrict is 'all' or empty, returns true.
 * Otherwise, requires EXACT case-insensitive equality:
 * getCanonicalDistrict(store).toLowerCase() === targetDistrict.toLowerCase()
 *
 * Null/undefined stores or stores belonging to other districts (like Chennai or Cuddalore
 * when targetDistrict is Dindigul) return false.
 *
 * @param {object} store - Store item
 * @param {string} targetDistrict - Selected district name (e.g. "Dindigul" or "all")
 * @returns {boolean}
 */
export function isStoreInDistrict(store, targetDistrict) {
  if (!targetDistrict || targetDistrict.trim().toLowerCase() === 'all') {
    return true;
  }
  if (!store || typeof store !== 'object') {
    return false;
  }
  const canonical = getCanonicalDistrict(store);
  if (!canonical || canonical === 'Other') {
    return false;
  }
  return canonical.trim().toLowerCase() === targetDistrict.trim().toLowerCase();
}

/**
 * Strict store filter with isolated district matching and isolated search text matching
 *
 * @param {Array} stores - Array of store items
 * @param {object} options - Filter options: { selectedDistrict, searchQuery }
 * @returns {Array} - Filtered stores strictly matching both constraints
 */
export function filterStoresStrict(stores, { selectedDistrict = 'all', searchQuery = '' } = {}) {
  if (!Array.isArray(stores)) return [];
  const targetDist = (selectedDistrict || 'all').toString().trim().toLowerCase();
  const q = (searchQuery || '').toString().trim().toLowerCase();

  return stores.filter((store) => {
    if (!store || typeof store !== 'object') return false;

    // 1. Strict District Filter
    if (targetDist !== 'all') {
      const canonical = getCanonicalDistrict(store);
      if (!canonical || canonical === 'Other' || canonical.trim().toLowerCase() !== targetDist) {
        return false;
      }
    }

    // 2. Isolated Search Query Filter (only checks store name, address, and city)
    if (q) {
      const storeName = String(
        store.title || store.organisation_name || store.name || store.store_name || ''
      ).toLowerCase();
      const storeAddress = String(store.address || store.location || '').toLowerCase();
      const storeCity = String(store.city || '').toLowerCase();

      const matches =
        storeName.includes(q) || storeAddress.includes(q) || storeCity.includes(q);

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Aggregates unique districts with live store counts
 * Sorted alphabetically
 */
export function getDistrictsWithStoreCounts(stores) {
  if (!Array.isArray(stores)) return [];
  const counts = {};

  stores.forEach((store) => {
    if (!store || typeof store !== 'object') return;
    const dist = getCanonicalDistrict(store);
    if (dist && dist !== 'Other') {
      counts[dist] = (counts[dist] || 0) + 1;
    }
  });

  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      count: counts[name],
    }));
}

export default getCanonicalDistrict;
