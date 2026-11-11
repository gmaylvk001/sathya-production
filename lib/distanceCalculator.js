import { CITY_COORDINATES, CITY_PINCODES } from "./regionHelper.js";

/**
 * Calculates Great-Circle / Haversine distance between two geographic coordinates in kilometers.
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return Infinity;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return Infinity;
  }

  const R = 6371; // Radius of the Earth in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Resolves physical store coordinates from location_map, website URL (Google Maps pin/query),
 * coordinate strings, known branch zipcodes, or city coordinates fallback.
 */
export const resolveStoreCoordinates = (store) => {
  if (!store) return null;

  // 1. Direct location_map coordinates if populated
  if (
    store.location_map &&
    typeof store.location_map.lat === "number" &&
    store.location_map.lat !== 0 &&
    typeof store.location_map.lng === "number" &&
    store.location_map.lng !== 0
  ) {
    return {
      lat: Number(store.location_map.lat),
      lng: Number(store.location_map.lng),
    };
  }

  // 2. Parse from store.website / store.location (Google Maps URL or raw coordinate string)
  const url = String(store.website || store.location || "").trim();
  if (url) {
    // 2a. Google Maps place pin: !8m2!3d{lat}!4d{lng}
    let m = url.match(/!8m2!3d([0-9.-]+)!4d([0-9.-]+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // 2b. Google Maps destination point: !2m2!1d{lng}!2d{lat}
    m = url.match(/!2m2!1d([0-9.-]+)!2d([0-9.-]+)/);
    if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };

    // 2c. Google Maps query parameter: q=lat,lng
    m = url.match(/q=([0-9.-]+),([0-9.-]+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // 2d. Plain lat,lng,zoom string (e.g. 11.020152,76.960893,855m)
    m = url.match(/^([0-9.]+),([0-9.]+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // 2e. Viewport center fallback: @lat,lng
    m = url.match(/@([0-9.-]+),([0-9.-]+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }

  // 3. Known branch zipcode fallbacks or city pincode mapping
  const pin = String(store.zipcode || store.zip_code || store.pincode || "").trim();
  if (pin === "641041") return { lat: 11.0267, lng: 76.9022 };
  if (pin === "638111") return { lat: 11.1098, lng: 77.7214 };
  if (pin && typeof CITY_PINCODES === "object") {
    const matchedCity = Object.keys(CITY_PINCODES).find(
      (c) => CITY_PINCODES[c] === pin
    );
    if (matchedCity && CITY_COORDINATES && CITY_COORDINATES[matchedCity]) {
      return {
        lat: CITY_COORDINATES[matchedCity].lat,
        lng: CITY_COORDINATES[matchedCity].lng,
      };
    }
  }

  // 4. Fallback to city coordinates table
  const cleanCity = String(store.city || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleanCity && CITY_COORDINATES && CITY_COORDINATES[cleanCity]) {
    return {
      lat: CITY_COORDINATES[cleanCity].lat,
      lng: CITY_COORDINATES[cleanCity].lng,
    };
  }

  return null;
};

/**
 * Calculates delivery days based on distance from store/warehouse, matching Laravel formula:
 * days = ceil(min_distance / (kilometers / days))
 */
export const calculateDeliveryDays = (
  minDistanceKm,
  kmPerDay = 100,
  baseDays = 1
) => {
  if (!minDistanceKm || minDistanceKm <= 0) {
    return 1;
  }
  const speed = kmPerDay / baseDays;
  const computedDays = Math.ceil(minDistanceKm / speed);
  return Math.max(1, Math.min(computedDays, 7));
};

/**
 * Formats delivery message string
 */
export const formatDeliveryMessage = (days, isExactStoreMatch = false) => {
  if (isExactStoreMatch || days <= 1) {
    return "Delivery in One Day";
  }
  return `Delivery in ${days} Days`;
};

