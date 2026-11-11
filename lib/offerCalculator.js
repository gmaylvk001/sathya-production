/**
 * High-Precision Payment Offers & EMI Calculation Engine
 * Sathya Store E-Commerce
 */

/**
 * Safe 2-decimal monetary rounding
 * @param {number|string} val
 * @returns {number}
 */
export function roundToTwoDecimals(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Extract canonical selling price from a product object or numeric value
 * @param {object|number} product
 * @returns {number}
 */
export function getSellingPrice(product) {
  if (typeof product === "number") return roundToTwoDecimals(Math.max(0, product));
  if (!product || typeof product !== "object") return 0;

  const sp = Number(product.special_price);
  const p = Number(product.price);
  if (!isNaN(sp) && sp > 0) return roundToTwoDecimals(sp);
  if (!isNaN(p) && p > 0) return roundToTwoDecimals(p);
  return 0;
}

/**
 * 1. Reducing Balance EMI Calculation
 */
export function calculateEmi(principal, tenureMonths, annualInterestRate = 0, isNoCost = false) {
  const P = Math.max(0, Number(principal) || 0);
  const n = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const annual = Math.max(0, Number(annualInterestRate) || 0);
  const noCost = Boolean(isNoCost);

  if (P === 0) {
    return {
      monthlyEmi: 0,
      totalPayable: 0,
      totalInterest: 0,
      effectivePrice: 0,
      subventionDiscount: 0,
      isNoCost: noCost,
      tenureMonths: n,
      annualInterestRate: annual,
    };
  }

  // Case A: No-Cost EMI (or 0% interest)
  if (noCost || annual === 0) {
    const monthlyEmi = roundToTwoDecimals(P / n);
    const effectivePrice = roundToTwoDecimals(P);
    const totalPayable = roundToTwoDecimals(P);

    let subventionDiscount = 0;
    if (annual > 0) {
      const r = annual / (12 * 100);
      const factor = Math.pow(1 + r, n);
      const standardEmi = (P * r * factor) / (factor - 1);
      const standardTotal = standardEmi * n;
      subventionDiscount = roundToTwoDecimals(Math.max(0, standardTotal - P));
    }

    return {
      monthlyEmi,
      totalPayable,
      totalInterest: 0,
      effectivePrice,
      subventionDiscount,
      isNoCost: true,
      tenureMonths: n,
      annualInterestRate: annual,
    };
  }

  // Case B: Standard Reducing-Balance EMI
  const r = annual / (12 * 100);
  const factor = Math.pow(1 + r, n);
  const rawEmi = (P * r * factor) / (factor - 1);
  const monthlyEmi = roundToTwoDecimals(rawEmi);
  const totalPayable = roundToTwoDecimals(monthlyEmi * n);
  const totalInterest = roundToTwoDecimals(Math.max(0, totalPayable - P));
  const effectivePrice = totalPayable; 

  return {
    monthlyEmi,
    totalPayable,
    totalInterest,
    effectivePrice,
    subventionDiscount: 0,
    isNoCost: false,
    tenureMonths: n,
    annualInterestRate: annual,
  };
}

/**
 * 2. Instant Discount Calculation
 */
export function calculateInstantDiscount(principal, discountType = "PERCENTAGE", discountValue = 0, maxDiscountLimit = 0) {
  const P = Math.max(0, Number(principal) || 0);
  const val = Math.max(0, Number(discountValue) || 0);
  const cap = Math.max(0, Number(maxDiscountLimit) || 0);
  const type = String(discountType || "PERCENTAGE").toUpperCase();

  if (P === 0 || val === 0) {
    return { discount: 0, effectivePrice: P };
  }

  let rawDiscount = 0;
  if (type === "PERCENTAGE") {
    rawDiscount = P * (val / 100);
  } else {
    rawDiscount = val;
  }

  let discount = rawDiscount;
  if (cap > 0) {
    discount = Math.min(rawDiscount, cap);
  }

  discount = Math.min(discount, P);
  discount = roundToTwoDecimals(discount);
  const effectivePrice = roundToTwoDecimals(P - discount);

  return { discount, effectivePrice };
}

/**
 * Check if an offer is basically eligible (active, date, min order, category)
 */
export function isOfferEligible(offer, productPrice, categoryId = null, currentDate = new Date()) {
  if (!offer || typeof offer !== "object") return false;

  const isActive = offer.isActive !== false && offer.status !== "INACTIVE" && offer.status !== "Inactive";
  if (!isActive) return false;

  const now = currentDate.getTime();
  if (offer.validFrom) {
    const fromTime = new Date(offer.validFrom).getTime();
    if (!isNaN(fromTime) && now < fromTime) return false;
  }
  if (offer.validTill) {
    const tillTime = new Date(offer.validTill).getTime();
    if (!isNaN(tillTime) && now > tillTime) return false;
  }

  const minOrder = Number(offer.minOrderValue ?? offer.minimumTransactionAmount ?? 0);
  if (minOrder > 0 && productPrice < minOrder) return false;

  const applicableCategories = offer.applicableCategories || offer.applicableCategoryIds || ["ALL"];
  if (Array.isArray(applicableCategories) && applicableCategories.length > 0 && !applicableCategories.includes("ALL") && categoryId) {
    const catStr = String(categoryId);
    const matchesCategory = applicableCategories.some((c) => String(c) === catStr);
    if (!matchesCategory) return false;
  }

  return true;
}

/**
 * Get Eligible EMI Offers based on business rules
 */
export function getEligibleEmiOffers(rawOffers, price, categoryId, currentDate = new Date()) {
  if (!rawOffers || !Array.isArray(rawOffers)) return [];
  
  // Rule: Credit Card EMI Min Threshold 2500, Debit/Cardless 5000.
  // If price < 2500, NO EMI AT ALL
  if (price < 2500) {
    return [];
  }

  const emiOffersList = [];

  for (let i = 0; i < rawOffers.length; i++) {
    const o = rawOffers[i];
    
    // Check basic eligibility
    if (!isOfferEligible(o, price, categoryId, currentDate)) continue;
    
    const isBankDiscount = o.offerType === "BANK_OFFER" || o.stackGroup === "BANK_OFFER" || o.type === "BANK_DISCOUNT";
    const isEmi = !isBankDiscount && (o.offerType === "EMI_OFFER" || o.offerType === "STANDARD_EMI" || o.offerType === "NO_COST_EMI" || o.stackGroup === "EMI_OFFER" || o.type === "EMI" || Boolean(o.emiDetails?.tenureMonths > 0));
    
    if (!isEmi) continue;

    const cardType = (o.cardType || "CREDIT").toUpperCase();
    
    // Rule: Debit/Cardless must have min 5000
    if ((cardType === "DEBIT" || cardType === "CARDLESS") && price < 5000) {
      continue;
    }

    const bankObj = o.bank && typeof o.bank === "object" ? o.bank : null;
    const bankShortCode = (bankObj?.code || bankObj?.shortCode || o.bankShortCode || "BANK").toUpperCase();
    const bankName = bankObj?.name || o.bankName || o.name || `${bankShortCode} Bank`;
    const bankLogoUrl = bankObj?.logoUrl || bankObj?.logo || o.bankLogoUrl || o.logoUrl || "";

    const tenure = Number(o.emiDetails?.tenureMonths || o.tenureMonths || 6);
    const annualRate = Number(o.emiDetails?.annualInterestRate ?? o.interestRate ?? 14);
    const isNoCost = Boolean(o.emiDetails?.isNoCost ?? o.isNoCostEmi ?? o.isNoCostEMI ?? o.offerType === "NO_COST_EMI" ?? false);

    const emiCalc = calculateEmi(price, tenure, annualRate, isNoCost);

    emiOffersList.push({
      offerId: o._id?.toString() || o.id || o.offerId || `emi-${i}`,
      bankShortCode,
      bankName,
      bankLogoUrl,
      offerType: "EMI_OFFER",
      tenureMonths: tenure,
      annualInterestRate: annualRate,
      isNoCost: emiCalc.isNoCost,
      isNoCostEmi: emiCalc.isNoCost,
      monthlyEmi: emiCalc.monthlyEmi,
      totalPayable: emiCalc.totalPayable,
      totalInterest: emiCalc.totalInterest,
      subventionDiscount: emiCalc.subventionDiscount,
      effectivePrice: emiCalc.effectivePrice,
      minOrderValue: Number(o.minOrderValue ?? o.minimumTransactionAmount ?? 0),
      cardType,
      badge: emiCalc.isNoCost ? "No Cost EMI" : "Standard EMI",
      description: o.description || `${bankShortCode} BANK ${cardType} CARD EMI (${annualRate}% P.A.)`,
      name: o.title || o.name || `${bankName} ${tenure}m EMI`,
      isBestDeal: false,
      priority: Number(o.priority || 0),
    });
  }
  
  return emiOffersList;
}

/**
 * Get Eligible Bank Offers based on business rules
 */
export function getEligibleBankOffers(rawOffers, price, categoryId, currentDate = new Date()) {
  if (!rawOffers || !Array.isArray(rawOffers)) return [];

  const bankOffersList = [];

  for (let i = 0; i < rawOffers.length; i++) {
    const o = rawOffers[i];
    
    // Check basic eligibility (includes minOrderValue)
    if (!isOfferEligible(o, price, categoryId, currentDate)) continue;
    
    const isBankDiscount = o.offerType === "BANK_OFFER" || o.stackGroup === "BANK_OFFER" || o.type === "BANK_DISCOUNT";
    if (!isBankDiscount) continue;

    const discountType = (o.discountType || "PERCENTAGE").toUpperCase();
    const discountValue = Number(o.discountValue || 0);
    const maxDiscountLimit = Number(o.maxDiscountLimit ?? o.discountCap ?? 0);

    const discountCalc = calculateInstantDiscount(price, discountType, discountValue, maxDiscountLimit);

    // Rule: FILTER OUT any offer where calculated discount <= 0 or effectivePrice === sellingPrice
    if (discountCalc.discount <= 0 || discountCalc.effectivePrice === price) {
      continue;
    }

    const bankObj = o.bank && typeof o.bank === "object" ? o.bank : null;
    const bankShortCode = (bankObj?.code || bankObj?.shortCode || o.bankShortCode || "BANK").toUpperCase();
    const bankName = bankObj?.name || o.bankName || o.name || `${bankShortCode} Bank`;
    const bankLogoUrl = bankObj?.logoUrl || bankObj?.logo || o.bankLogoUrl || o.logoUrl || "";

    bankOffersList.push({
      offerId: o._id?.toString() || o.id || o.offerId || `bank-${i}`,
      bankShortCode,
      bankName,
      bankLogoUrl,
      offerType: "BANK_OFFER",
      discountType,
      discountValue,
      maxDiscountLimit,
      calculatedDiscount: discountCalc.discount,
      effectivePrice: discountCalc.effectivePrice,
      minOrderValue: Number(o.minOrderValue ?? o.minimumTransactionAmount ?? 0),
      cardType: o.cardType || "ALL",
      badge: o.badge || "Credit/Debit",
      description: o.description || o.name || `${bankName} Cards - Full payment and discount available`,
      name: o.title || o.name || `${bankName} Cards`,
      isBestOffer: false,
      priority: Number(o.priority || 0),
    });
  }

  return bankOffersList;
}

export function generateDefaultOffers(price) {
  const p = Math.max(0, Number(price) || 0);

  return [
    {
      offerId: "bank-hdfc-7-5",
      offerType: "BANK_OFFER",
      bank: { code: "HDFC", name: "HDFC Bank", logoUrl: "/images/banks/hdfc.svg" },
      discountType: "PERCENTAGE",
      discountValue: 7.5,
      maxDiscountLimit: 15000,
      minOrderValue: 0,
      cardType: "ALL",
      badge: "Credit/Debit",
      name: "HDFC Bank Cards",
      description: "HDFC Bank Cards - Full payment and standard Credit Card EMI available at checkout",
      isActive: true,
    },
    {
      offerId: "bank-sbi-7-5",
      offerType: "BANK_OFFER",
      bank: { code: "SBI", name: "State Bank of India", logoUrl: "/uploads/banks/sbi.png" },
      discountType: "PERCENTAGE",
      discountValue: 7.5,
      maxDiscountLimit: 15000,
      minOrderValue: 0,
      cardType: "ALL",
      badge: "Credit/Debit",
      name: "SBI Cards & NetBanking",
      description: "SBI Cards & NetBanking - Full payment and standard Credit Card EMI available at checkout",
      isActive: true,
    },
    {
      offerId: "emi-hdfc-6m",
      offerType: "EMI_OFFER",
      bank: { code: "HDFC", name: "HDFC Bank", logoUrl: "/images/banks/hdfc.svg" },
      emiDetails: { tenureMonths: 6, annualInterestRate: 14, isNoCost: false },
      minOrderValue: 3000,
      cardType: "CREDIT",
      badge: "Standard EMI",
      name: "HDFC Bank 6 Months Standard EMI",
      description: "HDFC BANK CREDIT CARD EMI (14% P.A.)",
      isActive: true,
    }
  ];
}

/**
 * 3. High-Precision Best Price & Offers Resolver
 */
export function resolveOffersForProduct(productOrPrice, rawOffers = [], options = {}) {
  const price = getSellingPrice(productOrPrice);
  const categoryId = options.categoryId || (typeof productOrPrice === "object" ? productOrPrice?.category || productOrPrice?.sub_category : null);
  const currentDate = options.currentDate || new Date();

  const sourceOffers = Array.isArray(rawOffers) && rawOffers.length > 0 ? rawOffers : generateDefaultOffers(price);

  let emiOffersList = getEligibleEmiOffers(sourceOffers, price, categoryId, currentDate);
  let bankOffersList = getEligibleBankOffers(sourceOffers, price, categoryId, currentDate);

  const PREFERRED_BANK_ORDER = { HDFC: 1, SBI: 2, AXIS: 3, ICICI: 4, KOTAK: 5, RBL: 6, SCB: 7 };

  // 1. Evaluate highest discount bank offer across all eligible offers
  let bestPrice = price;
  let highestDiscount = 0;
  let bestBankOfferIndex = -1;

  for (let j = 0; j < bankOffersList.length; j++) {
    const bo = bankOffersList[j];
    if (bo.calculatedDiscount > highestDiscount) {
      highestDiscount = bo.calculatedDiscount;
      bestBankOfferIndex = j;
    }
    if (bo.effectivePrice < bestPrice) {
      bestPrice = bo.effectivePrice;
    }
  }

  if (bestBankOfferIndex >= 0 && highestDiscount > 0) {
    bankOffersList[bestBankOfferIndex].isBestOffer = true;
    bankOffersList[bestBankOfferIndex].badge = "Best Offer";
  }

  // Sort Bank Offers:
  // - Best Offer ALWAYS comes first (isBestOffer = true)
  // - Then highest discount descending (higher customer savings first)
  // - Then higher admin priority descending
  // - Then preferred partner bank order
  bankOffersList.sort((a, b) => {
    if (a.isBestOffer && !b.isBestOffer) return -1;
    if (!a.isBestOffer && b.isBestOffer) return 1;
    const diffDiscount = (b.calculatedDiscount || 0) - (a.calculatedDiscount || 0);
    if (Math.abs(diffDiscount) > 0.01) return diffDiscount;
    const diffPriority = (b.priority || 0) - (a.priority || 0);
    if (diffPriority !== 0) return diffPriority;
    const orderA = PREFERRED_BANK_ORDER[a.bankShortCode] || 99;
    const orderB = PREFERRED_BANK_ORDER[b.bankShortCode] || 99;
    return orderA - orderB;
  });

  const prioritizeDistinctBanks = (list) => {
    const seen = new Set();
    const primary = [];
    const remaining = [];
    for (const item of list) {
      if (!seen.has(item.bankShortCode)) {
        seen.add(item.bankShortCode);
        primary.push(item);
      } else {
        remaining.push(item);
      }
    }
    return [...primary, ...remaining];
  };

  bankOffersList = prioritizeDistinctBanks(bankOffersList);

  // Guarantee that Best Offer is strictly at index 0 after distinct filtering
  const finalBestOfferIdx = bankOffersList.findIndex((o) => o.isBestOffer);
  if (finalBestOfferIdx > 0) {
    const [best] = bankOffersList.splice(finalBestOfferIdx, 1);
    bankOffersList.unshift(best);
  }

  // 2. Identify and prioritize Best Deal EMI
  let bestEmiIndex = -1;
  if (emiOffersList.length > 0) {
    // Check for No Cost EMI across ALL offers first
    const noCostIdx = emiOffersList.findIndex((eo) => eo.isNoCost);
    if (noCostIdx >= 0) {
      bestEmiIndex = noCostIdx;
    } else {
      // Find lowest monthly installment across ALL offers
      let minInstallment = Infinity;
      for (let k = 0; k < emiOffersList.length; k++) {
        if (emiOffersList[k].monthlyEmi < minInstallment) {
          minInstallment = emiOffersList[k].monthlyEmi;
          bestEmiIndex = k;
        }
      }
    }

    if (bestEmiIndex >= 0) {
      emiOffersList[bestEmiIndex].isBestDeal = true;
      emiOffersList[bestEmiIndex].badge = "Best Deal";
    }

    // Sort EMI Offers:
    // - Best Deal ALWAYS comes first
    // - No Cost EMI before standard EMI
    // - Lowest monthly installment
    // - Preferred partner bank order
    emiOffersList.sort((a, b) => {
      if (a.isBestDeal && !b.isBestDeal) return -1;
      if (!a.isBestDeal && b.isBestDeal) return 1;
      if (a.isNoCost && !b.isNoCost) return -1;
      if (!a.isNoCost && b.isNoCost) return 1;
      const diffEmi = (a.monthlyEmi || 0) - (b.monthlyEmi || 0);
      if (Math.abs(diffEmi) > 0.01) return diffEmi;
      const orderA = PREFERRED_BANK_ORDER[a.bankShortCode] || 99;
      const orderB = PREFERRED_BANK_ORDER[b.bankShortCode] || 99;
      return orderA - orderB;
    });

    emiOffersList = prioritizeDistinctBanks(emiOffersList);

    const finalBestEmiIdx = emiOffersList.findIndex((o) => o.isBestDeal);
    if (finalBestEmiIdx > 0) {
      const [bestDeal] = emiOffersList.splice(finalBestEmiIdx, 1);
      emiOffersList.unshift(bestDeal);
    }
  }

  const bestBankOffer = bankOffersList[0] || null;
  const bestEmiOffer = emiOffersList[0] || null;

  return {
    bestPrice: roundToTwoDecimals(bestPrice),
    basePrice: roundToTwoDecimals(price),
    emiOffers: emiOffersList,
    bankOffers: bankOffersList,
    bestBankOffer,
    bestEmiOffer,
  };
}
