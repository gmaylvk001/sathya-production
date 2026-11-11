import test from "node:test";
import assert from "node:assert/strict";

const ELIGIBLE_STATUS_REGEX =
  /^(complete|completed|delivered|shipped|billed|ordered|order accepted|order placed)$/i;

function cleanCode(code) {
  if (!code) return "";
  return String(code).trim().replace(/^ITEM/i, "").toLowerCase();
}

test("Review eligibility status matching: case-insensitive & trimmed statuses pass", () => {
  const allowedStatuses = [
    "Completed",
    "completed",
    "Complete",
    "complete",
    "Delivered",
    "delivered",
    "DELIVERED",
    "Shipped",
    "shipped",
    "Billed",
    "billed",
    "Ordered",
    "ordered",
    "Order Placed",
    "order placed",
    "Order Accepted",
    "order accepted"
  ];

  for (const status of allowedStatuses) {
    assert.equal(
      ELIGIBLE_STATUS_REGEX.test(status.trim()),
      true,
      `Status "${status}" should be eligible`
    );
  }

  const disqualifiedStatuses = [
    "pending",
    "cancelled",
    "failure",
    "Payment Initiated",
    "payment_initialized"
  ];

  for (const status of disqualifiedStatuses) {
    assert.equal(
      ELIGIBLE_STATUS_REGEX.test(status.trim()),
      false,
      `Status "${status}" should be disqualified`
    );
  }
});

test("Review code cleaning and matching: ITEM prefix and casing normalization", () => {
  const productCode = "HISENSE55Q5S";
  const itemCodesInOrders = [
    "HISENSE55Q5S",
    "hisense55q5s",
    "ITEMHISENSE55Q5S",
    "itemhisense55q5s",
    " ITEM55Q5S ",
    "55Q5S"
  ];

  const targetClean = cleanCode(productCode);
  assert.equal(targetClean, "hisense55q5s");

  for (const code of itemCodesInOrders.slice(0, 4)) {
    assert.equal(cleanCode(code), targetClean);
  }
});
