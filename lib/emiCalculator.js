/**
 * lib/emiCalculator.js
 *
 * Production-grade EMI Calculation Engine for Sathya Store.
 * Calculates standard amortized bank EMI options and validates minimum order values
 * matching Razorpay's Indian banking ecosystem.
 */

/**
 * Standard Equated Monthly Installment (EMI) Formula:
 * E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param {number} principal - Loan amount / Product price (INR)
 * @param {number} annualRate - Annual interest rate percentage (e.g., 14 for 14%)
 * @param {number} tenureMonths - Number of installment months (e.g., 3, 6, 9, 12)
 * @returns {{ monthlyEmi: number, totalInterest: number, totalCost: number, annualRate: number, tenureMonths: number }}
 */
export function calculateMonthlyEmi(principal, annualRate, tenureMonths) {
  const p = Number(principal) || 0;
  const n = Number(tenureMonths) || 0;
  const rate = Number(annualRate) || 0;

  if (p <= 0 || n <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalCost: 0,
      annualRate: rate,
      tenureMonths: n,
    };
  }

  // 0% No-Cost EMI
  if (rate === 0) {
    const monthlyEmi = Math.round(p / n);
    return {
      monthlyEmi,
      totalInterest: 0,
      totalCost: p,
      annualRate: 0,
      tenureMonths: n,
    };
  }

  // Standard Reducing Balance EMI
  const monthlyRate = rate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, n);
  const emi = (p * monthlyRate * factor) / (factor - 1);
  const monthlyEmi = Math.round(emi);
  const totalCost = Math.round(monthlyEmi * n);
  const totalInterest = Math.max(0, totalCost - Math.round(p));

  return {
    monthlyEmi,
    totalInterest,
    totalCost,
    annualRate: rate,
    tenureMonths: n,
  };
}

/**
 * Credit Card Bank Configurations & Standard Interest Rates
 */
export const CREDIT_CARD_BANKS = [
  {
    bankCode: "RBL",
    bankName: "RBL Bank",
    minOrderValue: 1000,
    logoUrl: "/images/banks/rbl.svg",
    plans: [
      { tenure: 3, rate: 14 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 17 },
      { tenure: 12, rate: 16 },
      { tenure: 18, rate: 16.5 },
      { tenure: 24, rate: 17 },
    ],
  },
  {
    bankCode: "ICICI",
    bankName: "ICICI Bank",
    minOrderValue: 1500,
    logoUrl: "/images/banks/icici.svg",
    plans: [
      { tenure: 3, rate: 15.99 },
      { tenure: 6, rate: 15.99 },
      { tenure: 9, rate: 15.99 },
      { tenure: 12, rate: 15.99 },
      { tenure: 18, rate: 15.99 },
      { tenure: 24, rate: 15.99 },
    ],
  },
  {
    bankCode: "IDFC",
    bankName: "IDFC First Bank",
    minOrderValue: 1500,
    logoUrl: "/images/banks/idfc.svg",
    plans: [
      { tenure: 3, rate: 14 },
      { tenure: 6, rate: 14.5 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
      { tenure: 18, rate: 15.5 },
      { tenure: 24, rate: 15.5 },
    ],
  },
  {
    bankCode: "YES",
    bankName: "Yes Bank",
    minOrderValue: 1500,
    logoUrl: "/images/banks/yes.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
  {
    bankCode: "AU",
    bankName: "AU Small Finance Bank",
    minOrderValue: 1500,
    logoUrl: "/images/banks/au.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
  {
    bankCode: "HDFC",
    bankName: "HDFC Bank",
    minOrderValue: 3000,
    logoUrl: "/images/banks/hdfc.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
      { tenure: 18, rate: 16 },
      { tenure: 24, rate: 16 },
    ],
  },
  {
    bankCode: "SBI",
    bankName: "SBI Card",
    minOrderValue: 2500,
    logoUrl: "/images/banks/sbi.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
      { tenure: 18, rate: 15.5 },
      { tenure: 24, rate: 15.5 },
    ],
  },
  {
    bankCode: "AXIS",
    bankName: "Axis Bank",
    minOrderValue: 2500,
    logoUrl: "/images/banks/axis.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
      { tenure: 18, rate: 16 },
      { tenure: 24, rate: 16 },
    ],
  },
  {
    bankCode: "KOTAK",
    bankName: "Kotak Mahindra Bank",
    minOrderValue: 2500,
    logoUrl: "/images/banks/kotak.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
    ],
  },
  {
    bankCode: "INDUSIND",
    bankName: "IndusInd Bank",
    minOrderValue: 2000,
    logoUrl: "/images/banks/indusind.svg",
    plans: [
      { tenure: 3, rate: 14.5 },
      { tenure: 6, rate: 14.5 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
  {
    bankCode: "FEDERAL",
    bankName: "Federal Bank",
    minOrderValue: 2500,
    logoUrl: "/images/banks/federal.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
  {
    bankCode: "SCB",
    bankName: "Standard Chartered Bank",
    minOrderValue: 2500,
    logoUrl: "/images/banks/scb.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
];

/**
 * Other EMI Options (Debit Card EMI & Cardless / BNPL)
 */
export const OTHER_EMI_BANKS = [
  {
    bankCode: "HDFC",
    bankName: "HDFC Bank (Debit Card)",
    type: "Debit Card EMI",
    minOrderValue: 5000,
    logoUrl: "/images/banks/hdfc.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
    ],
  },
  {
    bankCode: "ICICI",
    bankName: "ICICI Bank (Debit Card)",
    type: "Debit Card EMI",
    minOrderValue: 5000,
    logoUrl: "/images/banks/icici.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
    ],
  },
  {
    bankCode: "AXIS",
    bankName: "Axis Bank (Debit Card)",
    type: "Debit Card EMI",
    minOrderValue: 5000,
    logoUrl: "/images/banks/axis.svg",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 16 },
      { tenure: 9, rate: 16 },
      { tenure: 12, rate: 16 },
    ],
  },
  {
    bankCode: "SBI",
    bankName: "State Bank of India (Debit Card)",
    type: "Debit Card EMI",
    minOrderValue: 5000,
    logoUrl: "/images/banks/sbi.svg",
    plans: [
      { tenure: 6, rate: 15.5 },
      { tenure: 9, rate: 15.5 },
      { tenure: 12, rate: 15.5 },
    ],
  },
  {
    bankCode: "FEDERAL",
    bankName: "Federal Bank (Debit Card)",
    type: "Debit Card EMI",
    minOrderValue: 5000,
    logoUrl: "/images/banks/federal.svg",
    plans: [
      { tenure: 3, rate: 15 },
      { tenure: 6, rate: 15 },
      { tenure: 9, rate: 15 },
      { tenure: 12, rate: 15 },
    ],
  },
  {
    bankCode: "ZEST",
    bankName: "ZestMoney (Cardless)",
    type: "Cardless EMI",
    minOrderValue: 3000,
    logoUrl: "",
    plans: [
      { tenure: 3, rate: 18 },
      { tenure: 6, rate: 18 },
      { tenure: 9, rate: 18 },
    ],
  },
  {
    bankCode: "SNAP",
    bankName: "Snapmint (Cardless)",
    type: "Cardless EMI",
    minOrderValue: 2000,
    logoUrl: "",
    plans: [
      { tenure: 3, rate: 16 },
      { tenure: 6, rate: 18 },
    ],
  },
];

/**
 * Calculates all EMI plans for a specific bank configuration at given price.
 *
 * @param {Object} bankConfig
 * @param {number} price
 * @returns {Object}
 */
export function buildBankEmiDetails(bankConfig, price) {
  const p = Number(price) || 0;
  const isEligible = p >= bankConfig.minOrderValue;

  const tenurePlans = bankConfig.plans.map((plan) => {
    const calculation = calculateMonthlyEmi(p, plan.rate, plan.tenure);
    return {
      tenure: plan.tenure,
      rate: plan.rate,
      monthlyEmi: calculation.monthlyEmi,
      totalInterest: calculation.totalInterest,
      totalCost: calculation.totalCost,
    };
  });

  const lowestEmi = isEligible && tenurePlans.length > 0
    ? Math.min(...tenurePlans.map((tp) => tp.monthlyEmi))
    : null;

  return {
    bankCode: bankConfig.bankCode,
    bankName: bankConfig.bankName,
    type: bankConfig.type || "Credit Card EMI",
    minOrderValue: bankConfig.minOrderValue,
    logoUrl: bankConfig.logoUrl,
    isEligible,
    ineligibilityReason: isEligible
      ? null
      : `available for orders above ₹${bankConfig.minOrderValue.toLocaleString('en-IN')}`,
    lowestEmi,
    tenurePlans,
  };
}

/**
 * Resolves all eligible & informative EMI plans across all bank partners.
 *
 * @param {number} price
 * @returns {{ creditCardPlans: Array, otherPlans: Array, startingEmi: number|null }}
 */
export function getAllEmiPlans(price) {
  const p = Number(price) || 0;

  const creditCardPlans = CREDIT_CARD_BANKS.map((b) => buildBankEmiDetails(b, p));
  const otherPlans = OTHER_EMI_BANKS.map((b) => buildBankEmiDetails(b, p));

  // Sort: Eligible banks first (lowest EMI to highest), followed by ineligible banks (lowest minOrderValue to highest)
  const sortComparator = (a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    if (a.isEligible && b.isEligible) {
      return (a.lowestEmi || 0) - (b.lowestEmi || 0);
    }
    return (a.minOrderValue || 0) - (b.minOrderValue || 0);
  };

  creditCardPlans.sort(sortComparator);
  otherPlans.sort(sortComparator);

  const startingEmi = getStartingEmi(p);

  return {
    creditCardPlans,
    otherPlans,
    startingEmi,
  };
}

/**
 * Finds the starting/lowest EMI per month for the product.
 *
 * @param {number} price
 * @returns {number|null}
 */
export function getStartingEmi(price) {
  const p = Number(price) || 0;
  if (p <= 0) return null;

  let minEmi = Infinity;

  // Search across eligible credit card banks
  for (const bank of CREDIT_CARD_BANKS) {
    if (p >= bank.minOrderValue) {
      for (const plan of bank.plans) {
        const { monthlyEmi } = calculateMonthlyEmi(p, plan.rate, plan.tenure);
        if (monthlyEmi > 0 && monthlyEmi < minEmi) {
          minEmi = monthlyEmi;
        }
      }
    }
  }

  // If no bank is eligible at current price (e.g. price < 1000),
  // calculate lowest hypothetical rate from the lowest threshold bank (RBL @ 1000)
  if (minEmi === Infinity) {
    const lowestThresholdBank = CREDIT_CARD_BANKS[0]; // RBL
    for (const plan of lowestThresholdBank.plans) {
      const { monthlyEmi } = calculateMonthlyEmi(p, plan.rate, plan.tenure);
      if (monthlyEmi > 0 && monthlyEmi < minEmi) {
        minEmi = monthlyEmi;
      }
    }
  }

  return minEmi === Infinity ? null : minEmi;
}
