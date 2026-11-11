import test from "node:test";
import assert from "node:assert/strict";
import { isExtendedWarrantyEligible, isInstallationEligible } from "../lib/productServiceEligibility.js";

test("Extended Warranty: Non-electronic accessories (bags, sleeves, cables, mounts) are disqualified", () => {
  assert.equal(isExtendedWarrantyEligible({ name: "Acer Laptop Carry Bag", price: 999 }), false);
  assert.equal(isExtendedWarrantyEligible({ name: "USB-C Fast Charging Cable", price: 499 }), false);
  assert.equal(isExtendedWarrantyEligible({ name: "TV Wall Mount Bracket", price: 2500 }), false);
  assert.equal(isExtendedWarrantyEligible({ name: "Tempered Glass Screen Guard", price: 399 }), false);
});

test("Extended Warranty: Items under ₹2,000 are disqualified", () => {
  assert.equal(isExtendedWarrantyEligible({ name: "Mini Trimmer", price: 1200 }), false);
  assert.equal(isExtendedWarrantyEligible({ name: "Headphone Adapter", price: 1999 }), false);
});

test("Extended Warranty: Electronics >= ₹2,000 are eligible", () => {
  assert.equal(isExtendedWarrantyEligible({ name: "Acer Aspire 5 Laptop", price: 45000, category_name: "Laptops" }), true);
  assert.equal(isExtendedWarrantyEligible({ name: "Samsung 55 Inch Smart TV", price: 52000, category_name: "smart-tv" }), true);
  assert.equal(isExtendedWarrantyEligible({ name: "LG Washing Machine", price: 34000, category_name: "washing-machine" }), true);
  assert.equal(isExtendedWarrantyEligible({ name: "iPhone 15 Mobile", price: 65000, category_name: "Mobiles" }), true);
});

test("Installation Service: Physical appliances pass eligibility", () => {
  assert.equal(isInstallationEligible({ name: "Samsung 55 Inch Smart TV", category_name: "smart-tv" }), true);
  assert.equal(isInstallationEligible({ name: "Voltas 1.5 Ton Split AC", category_name: "split-ac" }), true);
  assert.equal(isInstallationEligible({ name: "LG Front Load Washing Machine", category_name: "washing-machine" }), true);
  assert.equal(isInstallationEligible({ name: "Whirlpool Double Door Refrigerator", category_name: "refrigerator" }), true);
  assert.equal(isInstallationEligible({ name: "Kent Grand Plus Water Purifier", category_name: "water-purifier" }), true);
  assert.equal(isInstallationEligible({ name: "Faber Kitchen Chimney", category_name: "chimney" }), true);
  assert.equal(isInstallationEligible({ name: "AO Smith 15L Geyser", category_name: "geyser" }), true);
  assert.equal(isInstallationEligible({ name: "Bosch 13 Place Dishwasher", category_name: "dishwasher" }), true);
});

test("Installation Service: Laptops, Mobiles, Audio, Gadgets, and Accessories are INELIGIBLE", () => {
  assert.equal(isInstallationEligible({ name: "Acer Aspire 3 Laptop", category_name: "Laptops" }), false);
  assert.equal(isInstallationEligible({ name: "HP Pavilion 15 Notebook", category_name: "Computers & Laptops" }), false);
  assert.equal(isInstallationEligible({ name: "Apple MacBook Air M2", category_name: "Computers & Laptops" }), false);
  assert.equal(isInstallationEligible({ name: "Acer Laptop Carry Bag", category_name: "accessories" }), false);
  assert.equal(isInstallationEligible({ name: "USB-C Cable", category_name: "Cables" }), false);
  assert.equal(isInstallationEligible({ name: "Apple iPhone 15 Pro", category_name: "Mobiles & Accessories" }), false);
  assert.equal(isInstallationEligible({ name: "iPad Air Tablet", category_name: "Gadgets" }), false);
  assert.equal(isInstallationEligible({ name: "Sony WH-1000XM5 Headphones", category_name: "Audio" }), false);
  assert.equal(isInstallationEligible({ name: "JBL Flip 6 Bluetooth Speaker", category_name: "Speakers" }), false);
});

test("Serialization Safety: Plain object checkoutItem serializes without circular references", () => {
  const checkoutItem = {
    productId: "6995b4035477b83416ec2692",
    slug: "acer-aspire-3",
    title: "Acer Aspire 3 Laptop",
    price: 36990,
    quantity: 1,
    selectedWarranty: {
      id: "w-1",
      title: "1 Year Extended Warranty",
      price: 3699,
      duration: "1 Year"
    },
    totalAmount: 40689
  };

  const json = JSON.stringify(checkoutItem);
  assert.ok(json.length > 0);
  const parsed = JSON.parse(json);
  assert.equal(parsed.productId, "6995b4035477b83416ec2692");
  assert.equal(parsed.totalAmount, 40689);
});

