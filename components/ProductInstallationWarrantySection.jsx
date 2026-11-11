"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  isExtendedWarrantyEligible,
  isInstallationEligible,
} from "@/lib/productServiceEligibility";
import { getDiscountInfo } from "@/lib/discountHelper";

/**
 * Generic Service Icon
 */
function ServiceIcon({ className = "w-8 h-8" }) {
  return (
    <div
      className={`${className} rounded-md bg-slate-100 flex flex-col items-center justify-center shrink-0 shadow-2xs select-none`}
      aria-label="Service Icon"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 text-slate-700"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </div>
  );
}

/**
 * Sathya / Onsitego warranty badge
 */
function OnsitegoIcon({ className = "shrink-0 w-10 h-12" }) {
  return (
    <img
      src="/images/Warranty_Asure_web.webp"
      alt="Sathya Onsitego Extended Warranty"
      className={`${className} object-contain`}
    />
  );
}

/**
 * Information Icon SVG
 */
function InfoCircleIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Indian Rupee Number Formatter
 */
const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * ProductInstallationWarrantySection
 * Exact UI clone of the reference screenshot containing:
 * 1. Installation & Protection Service (Expandable / Collapsible)
 * 2. Extended Warranty (Expandable / Collapsible with 1Y, 2Y, 3Y cards)
 *
 * @param {Object} props
 * @param {Object} props.product - Current product object
 * @param {Array} [props.warranties] - Array of warranty plans from DB
 * @param {Object|null} [props.selectedWarrantyData] - Currently selected warranty object
 * @param {(warranty: Object|null, amount: number) => void} [props.onSelectWarranty] - Selection callback
 * @param {string} [props.className] - Scoped container classes
 */
export default function ProductInstallationWarrantySection({
  product = {},
  warranties = [],
  extend_warranty = null,
  selectedWarrantyData = null,
  onSelectWarranty,
  className = "",
}) {
  const [isInstallationExpanded, setIsInstallationExpanded] = useState(true);
  const [isWarrantyExpanded, setIsWarrantyExpanded] = useState(true);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});

  // Real-world E-Commerce Category & Blacklist Eligibility
  const warrantyEligible = useMemo(
    () => isExtendedWarrantyEligible(product),
    [product]
  );
  const installationEligible = useMemo(
    () => isInstallationEligible(product),
    [product]
  );

  // Auto-cleanup: If product is not eligible for warranty, prevent any lingering selection
  useEffect(() => {
    if (!warrantyEligible && selectedWarrantyData !== null && onSelectWarranty) {
      onSelectWarranty(null, 0);
    }
  }, [warrantyEligible, selectedWarrantyData, onSelectWarranty]);

  // Base price extraction
  const productPrice = useMemo(() => {
    const sp = Number(product?.special_price);
    const p = Number(product?.price);
    if (sp > 0) return sp;
    if (p > 0) return p;
    return 35000;
  }, [product?.special_price, product?.price]);

  // Product category name for contextual title
  const categoryLabel = useMemo(() => {
    if (product?.sub_category_new_name) {
      return product.sub_category_new_name.replace(/##/g, " / ");
    }
    if (product?.categoryName) {
      return product.categoryName;
    }
    if (product?.category_name) {
      return product.category_name;
    }
    if (typeof product?.category === "object" && product?.category?.name) {
      return product.category.name;
    }
    return "Product";
  }, [product?.sub_category_new_name, product?.categoryName, product?.category_name, product?.category]);

  // Installation category logic - strict AC matching to prevent false positives
  const { isAC } = useMemo(() => {
    const cat = categoryLabel.toLowerCase();
    return {
      isAC: /\bac\b/i.test(cat) || cat.includes("air conditioner") || cat.includes("air-conditioner"),
    };
  }, [categoryLabel]);

  // Clean brand title without raw 24-character hex ObjectIds
  const brandTitle = useMemo(() => {
    let raw = "";
    if (typeof product?.brand === "string") {
      raw = product.brand;
    } else if (product?.brand && typeof product?.brand === "object") {
      raw = product.brand.name || product.brand.title || "";
    }
    if (!raw) {
      raw = product?.brand_name || product?.brandName || "";
    }

    const cleaned = String(raw).replace(/^[0-9a-fA-F]{24}\s*/, "").trim();
    if (!cleaned || /^[0-9a-fA-F]{24}$/.test(cleaned)) {
      return "";
    }
    return cleaned;
  }, [product]);

  // Dynamic Service Bullets for physical installation appliances
  const serviceBullets = useMemo(() => {
    if (isAC) {
      return [
        "Site feasibility & voltage check",
        "Standard mounting & installation of Indoor/Outdoor units",
        "Cooling check & feature demonstration"
      ];
    }
    return [
      "Installation location feasibility check",
      "Unboxing, alignment, and leveling",
      "Power source setup & demonstration"
    ];
  }, [isAC]);

  // Installation Price Logic
  const installationPrice = useMemo(() => {
    const price = Number(product?.installation_price || product?.installation_charges || 0);
    return isNaN(price) ? 0 : price;
  }, [product?.installation_price, product?.installation_charges]);

  // Toggle expandable details on individual warranty card
  const toggleCardDetails = (cardId, e) => {
    e.stopPropagation();
    setExpandedCardDetails((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Determine available warranty source array:
  // 1. Explicit prop `extend_warranty`
  // 2. `product.extend_warranty`
  // 3. Fallback `warranties` prop
  const sourceWarrantyList = useMemo(() => {
    if (Array.isArray(extend_warranty) && extend_warranty.length > 0) {
      return extend_warranty;
    }
    if (Array.isArray(product?.extend_warranty) && product.extend_warranty.length > 0) {
      return product.extend_warranty;
    }
    if (Array.isArray(warranties) && warranties.length > 0) {
      return warranties;
    }
    return [];
  }, [extend_warranty, product?.extend_warranty, warranties]);

  // Build the 3 standard warranty cards (1 Year, 2 Years, 3 Years)
  // Maps over existing extend_warranty array ({ year, amount }) or uses Onsitego slabs
  const warrantyCards = useMemo(() => {
    const findByYear = (yr) =>
      sourceWarrantyList.find((w) => Number(w.year) === yr) || null;

    // Official Onsitego Slab Calculator fallback for Large Appliances
    const getOnsitegoSlabPrice = (yr, price) => {
      const p = Math.round(Number(price) || 0);
      if (p >= 25001 && p <= 30000) {
        return yr === 1 ? 2399 : yr === 2 ? 3299 : 4499;
      }
      if (p >= 30001 && p <= 35000) {
        return yr === 1 ? 2799 : yr === 2 ? 3999 : 5299;
      }
      if (p >= 35001 && p <= 40000) {
        return yr === 1 ? 3199 : yr === 2 ? 4499 : 5999;
      }
      if (p >= 20001 && p <= 25000) {
        return yr === 1 ? 1999 : yr === 2 ? 2799 : 3799;
      }
      if (p >= 15001 && p <= 20000) {
        return yr === 1 ? 1599 : yr === 2 ? 2299 : 3099;
      }
      if (p >= 40001 && p <= 50000) {
        return yr === 1 ? 3699 : yr === 2 ? 5199 : 6999;
      }
      if (p >= 50001 && p <= 75000) {
        return yr === 1 ? 4499 : yr === 2 ? 6399 : 8599;
      }
      if (p > 75000) {
        return yr === 1 ? 5499 : yr === 2 ? 7799 : 10499;
      }
      return yr === 1 ? 1299 : yr === 2 ? 1799 : 2499;
    };

    const years = [1, 2, 3];

    return years.map((yr) => {
      const dbItem = findByYear(yr);
      const price =
        dbItem && (dbItem.amount != null || dbItem.price != null)
          ? Number(dbItem.amount ?? dbItem.price) || 0
          : getOnsitegoSlabPrice(yr, productPrice);

      const yearText = yr === 1 ? "1 Year" : `${yr} Years`;
      const mrp = Math.round(price * 1.15);
      const { discountPercent, showDiscount } = getDiscountInfo(mrp, price);

      return {
        id: `w-${yr}yr`,
        year: yr,
        title: `${yearText} - Onsitego Extended Warranty`,
        subtitle: "Extended Warranty",
        dbItem: {
          item_no:
            dbItem?.item_no ||
            `ONSITEGO-${yr}Y-${product?.item_code || product?._id || "DEF"}`,
          item_code: product?.item_code || "",
          year: yr,
          price: price,
          amount: price,
          name: `${yearText} Onsitego Extended Warranty`,
          brand: "Onsitego",
          status: "Active",
          ...(typeof dbItem === "object" ? dbItem : {}),
        },
        price: price,
        mrp: yr > 1 && showDiscount ? mrp : null,
        discountPercent: yr > 1 && showDiscount ? discountPercent : null,
        mrpLabel: yr === 1 ? "MRP (Inclusive of all taxes)" : null,
        features: [
          "100% Cashless Repairs & Service",
          "Repair or Replacement Guarantee",
        ],
        extraBenefits: [
          "Zero Depreciation",
          "Free Pick & Drop",
          "Extended Warranty activates after expiry of Brand warranty.",
          "Unlimited repair visits by brand-authorized experts",
        ],
      };
    });
  }, [sourceWarrantyList, productPrice, product?._id, product?.item_code]);

  // Handle plan Add / Remove
  const handleTogglePlan = (card) => {
    if (!onSelectWarranty) return;

    // Check if the clicked plan is already selected
    const isCurrent =
      Number(selectedWarrantyData?.year) === Number(card.year) ||
      (selectedWarrantyData?.item_no &&
        selectedWarrantyData.item_no === card.dbItem?.item_no);

    if (isCurrent) {
      // Unselect: reset payload and amount back to 0
      onSelectWarranty(null, 0);
    } else {
      // Extract exact numeric amount from card or dbItem
      const exactAmount = Number(
        card.dbItem?.amount ?? card.price ?? card.dbItem?.price ?? 0
      );

      const payload = {
        item_no:
          card.dbItem?.item_no ||
          `ONSITEGO-${card.year}Y-${product?.item_code || product?._id || "DEF"}`,
        item_code: product?.item_code || "",
        year: Number(card.year),
        amount: exactAmount,
        price: exactAmount,
        name: `${card.year} Year${card.year > 1 ? "s" : ""} Onsitego Extended Warranty`,
        brand: "Onsitego",
        status: "Active",
        ...(typeof card.dbItem === "object" ? card.dbItem : {}),
      };
      // Overwrite to ensure pure numeric values
      payload.amount = exactAmount;
      payload.price = exactAmount;
      payload.year = Number(card.year);

      // Select new plan with exact numeric amount (switches from previous plan seamlessly)
      onSelectWarranty(payload, exactAmount);
    }
  };

  if (!warrantyEligible && !installationEligible) {
    return null;
  }

  return (
    <div className={`w-full space-y-3 font-sans text-gray-900 ${className}`}>
      {/* ========================================================
          1. EXTENDED WARRANTY SECTION
         ======================================================== */}
      {warrantyEligible && (
        <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
          {/* Accordion Header */}
          <div
            onClick={() => setIsWarrantyExpanded((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-gray-50/70 transition-colors"
            role="button"
            tabIndex={0}
            aria-expanded={isWarrantyExpanded}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsWarrantyExpanded((prev) => !prev);
              }
            }}
          >
            <div>
              <h4 className="text-xs sm:text-[13px] font-bold text-gray-900 tracking-tight leading-tight">
                Extended Warranty
              </h4>
              <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-tight">
                Protect your purchase beyond manufacturer warranty
              </p>
            </div>

            {/* Expand/Collapse Arrow */}
            <div className="p-1 text-gray-400 hover:text-gray-600 transition-transform duration-200">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transform transition-transform duration-200 ${isWarrantyExpanded ? "rotate-180" : "rotate-0"
                  }`}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Collapsible Content */}
          {isWarrantyExpanded && (
            <div className="p-3.5 sm:p-4 pt-1 sm:pt-1 bg-white">
              {/* 3 Warranty Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {warrantyCards.map((card) => {
                  const isSelected =
                    (selectedWarrantyData?.item_no &&
                      selectedWarrantyData.item_no === card.dbItem.item_no) ||
                    Number(selectedWarrantyData?.year) === Number(card.year);
                  const isExpanded = Boolean(expandedCardDetails[card.id]);

                  return (
                    <div
                      key={card.id}
                      className={`relative flex flex-col justify-between rounded-xl p-3 sm:p-3.5 bg-white transition-all duration-200 ${isSelected
                        ? "border-2 border-blue-600 bg-blue-50/20 shadow-md ring-1 ring-blue-500/20"
                        : "border border-gray-200 hover:border-gray-300 hover:shadow-xs"
                        }`}
                    >
                      {/* Selected Plan micro-badge on top-right */}
                      {isSelected && (
                        <span className="absolute -top-2.5 right-3 bg-blue-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 leading-tight tracking-tight">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Selected Plan
                        </span>
                      )}

                      {/* Top: Icon + Title + Subtitle (Strict Two-Column Layout) */}
                      <div>
                        <div className="flex items-start gap-3 min-w-0 mb-2">
                          {/* Left Column: Fixed Icon */}
                          <div className="shrink-0 w-10 h-12 flex items-center justify-center">
                            <OnsitegoIcon className="w-10 h-12" />
                          </div>

                          {/* Right Column: Title & Plan Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 leading-snug break-words">
                              {card.year} {card.year === 1 ? "Year" : "Years"} - Onsitego Plan
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">Extended Warranty</p>
                          </div>
                        </div>

                        {/* Bullet points features */}
                        <ul className="mt-2.5 space-y-1 text-[10px] sm:text-[10.5px] text-gray-600 pl-0.5">
                          {card.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-gray-400 font-bold leading-none">•</span>
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Expandable Extra Details (+4 More / Show Less) */}
                        {isExpanded && (
                          <ul className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-1 text-[10px] text-gray-600 pl-0.5 animate-in fade-in duration-150">
                            {card.extraBenefits.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-slate-700">
                                <span className="text-blue-500 font-bold leading-none">✓</span>
                                <span className="leading-snug">{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* "+4 More" interaction link */}
                        <button
                          type="button"
                          onClick={(e) => toggleCardDetails(card.id, e)}
                          className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer mt-1.5 block"
                        >
                          {isExpanded ? "Show Less" : "+4 More"}
                        </button>
                      </div>

                      {/* Bottom: Divider + Price + Add Button */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-end justify-between gap-2">
                        {/* Price info */}
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 block leading-tight">
                            ₹{formatCurrency(card.price)}
                          </span>

                          {/* MRP / Discount label */}
                          {card.mrpLabel && (
                            <span className="text-[9px] text-gray-400 block leading-tight mt-0.5 truncate">
                              {card.mrpLabel}
                            </span>
                          )}

                          {card.mrp && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {card.discountPercent && (
                                <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1 py-0.2 rounded leading-tight">
                                  {card.discountPercent}% OFF
                                </span>
                              )}
                              <span className="text-[9px] text-gray-400 line-through leading-tight">
                                MRP ₹{formatCurrency(card.mrp)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Add / Toggle Button */}
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePlan(card)}
                            className="group/wbtn relative text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-600 bg-blue-600 text-white shadow-2xs hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all cursor-pointer shrink-0 select-none overflow-hidden"
                            aria-pressed={true}
                            title="Click to remove warranty plan"
                          >
                            <span className="inline-flex items-center gap-1 group-hover/wbtn:hidden">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              Added
                            </span>
                            <span className="hidden items-center gap-1 group-hover/wbtn:inline-flex text-red-600 font-bold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePlan(card)}
                            className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 active:scale-95 transition-all cursor-pointer shrink-0 select-none"
                            aria-pressed={false}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          2. INSTALLATION & PROTECTION SERVICE SECTION
         ======================================================== */}
      {installationEligible && (
        <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
          {/* Accordion Header */}
          <div
            onClick={() => setIsInstallationExpanded((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-gray-50/70 transition-colors"
            role="button"
            tabIndex={0}
            aria-expanded={isInstallationExpanded}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsInstallationExpanded((prev) => !prev);
              }
            }}
          >
            <div>
              <h4 className="text-xs sm:text-[13px] font-bold text-gray-900 tracking-tight leading-tight">
                Installation & Protection Service
              </h4>
              <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-tight">
                Product Installation and demo
              </p>
            </div>

            {/* Expand/Collapse Arrow */}
            <div className="p-1 text-gray-400 hover:text-gray-600 transition-transform duration-200">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transform transition-transform duration-200 ${isInstallationExpanded ? "rotate-180" : "rotate-0"
                  }`}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Collapsible Content */}
          {isInstallationExpanded && (
            <div className="p-3.5 sm:p-4 pt-1 sm:pt-1 bg-white">
              {/* Highlighted Service Card with Royal Blue Accent Border */}
              <div className="w-full rounded-xl border-2 border-blue-600 bg-white p-3.5 sm:p-4 shadow-2xs">
                {/* Logo + Service Title */}
                <div className="flex items-start gap-3">
                  <ServiceIcon className="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-snug">
                      {brandTitle
                        ? `${brandTitle} Authorized Installation & Demo`
                        : "Authorized Installation & Demo"}
                    </h5>
                  </div>
                </div>

                {/* 3 Short Service Details */}
                <ul className="mt-2.5 space-y-1.5 text-[11px] sm:text-xs text-gray-600 pl-1">
                  {serviceBullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-gray-400 font-bold leading-none">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {isAC && (
                  <p className="mt-2 text-[10px] text-gray-500 italic pl-1">
                    *Note: Core cutting, extra copper pipes, or scaffolding will incur additional charges at actuals.
                  </p>
                )}

                {/* Pricing Label */}
                <div className="mt-3">
                  {installationPrice === 0 ? (
                    <span className="text-sm font-bold text-green-600 block leading-tight">
                      Free
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-gray-900 block leading-tight">
                      ₹{formatCurrency(installationPrice)}
                    </span>
                  )}
                </div>

                {/* Read more about benefits link with info icon */}
                <button
                  type="button"
                  onClick={() => setShowBenefitsModal(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer transition-colors"
                >
                  <span>Read more about benefits</span>
                  <InfoCircleIcon className="w-3.5 h-3.5 text-teal-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. BENEFITS INFORMATION MODAL
         ======================================================== */}
      {showBenefitsModal && (
        <BenefitsModal onClose={() => setShowBenefitsModal(false)} />
      )}
    </div>
  );
}

/**
 * Benefits Information Modal
 */
function BenefitsModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const benefitList = [
    {
      title: "Certified Brand Technicians",
      description:
        "Trained and verified engineers carry out the unboxing, safety inspection, and installation.",
    },
    {
      title: "Pre-Installation Feasibility Check",
      description:
        "Comprehensive assessment of electrical supply, earthing, plumbing, and positioning before mounting.",
    },
    {
      title: "Standard Leveling & Setup",
      description:
        "Precise leveling and secure connections to power and water outlets to avoid vibration and damage.",
    },
    {
      title: "Demonstration & Usage Guidelines",
      description:
        "Walkthrough of key features, energy saving modes, operating do's and don'ts, and cleaning tips.",
    },
    {
      title: "Transparent Pricing",
      description:
        "Standard installation service and demo fees (if any) are clearly mentioned, with no hidden charges at your doorstep.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <ServiceIcon className="w-6 h-6" />
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Installation & Demo Benefits
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Benefits Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {benefitList.map((item, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white transition-colors"
            >
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="text-blue-600 font-black">✓</span>
                {item.title}
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed pl-4">
                {item.description}
              </p>
            </div>
          ))}

          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-blue-900">
            <span className="font-bold">Service Scheduling: </span>
            Our installation partner connects within 24–48 hours of successful product delivery to confirm your preferred slot.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
