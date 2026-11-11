import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct } from "../lib/normalizeProduct.js";
import {
  isValidPincode,
  isKarnatakaPincode,
  lookupPincode,
} from "../lib/regionHelper.js";
import {
  calculateHaversineDistance,
  calculateDeliveryDays,
  formatDeliveryMessage,
  resolveStoreCoordinates,
} from "../lib/distanceCalculator.js";

// ============================================================================
// RECENTLY VIEWED & STOREFRONT BRAND NORMALIZATION REGRESSION TESTS
// ============================================================================

test("normalizeProduct: Never fallback brand to 'SATHYA' when brand is missing or empty", () => {
  const rawProduct = {
    _id: "prod-001",
    name: "Generic Unbranded Cable",
    price: 499,
    quantity: 10,
    stock_status: "In Stock",
  };

  const normalized = normalizeProduct(rawProduct);
  assert.equal(normalized.brandName, "", "Brand name should be empty, not 'SATHYA'");
  assert.notEqual(normalized.brandName, "SATHYA", "Must not invent 'SATHYA' brand");
});

test("normalizeProduct: Resolves brand from brandMap using ObjectId brand key", () => {
  const brandId = "60d5ecb8b5c9c61234567890";
  const rawProduct = {
    _id: "prod-002",
    name: "OLED Smart TV",
    brand: brandId,
    price: 85000,
    quantity: 5,
    stock_status: "In Stock",
  };
  const brandMap = {
    [brandId]: "Sony",
  };

  const normalized = normalizeProduct(rawProduct, brandMap);
  assert.equal(normalized.brandName, "Sony", "Should resolve Sony from brandMap via ID");
});

test("normalizeProduct: Resolves brand from nested brand object", () => {
  const rawProduct = {
    _id: "prod-003",
    name: "Galaxy S24 Ultra",
    brand: { _id: "brand-samsung", name: "Samsung" },
    price: 129999,
    quantity: 3,
    stock_status: "In Stock",
  };

  const normalized = normalizeProduct(rawProduct);
  assert.equal(normalized.brandName, "Samsung", "Should resolve brand from brand.name");
});

test("normalizeProduct: Infers brand from product name first word when in brandMap", () => {
  const rawProduct = {
    _id: "prod-004",
    name: "LG Double Door Refrigerator",
    price: 32000,
    quantity: 2,
    stock_status: "In Stock",
  };
  const brandMap = {
    "brand-lg": "LG",
    "brand-whirlpool": "Whirlpool",
  };

  const normalized = normalizeProduct(rawProduct, brandMap);
  assert.equal(normalized.brandName, "LG", "Should infer LG from first word");
});

test("normalizeProduct: Correctly handles inStock flag when boolean or string", () => {
  const instockItem = {
    _id: "prod-005",
    inStock: true,
    price: 1000,
  };
  assert.equal(normalizeProduct(instockItem).inStock, true);

  const outOfStockItem = {
    _id: "prod-006",
    stock_status: "Out of Stock",
    quantity: 0,
    price: 1000,
  };
  assert.equal(normalizeProduct(outOfStockItem).inStock, false);
});

// ============================================================================
// DELIVERY VALIDATION & REGION HELPER REGRESSION TESTS
// ============================================================================

test("isValidPincode: Validates standard 6-digit Indian postal codes", () => {
  assert.equal(isValidPincode("600001"), true);
  assert.equal(isValidPincode("560001"), true);
  assert.equal(isValidPincode("12345"), false, "5 digits is invalid");
  assert.equal(isValidPincode("6000001"), false, "7 digits is invalid");
  assert.equal(isValidPincode("60000A"), false, "alphanumeric is invalid");
  assert.equal(isValidPincode(""), false, "empty string is invalid");
  assert.equal(isValidPincode(null), false, "null is invalid");
});

test("lookupPincode: Rejects invalid civilian pincodes starting with 0 or 9", async () => {
  const pinStartingZero = await lookupPincode("012345");
  assert.equal(pinStartingZero.status, "error");
  assert.equal(pinStartingZero.isValid, false);
  assert.equal(pinStartingZero.isServiceable, false);

  const pinStartingNine = await lookupPincode("999999");
  assert.equal(pinStartingNine.status, "error");
  assert.equal(pinStartingNine.isValid, false);
  assert.equal(pinStartingNine.isServiceable, false);
});

test("lookupPincode: Resolves known city pincodes accurately", async () => {
  const chennaiResult = await lookupPincode("600001");
  assert.equal(chennaiResult.status, "success");
  assert.equal(chennaiResult.isValid, true);
  assert.equal(chennaiResult.city, "chennai");
  assert.equal(chennaiResult.region, "tamilnadu");
  assert.ok(chennaiResult.latitude > 12 && chennaiResult.latitude < 14);
  assert.ok(chennaiResult.longitude > 79 && chennaiResult.longitude < 81);

  const bangaloreResult = await lookupPincode("560001");
  assert.equal(bangaloreResult.status, "success");
  assert.equal(bangaloreResult.isValid, true);
  assert.equal(bangaloreResult.region, "karnataka");
});

test("lookupPincode: Resolves Madurai pincode 625012 accurately", async () => {
  const maduraiResult = await lookupPincode("625012");
  assert.equal(maduraiResult.status, "success");
  assert.equal(maduraiResult.isValid, true);
  assert.equal(maduraiResult.region, "tamilnadu");
  assert.ok(maduraiResult.latitude > 9 && maduraiResult.latitude < 11);
  assert.ok(maduraiResult.longitude > 77 && maduraiResult.longitude < 79);
});

test("isKarnatakaPincode: Identifies Karnataka prefixes (56-59)", () => {
  assert.equal(isKarnatakaPincode("560001"), true);
  assert.equal(isKarnatakaPincode("590001"), true);
  assert.equal(isKarnatakaPincode("600001"), false);
});

test("calculateHaversineDistance: Accurately calculates km distance between coordinates", () => {
  // Chennai (13.0827, 80.2707) to Coimbatore (11.0168, 76.9558) is ~420-430 km
  const dist = calculateHaversineDistance(13.0827, 80.2707, 11.0168, 76.9558);
  assert.ok(dist >= 400 && dist <= 450, `Distance should be ~420km, got ${dist}`);
});

test("calculateDeliveryDays and formatDeliveryMessage: Produces accurate delivery SLA", () => {
  const oneDay = calculateDeliveryDays(30, 100, 1);
  assert.equal(oneDay, 1);
  assert.equal(formatDeliveryMessage(oneDay, false), "Delivery in One Day");

  const twoDays = calculateDeliveryDays(150, 100, 1);
  assert.equal(twoDays, 2);
  assert.equal(formatDeliveryMessage(twoDays, false), "Delivery in 2 Days");

  const multiDays = calculateDeliveryDays(350, 100, 1);
  assert.equal(multiDays, 4);
  assert.equal(formatDeliveryMessage(multiDays, false), "Delivery in 4 Days");
});

// ============================================================================
// STORE COORDINATES RESOLUTION (PRODUCTION DB FORMAT RESILIENCE)
// ============================================================================

test("resolveStoreCoordinates: Handles existing location_map objects", () => {
  const store = {
    name: "Coimbatore Store",
    location_map: { lat: 11.0168, lng: 76.9558 },
  };
  const coords = resolveStoreCoordinates(store);
  assert.deepEqual(coords, { lat: 11.0168, lng: 76.9558 });
});

test("resolveStoreCoordinates: Parses raw Google Maps coordinate strings in store.website (Production DB format)", () => {
  // Production mongodb 'sathyamongodb' stores raw coords like: '11.020152,76.960893,855m'
  const store = {
    name: "Sathya Store Peelamedu",
    website: "11.020152,76.960893,855m",
  };
  const coords = resolveStoreCoordinates(store);
  assert.ok(coords !== null, "Should parse raw coordinates");
  assert.ok(Math.abs(coords.lat - 11.020152) < 0.0001);
  assert.ok(Math.abs(coords.lng - 76.960893) < 0.0001);
});

test("resolveStoreCoordinates: Parses Google Maps URLs containing @lat,lng or ?q=lat,lng", () => {
  const storeWithAt = {
    name: "Store Trichy",
    website: "https://www.google.com/maps/place/Sathya/@10.7905,78.7047,15z/data=...",
  };
  const coordsAt = resolveStoreCoordinates(storeWithAt);
  assert.ok(coordsAt !== null);
  assert.ok(Math.abs(coordsAt.lat - 10.7905) < 0.001);
  assert.ok(Math.abs(coordsAt.lng - 78.7047) < 0.001);

  const storeWithQ = {
    name: "Store Madurai",
    website: "https://maps.google.com/?q=9.9252,78.1198",
  };
  const coordsQ = resolveStoreCoordinates(storeWithQ);
  assert.ok(coordsQ !== null);
  assert.ok(Math.abs(coordsQ.lat - 9.9252) < 0.001);
  assert.ok(Math.abs(coordsQ.lng - 78.1198) < 0.001);
});

test("resolveStoreCoordinates: Falls back to pincode or city coordinates when website coordinate is missing", () => {
  const storeWithPin = {
    name: "Store with zip",
    zip_code: "625001",
  };
  const coordsPin = resolveStoreCoordinates(storeWithPin);
  assert.ok(coordsPin !== null, "Should resolve from zip_code");
  assert.ok(coordsPin.lat > 9 && coordsPin.lat < 11);

  const storeWithCity = {
    name: "Store with city",
    city: "Tirunelveli",
  };
  const coordsCity = resolveStoreCoordinates(storeWithCity);
  assert.ok(coordsCity !== null, "Should resolve from city");
  assert.ok(coordsCity.lat > 8 && coordsCity.lat < 9);
});

test("Delivery Serviceability: Madurai pincode 625012 within 3km qualifies for 1-day delivery and store pickup", () => {
  const userLat = 9.8929;
  const userLng = 78.1182;
  const storeCoord = { lat: 9.9252, lng: 78.1198 }; // ~3.5 km away
  const distance = calculateHaversineDistance(userLat, userLng, storeCoord.lat, storeCoord.lng);

  assert.ok(distance < 5, `Expected distance < 5km, got ${distance}`);
  const deliveryDays = calculateDeliveryDays(distance, 50, 1);
  assert.equal(deliveryDays, 1);
  assert.equal(formatDeliveryMessage(deliveryDays, false), "Delivery in One Day");

// Store pickup radius is 35km
  const isPickupEligible = distance <= 35;
  assert.equal(isPickupEligible, true, "Store pickup must be eligible within 35km");
});

// ============================================================================
// STOCK STATUS & ONLINE PURCHASE ELIGIBILITY REGRESSION TESTS
// ============================================================================

test("isMovementAllowed: Whitelisted movements allow online purchasing", async () => {
  const { isMovementAllowed } = await import("../lib/addCartConfig.js");
  assert.equal(isMovementAllowed("FAST"), true, "FAST movement should be allowed online");
  assert.equal(isMovementAllowed("fast"), true, "fast (lowercase) should be allowed online");
  assert.equal(isMovementAllowed("FOCUS"), true, "FOCUS movement should be allowed online");
  assert.equal(isMovementAllowed("SPL FOCUS"), true, "SPL FOCUS should be allowed online");
  assert.equal(isMovementAllowed("Fast-CE"), true, "Fast-CE should be allowed online");
  assert.equal(isMovementAllowed("CUS-Order"), true, "CUS-Order should be allowed online");
  assert.equal(isMovementAllowed("Open-Box"), true, "Open-Box should be allowed online");
});

test("isMovementAllowed: Offline retail showroom movements (NON ROL, EOL, empty) are restricted from online cart", async () => {
  const { isMovementAllowed } = await import("../lib/addCartConfig.js");
  assert.equal(isMovementAllowed("NON ROL"), false, "NON ROL is retail showroom only");
  assert.equal(isMovementAllowed("non rol"), false, "non rol (lowercase) should be rejected");
  assert.equal(isMovementAllowed("EOL"), false, "EOL is offline store only");
  assert.equal(isMovementAllowed(""), false, "Empty movement should be rejected");
  assert.equal(isMovementAllowed(null), false, "Null movement should be rejected");
  assert.equal(isMovementAllowed(undefined), false, "Undefined movement should be rejected");
});

test("checkProductAvailability: Unifies stock label and online cart eligibility", async () => {
  const { checkProductAvailability } = await import("../utils/compareHelpers.js");

  // Case 1: Online purchasable in-stock item (FAST)
  const onlineInStock = checkProductAvailability({
    stock_status: "In Stock",
    quantity: 15,
    movement: "FAST",
  });
  assert.equal(onlineInStock.inStock, true);
  assert.equal(onlineInStock.canAddToCart, true);
  assert.equal(onlineInStock.label, "In Stock (15 units)");

  // Case 2: Store-only in-stock item (NON ROL, e.g. Silambu Silambu with 200 store units)
  const storeOnlyItem = checkProductAvailability({
    stock_status: "In Stock",
    quantity: 200,
    movement: "NON ROL",
  });
  assert.equal(storeOnlyItem.inStock, false, "Store-only item must not report online inStock");
  assert.equal(storeOnlyItem.canAddToCart, false, "Store-only item must not allow add to cart");
  assert.equal(storeOnlyItem.label, "Sold Out Online", "Label must match button state");

  // Case 3: Completely out of stock item
  const outOfStockItem = checkProductAvailability({
    stock_status: "Out of Stock",
    quantity: 0,
    movement: "FAST",
  });
  assert.equal(outOfStockItem.inStock, false);
  assert.equal(outOfStockItem.canAddToCart, false);
  assert.equal(outOfStockItem.label, "Out of Stock");
});

