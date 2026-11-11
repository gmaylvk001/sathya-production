import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  resolveRegionalFulfillment,
  resolveOrderItemsFulfillment,
  resolveRegionVendorContext,
  itemCodeVariants,
  VENDOR_UNILET,
  VENDOR_SATHYA,
} from "../lib/regionalFulfillment.js";
import { UNILET_RESTRICTION_MESSAGE, isKarnatakaPincode } from "../lib/regionHelper.js";

// In-memory Mongoose-like model stubs for deterministic unit testing
function createMockModels({ products = [], ownerProducts = [] } = {}) {
  const matchOr = (doc, orClauses) => {
    return orClauses.some((clause) => {
      if (clause.product_id) {
        const vals = clause.product_id.$in || [clause.product_id];
        if (vals.some((v) => String(v) === String(doc.product_id))) return true;
      }
      if (clause.product_item_code) {
        const vals = clause.product_item_code.$in || [clause.product_item_code];
        if (vals.includes(doc.product_item_code)) return true;
      }
      if (clause.vendor_item_code) {
        const vals = clause.vendor_item_code.$in || [clause.vendor_item_code];
        if (vals.includes(doc.vendor_item_code)) return true;
      }
      return false;
    });
  };

  const ProductStub = {
    findById(id) {
      const found = products.find((p) => String(p._id) === String(id)) || null;
      return { lean: async () => found };
    },
    findOne(query) {
      const found =
        products.find((p) => {
          if (query.item_code?.$in) return query.item_code.$in.includes(p.item_code);
          if (query.item_code instanceof RegExp) return query.item_code.test(String(p.item_code || ""));
          if (query.item_code) return p.item_code === query.item_code;
          return false;
        }) || null;
      return { lean: async () => found };
    },
  };

  const OwnerProductStub = {
    find(query) {
      const rows = ownerProducts.filter((op) => {
        if (query.is_active !== undefined && Boolean(op.is_active) !== Boolean(query.is_active)) return false;
        if (query.owner_id instanceof RegExp && !query.owner_id.test(String(op.owner_id || ""))) return false;
        if (typeof query.owner_id === "string" && op.owner_id !== query.owner_id) return false;
        if (Array.isArray(query.$or) && !matchOr(op, query.$or)) return false;
        return true;
      });
      return { lean: async () => rows };
    },
  };

  return { Product: ProductStub, OwnerProduct: OwnerProductStub };
}

const PID_PDPZ = new mongoose.Types.ObjectId("6aa167d85cd3de24c7549902");
const PID_PDES = new mongoose.Types.ObjectId("6aa166425cd3de24c7547f81");
const PID_TN_ONLY = new mongoose.Types.ObjectId("6aa167d85cd3de24c7549999");
const PID_KA_ONLY_STOCK = new mongoose.Types.ObjectId("6aa167d85cd3de24c7548888");
const PID_UNILETEC = new mongoose.Types.ObjectId("6ad1cbed4b2d2953a1393cf5");

const fixtureModels = createMockModels({
  products: [
    {
      _id: PID_PDPZ,
      name: "LG 288 L Double Door Refrigerator (GLT2926PDPZ)",
      item_code: "GLT2926PDPZ",
      quantity: 491,
      stock_status: "In Stock",
      status: "Active",
      movement: "FAST",
    },
    {
      _id: PID_TN_ONLY,
      name: "Sathya TN Exclusive TV",
      item_code: "TNONLYTV01",
      quantity: 25,
      stock_status: "In Stock",
      status: "Active",
      movement: "FAST",
    },
    {
      _id: PID_KA_ONLY_STOCK,
      name: "KA In-Stock TN Out-Of-Stock Washer",
      item_code: "KAONLYWM01",
      quantity: 0,
      stock_status: "Out of Stock",
      status: "Active",
      movement: "FAST",
    },
    {
      _id: PID_UNILETEC,
      name: "IFB 331 L Refrigerator (UNILETEC383BIKSTM)",
      item_code: "UNILETEC383BIKSTM",
      quantity: 10,
      stock_status: "In Stock",
      status: "Active",
      movement: "FAST",
    },
  ],
  ownerProducts: [
    // Mirrors real production mapping: product_id points to sibling GLT2926PDES, vendor_item_code matches GLT2926PDPZ
    {
      _id: new mongoose.Types.ObjectId(),
      owner_id: "unilet",
      region: "karnataka",
      product_id: PID_PDES,
      product_item_code: "GLT2926PDES",
      vendor_item_code: "GLT2926PDPZ",
      stock: 142,
      stock_status: "In Stock",
      is_active: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      owner_id: "unilet",
      region: "karnataka",
      product_id: PID_KA_ONLY_STOCK,
      product_item_code: "KAONLYWM01",
      vendor_item_code: "KAONLYWM01",
      stock: 18,
      stock_status: "In Stock",
      is_active: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      owner_id: "unilet",
      region: "karnataka",
      product_id: PID_UNILETEC,
      product_item_code: "UNILETEC383BIKSTM",
      vendor_item_code: "EC-383BIKSTM",
      stock: 32,
      stock_status: "In Stock",
      is_active: true,
    },
  ],
});

test("itemCodeVariants normalizes raw, bare, and ITEM-prefixed codes", () => {
  assert.deepEqual(itemCodeVariants("GLT2926PDPZ"), ["GLT2926PDPZ", "ITEMGLT2926PDPZ"]);
  assert.deepEqual(itemCodeVariants("ITEMGLT2926PDPZ"), ["ITEMGLT2926PDPZ", "GLT2926PDPZ"]);
  assert.deepEqual(itemCodeVariants(""), []);
});

test("isKarnatakaPincode enforces 560001-599999 for 6-digit pincodes", () => {
  assert.equal(isKarnatakaPincode("560001"), true);
  assert.equal(isKarnatakaPincode("599999"), true);
  assert.equal(isKarnatakaPincode("560000"), false);
  assert.equal(isKarnatakaPincode("600001"), false);
});

test("resolveRegionVendorContext isolates KA (560001-599999) to UNILET and TN (600001-649999) to SATHYA", () => {
  const ka = resolveRegionVendorContext({ pincode: "560001", state: "Tamilnadu" });
  assert.equal(ka.assignedVendor, VENDOR_UNILET);
  assert.equal(ka.vendorId, "unilet");
  assert.equal(ka.vendorName, "Unilet");
  assert.equal(ka.region, "karnataka");

  const tn = resolveRegionVendorContext({ pincode: "600001", state: "Karnataka", region: "karnataka" });
  assert.equal(tn.assignedVendor, VENDOR_SATHYA);
  assert.equal(tn.vendorId, "sathya");
  assert.equal(tn.vendorName, "Sathya Stores");
  assert.equal(tn.region, "tamilnadu");
});

test("Bug Reproduction: GLT2926PDPZ in Bangalore 560001 resolves to UNILET with 142 stock even when OwnerProduct.product_id differs", async () => {
  const result = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    productId: String(PID_PDPZ),
    quantity: 2,
    models: fixtureModels,
  });

  assert.equal(result.isDeliverable, true);
  assert.equal(result.assignedVendor, VENDOR_UNILET);
  assert.equal(result.vendorName, "Unilet");
  assert.equal(result.availableStock, 142);
  assert.equal(result.errorReason, undefined);
});

test("Strict KA stock isolation: requesting more than Unilet stock (142) fails even when Sathya TN stock is 491", async () => {
  const result = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    productId: String(PID_PDPZ),
    quantity: 200,
    models: fixtureModels,
  });

  assert.equal(result.isDeliverable, false);
  assert.equal(result.assignedVendor, VENDOR_UNILET);
  assert.equal(result.availableStock, 142);
  assert.match(result.errorReason, /out of stock in Karnataka/i);
});

test("Strict vendor isolation: TN-only product is blocked in Karnataka and deliverable in Tamil Nadu", async () => {
  const kaRes = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    productId: String(PID_TN_ONLY),
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(kaRes.isDeliverable, false);
  assert.equal(kaRes.assignedVendor, VENDOR_UNILET);
  assert.equal(kaRes.availableStock, 0);
  assert.match(kaRes.errorReason, /currently unavailable for delivery in Karnataka/i);

  const tnRes = await resolveRegionalFulfillment({
    pincode: "600001",
    state: "Tamil Nadu",
    productId: String(PID_TN_ONLY),
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(tnRes.isDeliverable, true);
  assert.equal(tnRes.assignedVendor, VENDOR_SATHYA);
  assert.equal(tnRes.availableStock, 25);
});

test("Strict vendor isolation: KA in-stock product with 0 TN stock is deliverable in KA and out of stock in TN", async () => {
  const kaRes = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    productId: String(PID_KA_ONLY_STOCK),
    quantity: 2,
    models: fixtureModels,
  });
  assert.equal(kaRes.isDeliverable, true);
  assert.equal(kaRes.assignedVendor, VENDOR_UNILET);
  assert.equal(kaRes.availableStock, 18);

  const tnRes = await resolveRegionalFulfillment({
    pincode: "600001",
    state: "Tamil Nadu",
    productId: String(PID_KA_ONLY_STOCK),
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(tnRes.isDeliverable, false);
  assert.equal(tnRes.assignedVendor, VENDOR_SATHYA);
  assert.equal(tnRes.availableStock, 0);
});

test("Strict vendor isolation: UNILETEC-exclusive product is rejected outside Karnataka", async () => {
  const tnRes = await resolveRegionalFulfillment({
    pincode: "600001",
    state: "Tamil Nadu",
    productId: String(PID_UNILETEC),
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(tnRes.isDeliverable, false);
  assert.equal(tnRes.assignedVendor, VENDOR_SATHYA);
  assert.equal(tnRes.errorReason, UNILET_RESTRICTION_MESSAGE);

  const kaRes = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    productId: String(PID_UNILETEC),
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(kaRes.isDeliverable, true);
  assert.equal(kaRes.assignedVendor, VENDOR_UNILET);
  assert.equal(kaRes.availableStock, 32);
});

test("Legacy ITEM-prefixed item_code resolves both Product and OwnerProduct cleanly", async () => {
  const res = await resolveRegionalFulfillment({
    pincode: "560001",
    state: "Karnataka",
    itemCode: "ITEMGLT2926PDPZ",
    quantity: 1,
    models: fixtureModels,
  });
  assert.equal(res.isDeliverable, true);
  assert.equal(res.assignedVendor, VENDOR_UNILET);
  assert.equal(res.availableStock, 142);
});

test("resolveOrderItemsFulfillment aggregates multi-item cart availability cleanly", async () => {
  const okCart = await resolveOrderItemsFulfillment({
    pincode: "560001",
    state: "Karnataka",
    items: [
      { productId: String(PID_PDPZ), item_code: "GLT2926PDPZ", quantity: 2 },
      { productId: String(PID_KA_ONLY_STOCK), quantity: 1 },
    ],
    models: fixtureModels,
  });
  assert.equal(okCart.isValid, true);
  assert.equal(okCart.assignedVendor, VENDOR_UNILET);
  assert.equal(okCart.vendorName, "Unilet");
  assert.equal(okCart.unavailableItems.length, 0);

  const mixedCart = await resolveOrderItemsFulfillment({
    pincode: "560001",
    state: "Karnataka",
    items: [
      { productId: String(PID_PDPZ), item_code: "GLT2926PDPZ", quantity: 2 },
      { productId: String(PID_TN_ONLY), quantity: 1 },
    ],
    models: fixtureModels,
  });
  assert.equal(mixedCart.isValid, false);
  assert.equal(mixedCart.unavailableItems.length, 1);
  assert.equal(mixedCart.unavailableItems[0].item_code, "TNONLYTV01");
});

