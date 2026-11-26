export const SATHYA_RETURN_SUPPORT = {
  phoneDisplay: "+91 8880598985",
  phoneHref: "tel:+918880598985",
  replacementHours: "Mon–Sat, 9:30 AM – 7:30 PM IST",
  supportHours: "Mon–Sat, 9:00 AM – 9:00 PM IST",
  contactHref: "/contact",
  contactLabel: "Contact Us",
  fullPolicyHref: "/cancellation-policy",
  fullPolicyLabel: "View Full Cancellation & Return Policy",
};

export const DEFAULT_RETURN_POLICY = {
  heading: "3-Day Replacement Guarantee",
  subheading:
    "Hassle-free replacement for defective, damaged, or malfunctioning items.",
  sections: [
    {
      id: "replacement-guarantee",
      title: "3-Day Replacement Guarantee",
      points: [
        [
          { text: "Covered under Sathya's " },
          { text: "3-Day Replacement Guarantee", strong: true },
          { text: " for defective, damaged, or malfunctioning items." },
        ],
        [
          { text: "Report within " },
          { text: "3 days of delivery", strong: true },
          { text: " via our " },
          { text: "Contact Us", href: SATHYA_RETURN_SUPPORT.contactHref },
          { text: " page or call " },
          {
            text: SATHYA_RETURN_SUPPORT.phoneDisplay,
            href: SATHYA_RETURN_SUPPORT.phoneHref,
            strong: true,
          },
          { text: ` (${SATHYA_RETURN_SUPPORT.replacementHours}) for a free replacement.` },
        ],
      ],
    },
    {
      id: "eligibility-transit",
      title: "Eligibility & Transit Check",
      points: [
        [
          {
            text: "Items must be returned with all original packaging, retail box, manuals, cables, accessories, and an intact, readable serial number (cosmetic damage is not covered).",
          },
        ],
        [
          { text: "All electronics are transit-insured — " },
          {
            text: "please do not accept open or tampered packages",
            strong: true,
          },
          { text: " at delivery." },
        ],
      ],
    },
    {
      id: "refunds-cancellations",
      title: "Refunds & Cancellations",
      points: [
        [
          { text: "Refunds take " },
          { text: "7–10 working days", strong: true },
          {
            text: " after we receive the returned item (processed after courier settlement for COD orders).",
          },
        ],
        [
          {
            text: "No shipping fee is deducted if cancelled before dispatch; shipping charges apply if cancelled after shipping.",
          },
        ],
        [
          {
            text: "Gift coupon/voucher orders are refunded as a fresh voucher of the same value and expiry.",
          },
        ],
      ],
    },
  ],
  bankRefundDetails: {
    id: "bank-refund-details",
    title: "Required Details for Bank/Cheque Refund",
    fields: [
      "Account Holder Name",
      "Bank Name",
      "Account Number",
      "IFSC Code",
      "Order Number",
      "Reason for Refund",
    ],
  },
  support: SATHYA_RETURN_SUPPORT,
};

/**
 * Resolves PDP return policy with product-level override priority:
 * 1) Non-empty `product.returnPolicy`
 * 2) Storewide default `DEFAULT_RETURN_POLICY`
 */
export function resolveProductReturnPolicy(product) {
  const customPolicy =
    typeof product?.returnPolicy === "string" ? product.returnPolicy.trim() : "";

  if (customPolicy) {
    return {
      isCustom: true,
      customPolicy,
      defaultPolicy: DEFAULT_RETURN_POLICY,
    };
  }

  return {
    isCustom: false,
    customPolicy: "",
    defaultPolicy: DEFAULT_RETURN_POLICY,
  };
}
