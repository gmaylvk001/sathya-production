import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCompetitorPrice,
  extractAndNormalizeCompetitorDeals,
  getCompetitorDeals,
  getLastVerifiedSlot,
} from "../lib/priceTrackerService.js";

// Mock feed for reliable unit testing
const mockFeed = [
  {
    product_ean_id: "8906022177657",
    product_code: "7.5LSTDPLUS",
    type: "lsp",
    product_price: 2499,
    product_store_price: 2810,
    final_lsp_is: {
      croma_product_price: 2899,
    },
    all_lsp_competitors: {
      croma_product_price: 2899,
      reliancedigital_product_price: 2799,
    },
    // Note: amazon and flipkart are NOT present in this feed item
  },
  {
    product_ean_id: "8901225780024",
    product_code: "BLUFLAMEFINO2BSS",
    type: "lsp",
    product_price: 3290,
    product_store_price: 3500,
    final_lsp_is: {
      amazon_product_price: 3499,
      flipkart_product_price: 3699,
      croma_product_price: 3590,
    },
  },
  {
    product_ean_id: "8906022177633",
    product_code: "3LSTDPLUS",
    type: "hsp", // High selling price, NOT lsp
    product_price: 1179,
    final_hsp_is: {
      myg_product_price: 1277,
    },
  },
];

test("extractCompetitorPrice: Correctly extracts price from direct fields and nested lsp objects", () => {
  const item = {
    croma_price: 2499,
    final_lsp_is: {
      amazon_product_price: "₹3,499.00",
    },
    all_lsp_competitors: {
      flipkart_product_price: 3299,
    },
  };

  assert.equal(extractCompetitorPrice(item, "croma"), 2499);
  assert.equal(extractCompetitorPrice(item, "amazon"), 3499);
  assert.equal(extractCompetitorPrice(item, "flipkart"), 3299);
  assert.equal(extractCompetitorPrice(item, "reliancedigital"), null);
});

test("extractAndNormalizeCompetitorDeals: NEVER synthesizes fake prices when competitor is missing in feed", () => {
  const itemWithoutAmazonOrFlipkart = mockFeed[0];
  const deals = extractAndNormalizeCompetitorDeals(itemWithoutAmazonOrFlipkart, 2499);

  // Croma and Reliance Digital are present, Amazon and Flipkart are NOT
  const platformNames = deals.map((d) => d.platform);
  assert.ok(platformNames.includes("Croma"), "Croma should be included");
  assert.ok(platformNames.includes("Reliance Digital"), "Reliance Digital should be included");
  assert.equal(
    platformNames.includes("Amazon"),
    false,
    "Amazon MUST NOT be faked when missing from feed"
  );
  assert.equal(
    platformNames.includes("Flipkart"),
    false,
    "Flipkart MUST NOT be faked when missing from feed"
  );
});

test("extractAndNormalizeCompetitorDeals: Returns empty array if item type is not 'lsp'", () => {
  const hspItem = mockFeed[2]; // type: 'hsp'
  const deals = extractAndNormalizeCompetitorDeals(hspItem, 1000);
  assert.deepEqual(deals, [], "Non-lsp item must return 0 deals");
});

test("getCompetitorDeals: Strict EAN matching finds exact product and returns verified deals", async () => {
  const deals = await getCompetitorDeals({
    ean: "8906022177657",
    sathyaPrice: 2499,
    feedOverride: mockFeed,
  });

  assert.ok(deals.length > 0, "Should match product by EAN");
  const cromaDeal = deals.find((d) => d.platform === "Croma");
  assert.ok(cromaDeal, "Croma deal should exist");
  assert.equal(cromaDeal.price, 2899);
  assert.equal(cromaDeal.savingsVsSathya, 400);
  assert.equal(cromaDeal.isSathyaCheaper, true);
});

test("getCompetitorDeals: Silambu Silambu (dummy / unlisted product) returns 0 deals without false matching", async () => {
  const deals = await getCompetitorDeals({
    product_code: "SILAMBU_SILAMBU_REF",
    model_number: "SILAMBU_100",
    sathyaPrice: 10000,
    feedOverride: mockFeed,
  });

  assert.equal(deals.length, 0, "Silambu Silambu must NOT match any feed items");
});

test("getCompetitorDeals: Short substring / generic code does NOT match feed items (no endsWith abuse)", async () => {
  // Previously "PLUS" would match "3LSTDPLUS" or "7.5LSTDPLUS" via cleanFeed.endsWith(code)
  const deals = await getCompetitorDeals({
    product_code: "PLUS",
    sathyaPrice: 2000,
    feedOverride: mockFeed,
  });

  assert.equal(deals.length, 0, "Generic substring 'PLUS' must not falsely match '3LSTDPLUS'");
});

test("getCompetitorDeals: Returns empty array when product has no identifiers or invalid price", async () => {
  const noCodes = await getCompetitorDeals({
    sathyaPrice: 5000,
    feedOverride: mockFeed,
  });
  assert.equal(noCodes.length, 0, "Empty codes must return []");

  const zeroPrice = await getCompetitorDeals({
    ean: "8906022177657",
    sathyaPrice: 0,
    feedOverride: mockFeed,
  });
  assert.equal(zeroPrice.length, 0, "Zero price must return []");
});
