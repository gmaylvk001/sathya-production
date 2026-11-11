import axios from "axios";

export const SUPPORTED_REGIONS = [
  "tamilnadu",
  "andhra",
  "kerala",
  "karnataka",
  "telangana",
  "all",
];

export const DEFAULT_LOCATION = {
  pincode: "600001",
  city: "chennai",
  district: "chennai",
  region: "tamilnadu",
  stateName: "Tamil Nadu",
  code: "TN",
};

export const STATE_DEFAULTS = {
  tamilnadu: {
    id: "tamilnadu",
    name: "Tamil Nadu",
    nativeName: "தமிழ்நாடு",
    code: "TN",
    defaultPincode: "600001",
    defaultCity: "chennai",
    accentColor: "#d72828",
    badgeBg: "bg-red-600",
    popularCities: [
      "Chennai",
      "Coimbatore",
      "Madurai",
      "Trichy",
      "Salem",
      "Tirunelveli",
      "Erode",
      "Vellore",
      "Thoothukudi",
      "Dindigul",
      "Thanjavur",
      "Tiruppur",
      "Nagercoil",
      "Kanchipuram",
      "Hosur",
    ],
  },
  kerala: {
    id: "kerala",
    name: "Kerala",
    nativeName: "കേരളം",
    code: "KL",
    defaultPincode: "695001",
    defaultCity: "thiruvananthapuram",
    accentColor: "#059669",
    badgeBg: "bg-emerald-600",
    popularCities: [
      "Kochi",
      "Thiruvananthapuram",
      "Kozhikode",
      "Thrissur",
      "Kollam",
      "Palakkad",
      "Alappuzha",
      "Kannur",
      "Kottayam",
      "Malappuram",
    ],
  },
  karnataka: {
    id: "karnataka",
    name: "Karnataka",
    nativeName: "ಕರ್ನಾಟಕ",
    code: "KA",
    defaultPincode: "560001",
    defaultCity: "bengaluru",
    accentColor: "#d97706",
    badgeBg: "bg-amber-600",
    popularCities: [
      "Bengaluru",
      "Mysuru",
      "Mangaluru",
      "Hubballi",
      "Belagavi",
      "Davangere",
      "Ballari",
      "Shivamogga",
      "Tumakuru",
      "Udupi",
    ],
  },
  andhra: {
    id: "andhra",
    name: "Andhra Pradesh",
    nativeName: "ఆంధ్రప్రదేశ్",
    code: "AP",
    defaultPincode: "517501",
    defaultCity: "tirupati",
    accentColor: "#4f46e5",
    badgeBg: "bg-indigo-600",
    popularCities: [
      "Visakhapatnam",
      "Vijayawada",
      "Guntur",
      "Nellore",
      "Kurnool",
      "Tirupati",
      "Kakinada",
      "Rajahmundry",
      "Anantapur",
      "Kadapa",
    ],
  },
  telangana: {
    id: "telangana",
    name: "Telangana",
    nativeName: "తెలంగాణ",
    code: "TG",
    defaultPincode: "500001",
    defaultCity: "hyderabad",
    accentColor: "#8b5cf6",
    badgeBg: "bg-purple-600",
    popularCities: [
      "Hyderabad",
      "Warangal",
      "Nizamabad",
      "Khammam",
      "Karimnagar",
      "Ramagundam",
      "Mahbubnagar",
      "Nalgonda",
    ],
  },
};

/**
 * Normalizes state name string to canonical region key
 */
export const normalizeRegion = (stateString) => {
  if (!stateString || typeof stateString !== "string") return "tamilnadu";
  const s = stateString.toLowerCase().trim();
  if (s.includes("tamil")) return "tamilnadu";
  if (s.includes("andhra")) return "andhra";
  if (s.includes("kerala")) return "kerala";
  if (s.includes("karnataka")) return "karnataka";
  if (s.includes("telangana")) return "telangana";
  return "tamilnadu";
};

/**
 * Validates 6-digit Indian pincode format
 */
export const isValidPincode = (pincode) => {
  if (!pincode) return false;
  const clean = pincode.toString().trim();
  return /^[1-9][0-9]{5}$/.test(clean);
};

/**
 * Checks if pincode falls in Karnataka postal range (560000 to 599999)
 */
export const isKarnatakaPincode = (pincode) => {
  if (!pincode) return false;
  const clean = pincode.toString().replace(/\D/g, "").trim();
  if (clean.length < 2) return false;
  const prefix2 = clean.substring(0, 2);
  const p2 = parseInt(prefix2, 10);
  if (p2 >= 56 && p2 <= 59) {
    if (clean.length >= 6) {
      const pin = parseInt(clean.substring(0, 6), 10);
      return pin >= 560000 && pin <= 599999;
    }
    return true;
  }
  return false;
};

export {
  isUniletProduct,
  isProductDeliverableToPincode,
  getWarehouseByRegion,
  UNILET_RESTRICTION_MESSAGE,
} from "./productDeliveryHelper.js";

// Major South Indian City Coordinates Fallback Table
export const CITY_COORDINATES = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  maduraisouth: { lat: 9.8929, lng: 78.1182 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  salem: { lat: 11.6643, lng: 78.1460 },
  tirunelveli: { lat: 8.7139, lng: 77.7567 },
  erode: { lat: 11.3410, lng: 77.7172 },
  vellore: { lat: 12.9165, lng: 79.1325 },
  thoothukudi: { lat: 8.7642, lng: 78.1348 },
  dindigul: { lat: 10.3673, lng: 77.9803 },
  thanjavur: { lat: 10.7870, lng: 79.1378 },
  tiruppur: { lat: 11.1085, lng: 77.3411 },
  nagercoil: { lat: 8.1833, lng: 77.4119 },
  kanchipuram: { lat: 12.8342, lng: 79.7036 },
  hosur: { lat: 12.7409, lng: 77.8253 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  mangaluru: { lat: 12.9141, lng: 74.8560 },
  hubballi: { lat: 15.3647, lng: 75.1240 },
  belagavi: { lat: 15.8497, lng: 74.4977 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  kozhikode: { lat: 11.2588, lng: 75.7804 },
  thrissur: { lat: 10.5276, lng: 76.2144 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  warangal: { lat: 17.9689, lng: 79.5941 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  vijayawada: { lat: 16.5062, lng: 80.6480 },
  guntur: { lat: 16.3067, lng: 80.4365 },
  tirupati: { lat: 13.6288, lng: 79.4192 },
  chittoor: { lat: 13.2172, lng: 79.1003 },
  kurnool: { lat: 15.8281, lng: 78.0373 },
  namakkal: { lat: 11.2189, lng: 78.1674 },
};

// Major South Indian City Pincode Mapping Table
export const CITY_PINCODES = {
  // Tamil Nadu
  chennai: "600001",
  coimbatore: "641001",
  madurai: "625001",
  maduraisouth: "625012",
  trichy: "620001",
  tiruchirappalli: "620001",
  salem: "636001",
  tirunelveli: "627001",
  erode: "638001",
  vellore: "632001",
  thoothukudi: "628001",
  tuticorin: "628001",
  dindigul: "624001",
  thanjavur: "613001",
  tiruppur: "641601",
  tirupur: "641601",
  nagercoil: "629001",
  kanchipuram: "631501",
  hosur: "635109",
  namakkal: "637001",
  karur: "639001",
  cuddalore: "607001",
  kumbakonam: "612001",
  pudukkottai: "622001",
  neyveli: "607801",
  nagapattinam: "611001",
  villupuram: "605602",
  tiruvannamalai: "606601",
  theni: "625531",
  virudhunagar: "626001",
  sivakasi: "626123",
  ramanathapuram: "623501",
  krishnagiri: "635001",
  dharmapuri: "636701",
  ooty: "643001",
  udagamandalam: "643001",

  // Kerala
  kochi: "682001",
  cochin: "682001",
  ernakulam: "682011",
  thiruvananthapuram: "695001",
  trivandrum: "695001",
  kozhikode: "673001",
  calicut: "673001",
  thrissur: "680001",
  trichur: "680001",
  kollam: "691001",
  quilon: "691001",
  palakkad: "678001",
  palghat: "678001",
  alappuzha: "688001",
  alleppey: "688001",
  kannur: "670001",
  cannanore: "670001",
  kottayam: "686001",
  malappuram: "676505",
  kasaragod: "671121",
  pathanamthitta: "689645",
  idukki: "685603",
  wayanad: "673121",

  // Karnataka
  bengaluru: "560001",
  bangalore: "560001",
  mysuru: "570001",
  mysore: "570001",
  mangaluru: "575001",
  mangalore: "575001",
  hubballi: "580020",
  hubli: "580020",
  belagavi: "590001",
  belgaum: "590001",
  davangere: "577001",
  ballari: "583101",
  bellary: "583101",
  shivamogga: "577201",
  shimoga: "577201",
  tumakuru: "572101",
  tumkur: "572101",
  udupi: "576101",
  kalaburagi: "585101",
  gulbarga: "585101",
  bidar: "585401",
  raichur: "584101",
  hassan: "573201",
  mandya: "571401",
  chikmagalur: "577101",
  chikkamagaluru: "577101",
  kolar: "563101",

  // Andhra Pradesh
  visakhapatnam: "530001",
  vizag: "530001",
  vijayawada: "520001",
  guntur: "522001",
  nellore: "524001",
  kurnool: "518001",
  tirupati: "517501",
  kakinada: "533001",
  rajahmundry: "533101",
  anantapur: "515001",
  kadapa: "516001",
  chittoor: "517001",
  eluru: "534001",
  ongole: "523001",
  srikakulam: "532001",
  vizianagaram: "535001",
  machilipatnam: "521001",

  // Telangana
  hyderabad: "500001",
  secunderabad: "500003",
  warangal: "506001",
  nizamabad: "503001",
  khammam: "507001",
  karimnagar: "505001",
  ramagundam: "505208",
  mahbubnagar: "509001",
  nalgonda: "508001",
  adilabad: "504001",
  suryapet: "508213",
  miryalaguda: "508207",
  siddipet: "502103",
};

/**
 * Returns the exact 6-digit postal pincode for a given city name
 */
export const getCityPincode = (city, region = null) => {
  if (!city || typeof city !== "string") {
    if (region && STATE_DEFAULTS[region]) return STATE_DEFAULTS[region].defaultPincode;
    return "600001";
  }
  const cleanCity = city.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  // Direct match
  if (CITY_PINCODES[cleanCity]) return CITY_PINCODES[cleanCity];

  // Try matching substring or key
  for (const [k, pin] of Object.entries(CITY_PINCODES)) {
    const cleanKey = k.replace(/[^a-z0-9]/g, "");
    if (cleanCity.includes(cleanKey) || cleanKey.includes(cleanCity)) {
      return pin;
    }
  }

  // Fallback to state default if region known
  if (region && STATE_DEFAULTS[region]) {
    return STATE_DEFAULTS[region].defaultPincode;
  }
  return "600001";
};

/**
 * Resolves location details and geographic coordinates for a 6-digit pincode
 */
export const lookupPincode = async (pincode) => {
  const cleanPin = pincode ? pincode.toString().trim() : "";
  if (!isValidPincode(cleanPin)) {
    return {
      status: "error",
      isValid: false,
      isServiceable: false,
      message: "Invalid 6-digit pincode",
      ...DEFAULT_LOCATION,
    };
  }

  // Civilian pincodes in India start with 1 to 8 (0 and 9 are invalid for civilian delivery)
  if (cleanPin.startsWith("0") || cleanPin.startsWith("9")) {
    return {
      status: "error",
      isValid: false,
      isServiceable: false,
      message: "Invalid civil postal code",
      ...DEFAULT_LOCATION,
    };
  }

  // 1. Direct match with major city pincodes dictionary
  const cityEntry = Object.entries(CITY_PINCODES).find(([_, pin]) => pin === cleanPin);
  if (cityEntry) {
    const cityName = cityEntry[0];
    const coords = CITY_COORDINATES[cityName] || CITY_COORDINATES.chennai;
    const region = Object.keys(STATE_DEFAULTS).find((r) =>
      STATE_DEFAULTS[r].popularCities.some((c) => c.toLowerCase() === cityName.toLowerCase())
    ) || "tamilnadu";
    const stateMeta = STATE_DEFAULTS[region] || STATE_DEFAULTS.tamilnadu;

    return {
      status: "success",
      isValid: true,
      pincode: cleanPin,
      city: cityName,
      district: cityName,
      stateName: stateMeta.name,
      region,
      code: stateMeta.code,
      latitude: coords.lat,
      longitude: coords.lng,
    };
  }

  // 2. Query India Post Postal Directory API to verify actual postal existence
  let city = null;
  let district = null;
  let stateName = null;
  let region = null;
  let isValid = false;

  try {
    const res = await axios.get(
      `https://api.postalpincode.in/pincode/${cleanPin}`,
      { timeout: 8000 }
    );
    const data = res.data;

    if (
      Array.isArray(data) &&
      data[0]?.Status === "Success" &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const po = data[0].PostOffice[0];
      district = po.District || po.Name || "";
      city = (po.District || po.Name || "unknown").toLowerCase();
      stateName = po.State || "Tamil Nadu";
      region = normalizeRegion(stateName);
      isValid = true;
    } else if (
      Array.isArray(data) &&
      (data[0]?.Status === "Error" || data[0]?.Message === "No records found")
    ) {
      // Definitively non-existent in India Post directory
      return {
        status: "error",
        isValid: false,
        isServiceable: false,
        message: "Invalid or non-existent postal code",
        pincode: cleanPin,
      };
    }
  } catch (err) {
    console.error("Postal API error:", err.message);
  }

  // If India Post did not confirm existence, do not guess or assign arbitrary coordinates
  if (!isValid) {
    return {
      status: "error",
      isValid: false,
      isServiceable: false,
      message: "Unable to verify postal code existence",
      pincode: cleanPin,
    };
  }

  // 3. For confirmed valid postal codes, resolve geographic coordinates
  let latitude = null;
  let longitude = null;

  try {
    const nomRes = await axios.get(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=jsonv2`,
      {
        headers: { "User-Agent": "SathyaStore/1.0" },
        timeout: 3000,
      }
    );
    if (Array.isArray(nomRes.data) && nomRes.data.length > 0) {
      latitude = parseFloat(nomRes.data[0].lat);
      longitude = parseFloat(nomRes.data[0].lon);
    }
  } catch {
    // ignore geocoding timeout
  }

  // Fallback to city coordinates for valid pincode
  if (!latitude || !longitude) {
    const cleanCity = (city || "").replace(/[^a-z0-9]/g, "");
    const cityCoords =
      CITY_COORDINATES[cleanCity] ||
      CITY_COORDINATES[city] ||
      CITY_COORDINATES[STATE_DEFAULTS[region]?.defaultCity] ||
      CITY_COORDINATES.chennai;
    latitude = cityCoords.lat;
    longitude = cityCoords.lng;
  }

  const stateMeta = STATE_DEFAULTS[region] || STATE_DEFAULTS.tamilnadu;

  return {
    status: "success",
    isValid: true,
    pincode: cleanPin,
    city: city || stateMeta.defaultCity,
    district: district || city || stateMeta.defaultCity,
    stateName: stateName || stateMeta.name,
    region: region || "tamilnadu",
    code: stateMeta.code,
    latitude,
    longitude,
  };
};

/**
 * Reverse geocodes latitude/longitude via OpenStreetMap Nominatim
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: { "User-Agent": "SathyaStore/1.0" },
        timeout: 4000,
      }
    );
    const data = res.data;
    const address = data?.address || {};
    const stateName = address.state || address.region || "Tamil Nadu";
    const region = normalizeRegion(stateName);
    const stateMeta = STATE_DEFAULTS[region] || STATE_DEFAULTS.tamilnadu;
    const city = (address.city || address.town || address.district || address.county || stateMeta.defaultCity).toLowerCase();
    const district = (address.state_district || address.district || address.county || address.city || stateMeta.defaultCity).toLowerCase();
    const pincode = isValidPincode(address.postcode) ? address.postcode : stateMeta.defaultPincode;
    const locality =
      address.suburb ||
      address.neighbourhood ||
      address.residential ||
      address.subdistrict ||
      address.locality ||
      address.road ||
      "";

    return {
      status: "success",
      pincode,
      city,
      district,
      locality,
      stateName,
      region,
      code: stateMeta.code,
      displayName: data?.display_name || "",
    };
  } catch (err) {
    console.error("Reverse geocoding error:", err.message);
    return {
      status: "fallback",
      ...DEFAULT_LOCATION,
    };
  }
};
