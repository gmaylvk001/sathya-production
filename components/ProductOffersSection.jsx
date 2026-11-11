"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { calculateBestPrice, getSellingPrice } from "@/lib/bestPriceResolver";
import { buildSafePaymentOffersData } from "@/lib/paymentOfferFallback";
import BankLogo from "./product/BankLogo";

/**
 * Classical Bank Icon (pediment with pillars)
 */
function BankBuildingIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2L2 7h20L12 2zm-8 7h2v9H4V9zm5 0h2v9H9V9zm5 0h2v9h-2V9zm5 0h2v9h-2V9zM2 20h20v2H2v-2z" />
    </svg>
  );
}

/**
 * Iconic SBI Bank Logo SVG (Sky blue circle with white keyhole)
 */
function SBILogoIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="#0082cb" />
      <circle cx="12" cy="10" r="3.2" fill="#ffffff" />
      <rect x="10.8" y="10" width="2.4" height="7.5" fill="#ffffff" rx="1.2" />
    </svg>
  );
}

/**
 * Iconic Axis Bank Logo SVG (Burgundy square with white chevron)
 */
function AxisLogoIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="4" fill="#881337" />
      <path d="M12 5.5l5.5 11h-3.2L12 11.8l-2.3 4.7H6.5L12 5.5z" fill="#ffffff" />
    </svg>
  );
}

/**
 * Classical Credit Card Icon
 */
function CreditCardIcon({ className = "w-4 h-4", color = "#dc2626" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
    </svg>
  );
}

/**
 * Official HDFC Bank Logo SVG (Circular white base with red outer frame corners and central blue square)
 */
function HDFCLogoIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HDFC Bank"
      role="img"
    >
      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
      <rect x="44.4" y="44.4" width="11.2" height="11.2" fill="#004c8f" rx="0.5" />
      <path d="M22 22 H44.4 V33.2 H33.2 V44.4 H22 Z" fill="#ed1c24" />
      <path d="M55.6 22 H78 V44.4 H66.8 V33.2 H55.6 Z" fill="#ed1c24" />
      <path d="M22 55.6 H33.2 V66.8 H44.4 V78 H22 Z" fill="#ed1c24" />
      <path d="M66.8 55.6 H78 V78 H55.6 V66.8 H66.8 Z" fill="#ed1c24" />
    </svg>
  );
}

/**
 * Dynamic Bank Logo Badge Component
 */
function BankLogoBadge({ bankShortCode, bankName, logoUrl, className = "w-7 h-7" }) {
  const code = (bankShortCode || "").toUpperCase();

  if (code === "KOTAK") {
    return (
      <div className={`${className} rounded bg-[#ED1C24] flex items-center justify-center p-0.5 border border-red-200 shrink-0`}>
        <span className="text-[7.5px] font-black text-white tracking-tighter">kotak</span>
      </div>
    );
  }
  if (code === "SCB") {
    return (
      <div className={`${className} rounded bg-white flex items-center justify-center p-0.5 border border-gray-200 shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
          <path d="M7 5c-2 2-2 5 0 7l5 5c2 2 5 2 7 0l-3-3c-1 1-3 1-4 0l-4-4c-1-1-1-3 0-4L7 5z" fill="#00965e" />
          <path d="M17 19c2-2 2-5 0-7l-5-5c-2-2-5-2-7 0l3 3c1-1 3-1 4 0l4 4c1 1 1 3 0 4l1 1z" fill="#0072ce" />
        </svg>
      </div>
    );
  }
  if (code === "SBI") {
    return <SBILogoIcon className={className} />;
  }
  if (code === "AXIS") {
    return <AxisLogoIcon className={className} />;
  }
  if (code === "HDFC") {
    const effectiveLogo = logoUrl || "/images/banks/hdfc.svg";
    if (effectiveLogo) {
      return (
        <div className={`${className} relative rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-2xs shrink-0`}>
          <Image
            src={effectiveLogo}
            alt={bankName || "HDFC Bank"}
            width={28}
            height={28}
            className="w-full h-full object-contain"
            unoptimized
          />
        </div>
      );
    }
    // Graceful fallback if logo URL is completely missing
    return (
      <div className={`${className} rounded bg-[#004c8f] flex items-center justify-center text-[7.5px] font-black text-white shrink-0`}>
        HDFC
      </div>
    );
  }
  if (code === "ICICI") {
    return (
      <div className={`${className} rounded bg-[#b02a30] flex items-center justify-center text-[7.5px] font-black text-white shrink-0`}>
        ICICI
      </div>
    );
  }

  // Graceful fallback with logoUrl for any custom bank
  if (logoUrl) {
    return (
      <div className={`${className} relative rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 shrink-0`}>
        <Image
          src={logoUrl}
          alt={bankName || code}
          width={28}
          height={28}
          className="w-full h-full object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={`${className} rounded bg-slate-50 flex items-center justify-center border border-slate-200 shrink-0`}>
      <BankBuildingIcon className="w-3.5 h-3.5" color="#475569" />
    </div>
  );
}

/**
 * Checkmark circle icon (Solid orange circle with white checkmark)
 */
function OrangeCheckCircleIcon({ className = "w-4 h-4" }) {
  return (
    <div className={`${className} rounded-full bg-[#f97316] flex items-center justify-center shrink-0`}>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-2.5 h-2.5 text-white"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/**
 * Indian Rupee Number Formatter
 */
const formatIndianCurrency = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * ProductOffersSection
 * Dynamic production-grade Payment Offers presentation layer
 */
export default function ProductOffersSection({
  product = {},
  productId = null,
  externalShowEmiModal = false,
  onExternalCloseEmiModal,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBankKey, setSelectedBankKey] = useState("all");

  const [paymentOffersData, setPaymentOffersData] = useState(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const fetchRequestIdRef = useRef(0);

  // Sync external EMI modal trigger if provided
  useEffect(() => {
    if (externalShowEmiModal) {
      setShowEmiModal(true);
    }
  }, [externalShowEmiModal]);

  const handleCloseEmiModal = useCallback(() => {
    setShowEmiModal(false);
    if (onExternalCloseEmiModal) {
      onExternalCloseEmiModal();
    }
  }, [onExternalCloseEmiModal]);

  // Canonical base selling price
  const basePrice = useMemo(() => {
    const sp = getSellingPrice(product);
    if (sp > 0) return sp;
    return 40990;
  }, [product]);

  // Dynamic Best Price calculation
  const bestPriceData = useMemo(() => {
    if (
      product?.bestPriceDetails &&
      Number(product.bestPriceDetails.sellingPrice) === basePrice
    ) {
      return product.bestPriceDetails;
    }
    return calculateBestPrice(product);
  }, [product, basePrice]);

  // Safe non-promotional standard banking fallbacks when DB/API is unavailable
  const defaultOffersData = useMemo(() => {
    return buildSafePaymentOffersData(
      product?._id || productId || "",
      product?.name || "",
      basePrice
    );
  }, [product?._id, productId, product?.name, basePrice]);

  // Fetch dynamic payment offers from Payment Offer Engine
  const targetId = productId || product?._id || product?.slug || product?.item_code;
  useEffect(() => {
    if (!targetId) return;

    let isMounted = true;
    const reqId = ++fetchRequestIdRef.current;
    setIsLoadingOffers(true);

    fetch(`/api/products/${targetId}/payment-offers`)
      .then((res) => {
        if (!res.ok) {
          return null;
        }
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (isMounted && reqId === fetchRequestIdRef.current) {
          if (data && (Array.isArray(data.emiOffers) || Array.isArray(data.bankOffers))) {
            setPaymentOffersData(data);
          }
          setIsLoadingOffers(false);
        }
      })
      .catch(() => {
        if (isMounted && reqId === fetchRequestIdRef.current) {
          setIsLoadingOffers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetId, basePrice]);

  // Dynamic offers derived from API with fallback to defaults
  const emiOffersList = useMemo(() => {
    if (paymentOffersData?.emiOffers && paymentOffersData.emiOffers.length > 0) {
      return paymentOffersData.emiOffers;
    }
    return defaultOffersData.emiOffers;
  }, [paymentOffersData, defaultOffersData]);

  const bankOffersList = useMemo(() => {
    if (paymentOffersData?.bankOffers && paymentOffersData.bankOffers.length > 0) {
      return paymentOffersData.bankOffers;
    }
    return defaultOffersData.bankOffers;
  }, [paymentOffersData, defaultOffersData]);

  const bestEmiOffer = paymentOffersData?.bestEmiOffer || emiOffersList[0] || null;
  const bestBankOffer = paymentOffersData?.bestBankOffer || bankOffersList[0] || null;

  // Header display price (lowest effective price from API or Best Bank Offer or calculated Best Price)
  const headerBestPrice = useMemo(() => {
    if (
      paymentOffersData?.bestPrice !== undefined &&
      Number(paymentOffersData.bestPrice) > 0 &&
      Number(paymentOffersData.bestPrice) < basePrice
    ) {
      return Number(paymentOffersData.bestPrice);
    }
    if (bestBankOffer?.effectivePrice && bestBankOffer.effectivePrice < basePrice) {
      return bestBankOffer.effectivePrice;
    }
    return bestPriceData.bestPrice;
  }, [paymentOffersData, bestBankOffer, bestPriceData, basePrice]);

  return (
    <div
      className={`w-full rounded-xl border border-gray-200/90 bg-white overflow-hidden shadow-2xs font-sans text-gray-900 ${className}`}
    >
      {/* 1. TOP HEADER BANNER (Light Blush Background with Best Price Badge & Accordion Toggle) */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full bg-[#fdf2f4] px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-[#faebee]"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Magenta / Crimson Pill Badge */}
          <span className="inline-flex items-center justify-center bg-[#d81b60] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded tracking-wide shadow-2xs uppercase">
            BEST PRICE
          </span>

          {/* Green Price */}
          <span className="text-[#059669] font-black text-sm sm:text-[15px] tracking-tight">
            ₹{formatIndianCurrency(headerBestPrice, 2)}
          </span>

          {/* Label with Blue Offers text */}
          <span className="text-slate-600 text-[11px] sm:text-xs font-normal">
            with all applicable{" "}
            <span className="text-[#2563eb] font-semibold hover:underline">Offers</span>
          </span>
        </div>

        {/* Accordion Chevron Icon */}
        <div className="p-1 text-slate-500 hover:text-slate-700 transition-transform duration-200">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"
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

      {/* 2. COLLAPSIBLE OFFERS BODY */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 bg-white transition-all duration-300">
          {/* Main Title: Orange Check Circle + Payment Offers */}
          <div className="flex items-center gap-2 mb-3">
            <OrangeCheckCircleIcon className="w-4 h-4" />
            <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
              Payment Offers
            </h4>
          </div>

          {isLoadingOffers && !paymentOffersData ? (
            /* Loading Skeleton */
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* SECTION A: EMI Offers */}
              {emiOffersList.length > 0 && (
                <div className="mb-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
                      EMI Offers
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmiModal(true);
                      }}
                      className="text-[11px] sm:text-xs text-[#2563eb] font-semibold hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {/* EMI Cards Row (Top 3) */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {emiOffersList.slice(0, 3).map((offer, idx) => {
                      const isBest = Boolean(offer.isBestDeal);
                      return (
                        <div
                          key={offer.offerId || idx}
                          onClick={() => {
                            setSelectedBankKey(offer.bankShortCode?.toLowerCase() || "all");
                            setShowEmiModal(true);
                          }}
                          className={`relative flex flex-col justify-between rounded-lg sm:rounded-xl p-2.5 sm:p-3 bg-white transition-all cursor-pointer hover:shadow-sm ${isBest
                              ? "border-2 border-[#d946ef] shadow-xs"
                              : "border border-gray-200"
                            }`}
                        >
                          {/* Top: Icon + Badge */}
                          <div className="flex items-start justify-between min-h-[22px]">
                            <div className="shrink-0">
                              <BankLogoBadge
                                bankShortCode={offer.bankShortCode}
                                bankName={offer.bankName}
                                logoUrl={offer.bankLogoUrl}
                                className="w-7 h-7 sm:w-7 sm:h-7"
                              />
                            </div>
                            {isBest ? (
                              <span className="bg-[#d946ef] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-tight leading-none shadow-2xs">
                                Best Deal
                              </span>
                            ) : offer.badge ? (
                              <span className="bg-slate-100 text-slate-700 text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-tight leading-none border border-slate-200">
                                {offer.badge}
                              </span>
                            ) : (
                              <div className="w-1 h-1" />
                            )}
                          </div>

                          {/* Middle: EMI Amount & Bank Title */}
                          <div className="mt-2 min-h-[46px] flex flex-col justify-start">
                            <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 tracking-tight leading-tight">
                              ₹{formatIndianCurrency(offer.monthlyEmi, 2)}/{offer.tenureMonths}m
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase leading-tight line-clamp-2 mt-1">
                              {offer.description || offer.name}
                            </span>
                          </div>

                          {/* Divider Line */}
                          <div className="border-t border-slate-100 my-2" />

                          {/* Bottom: Effective Price */}
                          <div className="text-[9px] sm:text-[10px] text-slate-600 font-medium tracking-tight">
                            Effective Price: ₹{formatIndianCurrency(offer.effectivePrice, 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separator Line Between EMI Offers & Bank Offers */}
              {emiOffersList.length > 0 && bankOffersList.length > 0 && (
                <div className="border-t border-slate-200/80 my-3 sm:my-3.5" />
              )}

              {/* SECTION B: Bank Offers */}
              {bankOffersList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
                      Bank Offers
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBankModal(true);
                      }}
                      className="text-[11px] sm:text-xs text-[#2563eb] font-semibold hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {/* Bank Cards Row (Top 3) */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {bankOffersList.slice(0, 3).map((offer, idx) => {
                      const isBest = Boolean(offer.isBestOffer);
                      return (
                        <div
                          key={offer.offerId || idx}
                          onClick={() => setShowBankModal(true)}
                          className={`relative flex flex-col justify-between rounded-lg sm:rounded-xl p-2.5 sm:p-3 bg-white transition-all cursor-pointer hover:shadow-sm ${isBest
                              ? "border-2 border-[#d946ef] shadow-xs"
                              : "border border-gray-200"
                            }`}
                        >
                          {/* Top: Icon + Badge */}
                          <div className="flex items-start justify-between min-h-[22px]">
                            <div className="shrink-0">
                              <BankLogoBadge
                                bankShortCode={offer.bankShortCode}
                                bankName={offer.bankName}
                                logoUrl={offer.bankLogoUrl}
                                className="w-7 h-7 sm:w-7 sm:h-7"
                              />
                            </div>
                            {isBest ? (
                              <span className="bg-[#d946ef] text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-tight leading-none shadow-2xs">
                                Best Offer
                              </span>
                            ) : offer.badge ? (
                              <span className="bg-blue-50 text-blue-700 text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-tight leading-none border border-blue-100">
                                {offer.badge}
                              </span>
                            ) : (
                              <div className="w-1 h-1" />
                            )}
                          </div>

                          {/* Middle: Offer Text */}
                          <div className="mt-2 min-h-[46px] flex flex-col justify-start">
                            <span className="text-[10px] sm:text-[11.5px] font-black text-slate-900 leading-snug line-clamp-2">
                              {offer.description || offer.name}
                            </span>
                          </div>

                          {/* Divider Line */}
                          <div className="border-t border-slate-100 my-2" />

                          {/* Bottom: Effective Price */}
                          <div className="text-[9px] sm:text-[10px] text-slate-600 font-medium tracking-tight">
                            Effective Price: ₹{formatIndianCurrency(offer.effectivePrice, 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state fallback if no offers configured/applicable */}
              {emiOffersList.length === 0 && bankOffersList.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-500">
                  No payment offers applicable for this product value at this time.
                </div>
              )}
            </>
          )}

          {/* Bottom subtle divider matching Image 1 */}
          <div className="border-t border-slate-200/60 mt-3 sm:mt-3.5" />
        </div>
      )}

      {/* 3. EMI PLANS & DETAILS MODAL */}
      {showEmiModal && (
        <EmiPlansModal
          basePrice={basePrice}
          emiOffers={emiOffersList}
          selectedBankKey={selectedBankKey}
          onSelectBank={setSelectedBankKey}
          onClose={handleCloseEmiModal}
        />
      )}

      {/* 4. BANK OFFERS & TERMS MODAL */}
      {showBankModal && (
        <BankOffersModal
          basePrice={basePrice}
          bankOffers={bankOffersList}
          bankEffectivePrice={headerBestPrice}
          onClose={() => setShowBankModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Detailed EMI Plans Modal Component with Dynamic Data
 */
export function EmiPlansModal({
  basePrice,
  emiOffers = [],
  selectedBankKey,
  onSelectBank,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Extract unique banks available in the offers
  const bankOptions = useMemo(() => {
    const map = new Map();
    map.set("all", { key: "all", name: "All Banks" });
    for (const o of emiOffers) {
      const code = (o.bankShortCode || "bank").toLowerCase();
      if (!map.has(code)) {
        map.set(code, {
          key: code,
          name: o.bankName || o.bankShortCode,
        });
      }
    }
    return Array.from(map.values());
  }, [emiOffers]);

  // Filter offers by selected bank
  const displayedOffers = useMemo(() => {
    if (!selectedBankKey || selectedBankKey === "all") {
      return emiOffers;
    }
    return emiOffers.filter(
      (o) => (o.bankShortCode || "").toLowerCase() === selectedBankKey.toLowerCase()
    );
  }, [emiOffers, selectedBankKey]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h3 className="text-base font-bold text-gray-900">EMI Plans & Options</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Payable amount:{" "}
              <strong className="text-gray-900">
                ₹{formatIndianCurrency(basePrice, 2)}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Bank Selection Tabs */}
        {bankOptions.length > 1 && (
          <div className="flex overflow-x-auto border-b border-gray-200 px-4 pt-2 bg-white gap-2 scrollbar-none">
            {bankOptions.map((bank) => (
              <button
                key={bank.key}
                onClick={() => onSelectBank(bank.key)}
                className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${selectedBankKey === bank.key
                    ? "border-[#d81b60] text-[#d81b60]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
              >
                {bank.name}
              </button>
            ))}
          </div>
        )}

        {/* EMI Plans Table */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {displayedOffers.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Bank & Plan</th>
                    <th className="p-3">Monthly EMI</th>
                    <th className="p-3">Interest Rate</th>
                    <th className="p-3 text-right">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedOffers.map((offer, idx) => (
                    <tr
                      key={offer.offerId || idx}
                      className={`hover:bg-gray-50 transition-colors ${offer.isNoCostEmi ? "bg-green-50/30" : ""
                        }`}
                    >
                      <td className="p-3">
                        <div className="font-bold text-gray-900">
                          {offer.bankName} - {offer.tenureMonths}m
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5 ${offer.isNoCostEmi
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {offer.isNoCostEmi ? "No Cost EMI" : `${offer.annualInterestRate}% p.a. Standard EMI`}
                        </span>
                      </td>
                      <td className="p-3 font-extrabold text-gray-900">
                        ₹{formatIndianCurrency(offer.monthlyEmi, 2)}
                      </td>
                      <td className="p-3 text-gray-600">
                        {offer.isNoCostEmi ? (
                          <span className="font-bold text-green-600">0% No Cost</span>
                        ) : (
                          `${offer.annualInterestRate}% p.a.`
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ₹{formatIndianCurrency(offer.totalPayable, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-gray-500">
              No EMI schemes available for the selected bank.
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] text-blue-900 space-y-1">
            <p className="font-bold">Important EMI Terms:</p>
            <p>
              • <strong>Standard EMI:</strong> Monthly installment and interest rate are determined by your card-issuing bank as per applicable rates (~14%–15% p.a.).
            </p>
            <p>
              • <strong>No Cost EMI:</strong> Interest discount is provided only when supported by live promotional campaigns verified at checkout.
            </p>
            <p>
              • Taxes (GST on interest) and one-time bank processing fees may apply as per individual bank policy.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

/**
 * Detailed Bank Offers & Terms Modal Component with Dynamic Data
 */
export function BankOffersModal({
  basePrice,
  bankOffers = [],
  bankEffectivePrice,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h3 className="text-base font-bold text-gray-900">All Available Bank Offers</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Effective Price with Best Offer:{" "}
              <strong className="text-green-700">
                ₹{formatIndianCurrency(bankEffectivePrice, 2)}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Offers List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {bankOffers.length > 0 ? (
            bankOffers.map((offer, idx) => (
              <div
                key={offer.offerId || idx}
                className="p-3.5 border border-gray-200 rounded-xl hover:border-gray-300 transition-all bg-white"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <BankLogo
                      bankCode={offer.bankShortCode}
                      bankName={offer.bankName || offer.bankShortCode || "Bank"}
                      logoUrl={offer.bankLogoUrl}
                      size={24}
                    />
                    <span className="text-xs font-bold text-gray-900">
                      {offer.bankName}
                    </span>
                  </div>
                  {offer.isBestOffer ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">
                      Best Offer
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {offer.label || (offer.calculatedDiscount > 0 ? "Instant Discount" : "Payment Option")}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 mb-1 leading-snug">
                  {offer.description || offer.name}
                </h4>
                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
                  <span>
                    Discount:{" "}
                    <strong className="text-green-600 font-bold">
                      {offer.calculatedDiscount > 0
                        ? `₹${formatIndianCurrency(offer.calculatedDiscount, 2)}`
                        : "Standard Terms"}
                    </strong>
                  </span>
                  <span>
                    Effective Price:{" "}
                    <strong className="text-gray-900 font-bold">
                      ₹{formatIndianCurrency(offer.effectivePrice, 2)}
                    </strong>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-gray-500">
              No bank offers available at this time.
            </div>
          )}

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px] text-amber-900">
            <span className="font-bold">Terms & Conditions: </span>
            Promotional bank discounts and cashback are automatically applied on the checkout payment gateway upon entering an eligible bank card. If no bank promotional campaign is active, standard bank transaction terms apply.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
