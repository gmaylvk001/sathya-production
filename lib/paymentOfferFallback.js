/**
 * Safe, non-promotional payment and EMI offer calculations.
 * Used when no active promotional business offers are configured in the DB/API.
 *
 * Guarantees:
 * - Never invents 0% No Cost EMI when not subsidized by bank/brand.
 * - Never invents percentage or flat monetary instant discounts or cashbacks.
 * - Accurately calculates standard credit card EMI installments at representative market rates (~14%-15% p.a.).
 * - Preserves UI availability, modal views, and card layout with full fidelity.
 */

/**
 * Standard reducing-balance EMI installment calculation
 */
export function calculateStandardEmi(principal, tenureMonths, annualRate = 14) {
  const p = Math.max(0, Number(principal) || 0);
  const n = Math.max(1, Number(tenureMonths) || 1);
  const annual = Number(annualRate) || 0;

  if (annual <= 0 || p <= 0) {
    const monthly = Math.round((p / n) * 100) / 100;
    return {
      monthlyEmi: monthly,
      totalPayable: p,
      totalInterest: 0,
    };
  }

  const monthlyRate = annual / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, n);
  const emi = (p * monthlyRate * factor) / (factor - 1);
  const roundedEmi = Math.round(emi * 100) / 100;
  const totalPayable = Math.round(roundedEmi * n * 100) / 100;
  const totalInterest = Math.round(Math.max(0, totalPayable - p) * 100) / 100;

  return {
    monthlyEmi: roundedEmi,
    totalPayable,
    totalInterest,
  };
}

/**
 * Builds safe non-promotional payment offers for a product price
 */
export function buildSafePaymentOffersData(productId = "", productName = "", basePrice = 40990) {
  const p = Math.max(0, Number(basePrice) || 0);

  // Safe standard partner bank options (NO fabricated monetary discount or cashback)
  const bankOffers = [
    {
      offerId: "bank-hdfc-standard",
      bankShortCode: "HDFC",
      bankName: "HDFC Bank",
      isBestOffer: false,
      label: "Payment Option",
      badge: "Credit/Debit",
      description: "HDFC Bank Cards - Full payment and standard Credit Card EMI available at checkout",
      bankLogoUrl: "/images/banks/hdfc.svg",
      calculatedDiscount: 0,
      effectivePrice: p,
    },
    {
      offerId: "bank-sbi-standard",
      bankShortCode: "SBI",
      bankName: "State Bank of India (SBI)",
      isBestOffer: false,
      label: "Payment Option",
      badge: "Credit/Debit",
      description: "SBI Cards & NetBanking - Full payment and standard Credit Card EMI available at checkout",
      calculatedDiscount: 0,
      effectivePrice: p,
    },
    {
      offerId: "bank-axis-standard",
      bankShortCode: "AXIS",
      bankName: "Axis Bank",
      isBestOffer: false,
      label: "Payment Option",
      badge: "Credit/Debit",
      description: "Axis Bank Cards & NetBanking - Full payment and standard Credit Card EMI available at checkout",
      calculatedDiscount: 0,
      effectivePrice: p,
    },
    {
      offerId: "bank-icici-standard",
      bankShortCode: "ICICI",
      bankName: "ICICI Bank",
      isBestOffer: false,
      label: "Payment Option",
      badge: "Credit/Debit",
      description: "ICICI Bank Cards & NetBanking - Full payment and standard Credit Card EMI available at checkout",
      calculatedDiscount: 0,
      effectivePrice: p,
    },
    {
      offerId: "bank-kotak-standard",
      bankShortCode: "KOTAK",
      bankName: "Kotak Mahindra Bank",
      isBestOffer: false,
      label: "Payment Option",
      badge: "Credit/Debit",
      description: "Kotak Bank Cards & NetBanking - Full payment and standard Credit Card EMI available at checkout",
      calculatedDiscount: 0,
      effectivePrice: p,
    },
  ];

  const banks = [
    { code: "HDFC", name: "HDFC Bank", logoUrl: "/images/banks/hdfc.svg" },
    { code: "SBI", name: "State Bank of India", logoUrl: "/uploads/banks/sbi.png" },
    { code: "AXIS", name: "Axis Bank", logoUrl: "/uploads/banks/axis.png" },
    { code: "ICICI", name: "ICICI Bank", logoUrl: "/uploads/banks/icici.png" },
    { code: "KOTAK", name: "Kotak Mahindra Bank", logoUrl: "/uploads/banks/kotak.png" },
  ];

  // Primary 6-month standard EMI plans for top cards
  const primaryEmiOffers = banks.map((bank) => {
    const { monthlyEmi, totalPayable } = calculateStandardEmi(p, 6, 14);
    return {
      offerId: `emi-${bank.code.toLowerCase()}-6m`,
      bankShortCode: bank.code,
      bankName: bank.name,
      bankLogoUrl: bank.logoUrl || "",
      isBestDeal: false,
      badge: "Standard EMI",
      monthlyEmi,
      tenureMonths: 6,
      annualInterestRate: 14,
      isNoCostEmi: false,
      totalPayable,
      effectivePrice: totalPayable,
      description: `${bank.code} Bank Credit Card EMI (14% p.a.)`,
      name: `${bank.name} 6 Months Standard EMI`,
    };
  });

  // Additional tenures for detailed EMI modal (3m, 9m, 12m, 18m, 24m)
  const additionalEmiOffers = [];
  const otherTenures = [
    { months: 3, rate: 14 },
    { months: 9, rate: 14 },
    { months: 12, rate: 14 },
    { months: 18, rate: 15 },
    { months: 24, rate: 15 },
  ];

  banks.forEach((bank) => {
    otherTenures.forEach((t) => {
      const { monthlyEmi, totalPayable } = calculateStandardEmi(p, t.months, t.rate);
      additionalEmiOffers.push({
        offerId: `emi-${bank.code.toLowerCase()}-${t.months}m`,
        bankShortCode: bank.code,
        bankName: bank.name,
        isBestDeal: false,
        badge: "Standard EMI",
        monthlyEmi,
        tenureMonths: t.months,
        annualInterestRate: t.rate,
        isNoCostEmi: false,
        totalPayable,
        effectivePrice: totalPayable,
        description: `${bank.code} Bank Credit Card EMI (${t.rate}% p.a.)`,
        name: `${bank.name} ${t.months} Months Standard EMI`,
      });
    });
  });

  const emiOffers = [...primaryEmiOffers, ...additionalEmiOffers];

  return {
    productId: productId || "",
    productName: productName || "",
    productPrice: p,
    emiOffers,
    bankOffers,
    bestEmiOffer: primaryEmiOffers[0] || null,
    bestBankOffer: bankOffers[0] || null,
    allOffersCount: emiOffers.length + bankOffers.length,
    isFallback: true,
  };
}
