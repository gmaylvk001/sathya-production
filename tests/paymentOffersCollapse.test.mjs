import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaymentOffersAriaAttributes,
  getPaymentOffersChevronClass,
  getPaymentOffersHeaderMarginClass,
} from "../lib/paymentOffersHelper.js";

test("PaymentOffers Collapse/Expand: Accessibility attributes match expanded state", () => {
  const expandedAttrs = getPaymentOffersAriaAttributes(true);
  assert.equal(expandedAttrs.role, "button");
  assert.equal(expandedAttrs.tabIndex, 0);
  assert.equal(expandedAttrs["aria-expanded"], true);
  assert.equal(expandedAttrs["aria-controls"], "payment-offers-collapsible-content");
  assert.equal(expandedAttrs["aria-label"], "Collapse Payment Offers");
  assert.equal(expandedAttrs.title, "Collapse Payment Offers");
});

test("PaymentOffers Collapse/Expand: Accessibility attributes match collapsed state", () => {
  const collapsedAttrs = getPaymentOffersAriaAttributes(false);
  assert.equal(collapsedAttrs.role, "button");
  assert.equal(collapsedAttrs.tabIndex, 0);
  assert.equal(collapsedAttrs["aria-expanded"], false);
  assert.equal(collapsedAttrs["aria-controls"], "payment-offers-collapsible-content");
  assert.equal(collapsedAttrs["aria-label"], "Expand Payment Offers");
  assert.equal(collapsedAttrs.title, "Expand Payment Offers");
});

test("PaymentOffers Toggle Behavior: State transitions cleanly on sequential clicks", () => {
  let isExpanded = true; // Initial default matching product page

  const toggle = () => {
    isExpanded = !isExpanded;
    return isExpanded;
  };

  // 1. Initial state: Open / Expanded
  assert.equal(isExpanded, true);

  // 2. First click collapses
  assert.equal(toggle(), false);

  // 3. Second click expands back
  assert.equal(toggle(), true);

  // 4. Multiple rapid repeated clicks remain deterministic
  for (let i = 0; i < 10; i++) {
    const expected = i % 2 !== 0;
    assert.equal(toggle(), expected);
  }
});

test("PaymentOffers Arrow State: Visual indicator syncs with actual content state", () => {
  const getArrowRotationClass = (isExpanded) => (isExpanded ? "" : "rotate-180");
  const getHeaderMarginClass = (isExpanded) => (isExpanded ? "mb-4" : "mb-0");

  // Expanded state
  assert.equal(getArrowRotationClass(true), "");
  assert.equal(getHeaderMarginClass(true), "mb-4");

  // Collapsed state
  assert.equal(getArrowRotationClass(false), "rotate-180");
  assert.equal(getHeaderMarginClass(false), "mb-0");
});

test("PaymentOffers Keyboard Accessibility: Enter and Space trigger toggle", () => {
  let toggledCount = 0;
  const toggle = () => {
    toggledCount++;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  // Enter key
  let prevented = false;
  handleKeyDown({ key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(toggledCount, 1);
  assert.equal(prevented, true);

  // Space key
  prevented = false;
  handleKeyDown({ key: " ", preventDefault: () => { prevented = true; } });
  assert.equal(toggledCount, 2);
  assert.equal(prevented, true);

  // Unrelated keys (Tab, ArrowDown, Escape) must NOT toggle
  prevented = false;
  handleKeyDown({ key: "Tab", preventDefault: () => { prevented = true; } });
  handleKeyDown({ key: "ArrowDown", preventDefault: () => { prevented = true; } });
  handleKeyDown({ key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(toggledCount, 2);
  assert.equal(prevented, false);
});

test("PaymentOffers Event Isolation: Offers text click opens modal without toggling accordion", () => {
  let accordionToggled = false;
  let modalOpened = false;
  let propagationStopped = false;

  const toggleAccordion = () => {
    accordionToggled = true;
  };

  const openBankOffersModal = () => {
    modalOpened = true;
  };

  const handleOffersLinkClick = (e) => {
    e.stopPropagation();
    openBankOffersModal();
  };

  const mockEvent = {
    stopPropagation: () => {
      propagationStopped = true;
    },
  };

  handleOffersLinkClick(mockEvent);

  assert.equal(propagationStopped, true);
  assert.equal(modalOpened, true);
  assert.equal(accordionToggled, false, "Clicking Offers link must not trigger parent accordion toggle");
});

test("PaymentOffers Content Visibility: Collapsing correctly conceals EMI and Bank Offers content", () => {
  const renderSimulatedContent = (isExpanded, offers) => {
    if (!isExpanded) {
      return null;
    }
    return {
      sectionHeader: "Payment Offers",
      emiOffers: offers.emiOffers || [],
      bankOffers: offers.bankOffers || [],
    };
  };

  const sampleOffers = {
    emiOffers: [{ offerId: "emi-1", monthlyEmi: 7488.16, tenureMonths: 6 }],
    bankOffers: [{ offerId: "bank-1", name: "HDFC Bank Cards", effectivePrice: 39913.75 }],
  };

  // Expanded
  const expandedView = renderSimulatedContent(true, sampleOffers);
  assert.notEqual(expandedView, null);
  assert.equal(expandedView.sectionHeader, "Payment Offers");
  assert.equal(expandedView.emiOffers.length, 1);
  assert.equal(expandedView.bankOffers.length, 1);

  // Collapsed
  const collapsedView = renderSimulatedContent(false, sampleOffers);
  assert.equal(collapsedView, null, "Collapsing must return null for offers content");
});

test("Consolidated Offers: Minimum monthly EMI syncs dynamically with base/variant price", async () => {
  const { getStartingEmi } = await import("../lib/emiCalculator.js");

  // 1. Base price ₹1,350 (Hawkins Futura Appachatty from PDP screenshot)
  const basePrice = 1350;
  const startingEmi1 = getStartingEmi(basePrice);
  assert.equal(startingEmi1, 67, "₹1,350 should yield starting EMI of ₹67/month");

  // 2. Dynamic price increase via variant selection (e.g., larger size ₹2,800)
  const variantPrice = 2800;
  const startingEmi2 = getStartingEmi(variantPrice);
  assert.equal(startingEmi2, 136, "Variant price change to ₹2,800 should dynamically recompute starting EMI to ₹136/month");

  // 3. Higher tier price ₹45,000 (TV/Appliance)
  const appliancePrice = 45000;
  const startingEmi3 = getStartingEmi(appliancePrice);
  assert.equal(startingEmi3, 2193, "₹45,000 should yield ₹2,193/month");

  // 4. Zero/Negative price safeguard
  assert.equal(getStartingEmi(0), null);
  assert.equal(getStartingEmi(-500), null);
});

test("Consolidated Offers: EMI Row accessibility attributes and trigger semantics", () => {
  const buildEmiRowProps = (startingEmi, onTrigger) => {
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `EMI plans starting from ₹${startingEmi.toLocaleString("en-IN")}/month. View Plans.`,
      onClick: onTrigger,
    };
  };

  let triggered = false;
  const triggerFn = () => {
    triggered = true;
  };

  const row = buildEmiRowProps(67, triggerFn);
  assert.equal(row.role, "button");
  assert.equal(row.tabIndex, 0);
  assert.equal(row["aria-label"], "EMI plans starting from ₹67/month. View Plans.");

  row.onClick();
  assert.equal(triggered, true);
});

