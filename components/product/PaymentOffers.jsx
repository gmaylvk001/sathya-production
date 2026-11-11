"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import BankLogo from "./BankLogo";
import { usePaymentOffersModal } from "@/hooks/usePaymentOffersModal";
import { EmiPlansModal, BankOffersModal } from "@/components/ProductOffersSection";
import { getStartingEmi } from "@/lib/emiCalculator";
import {
  getPaymentOffersAriaAttributes,
  getPaymentOffersChevronClass,
  getPaymentOffersHeaderMarginClass,
  MIN_EMI_PRICE,
  isEmiEligible,
  filterEligibleBankOffers,
  calculatePaymentOffersBestPrice,
} from "@/lib/paymentOffersHelper";

const RazorpayEmiModal = dynamic(() => import("@/components/product/EmiModal"), {
  ssr: false,
  loading: () => null,
});

export {
  getPaymentOffersAriaAttributes,
  getPaymentOffersChevronClass,
  getPaymentOffersHeaderMarginClass,
  MIN_EMI_PRICE,
  isEmiEligible,
  filterEligibleBankOffers,
  calculatePaymentOffersBestPrice,
};

/**
 * PaymentOffers Component
 * Displays eligible Bank Offers and EMI options for a product.
 * Defensively checks for undefined/null props and handles empty states.
 * Completely collapses to null when no offers are available, preventing empty blank space.
 */
export default function PaymentOffers({
  product,
  price: propPrice,
  externalShowEmiModal,
  onExternalCloseEmiModal,
  initialExpanded = true,
  onAvailabilityChange,
  onOpenEmiModal,
}) {
  const [offersData, setOffersData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(product?._id));
  const [isExpanded, setIsExpanded] = useState(Boolean(initialExpanded));
  const [internalEmiModalOpen, setInternalEmiModalOpen] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleOpenRazorpayEmi = () => {
    if (typeof onOpenEmiModal === "function") {
      onOpenEmiModal();
    } else {
      setInternalEmiModalOpen(true);
    }
  };

  // Isolated interactive modal and card selection state
  const {
    isEmiModalOpen,
    isBankOffersModalOpen,
    selectedBankKey,
    setSelectedBankKey,
    selectedOfferId,
    openEmiModal,
    openBankOffersModal,
    closeModal,
  } = usePaymentOffersModal({
    externalShowEmiModal,
    onExternalCloseEmiModal,
  });

  // 1. Price Coercion & Dynamic Synchronization
  const price = Number(
    propPrice ??
    product?.special_price ??
    product?.price ??
    product?.sellingPrice ??
    product?.finalPrice ??
    0
  );

  const startingEmi = useMemo(() => {
    return getStartingEmi(price);
  }, [price]);

  useEffect(() => {
    if (!product?._id) {
      setIsLoading(false);
      onAvailabilityChange?.(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Fetch from the API which utilizes our refactored offerCalculator
    fetch(`/api/products/${product._id}/payment-offers?price=${price}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Offers API response error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setOffersData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch payment offers:", err);
        if (isMounted) {
          setOffersData(null);
          setIsLoading(false);
          onAvailabilityChange?.(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [product?._id, price]);

  // 2. Strict EMI Rule & Validation
  let rawEmiOffers = Array.isArray(offersData?.emiOffers) ? offersData.emiOffers : [];
  if (price < MIN_EMI_PRICE) {
    rawEmiOffers = [];
  }
  const showEmi = isEmiEligible(price, rawEmiOffers);

  // 3. Strict Bank Offers Filter & Validation
  let rawBankOffers = Array.isArray(offersData?.bankOffers) ? offersData.bankOffers : [];
  const validBankOffers = filterEligibleBankOffers(price, rawBankOffers);
  const showBankOffers = validBankOffers.length > 0;

  // Guarantee Best Deal EMI is always at index 0
  if (rawEmiOffers.length > 0) {
    rawEmiOffers.sort((a, b) => {
      if (a.isBestDeal && !b.isBestDeal) return -1;
      if (!a.isBestDeal && b.isBestDeal) return 1;
      return (Number(a.monthlyEmi) || 0) - (Number(b.monthlyEmi) || 0);
    });
  }

  const hasOffers = Boolean(startingEmi || showEmi || showBankOffers);

  // Synchronize availability state with parent container
  useEffect(() => {
    if (!isLoading) {
      onAvailabilityChange?.(hasOffers);
    }
  }, [hasOffers, isLoading, onAvailabilityChange]);

  // Ensure clean teardown resets parent availability
  useEffect(() => {
    return () => {
      onAvailabilityChange?.(false);
    };
  }, [onAvailabilityChange]);

  // Handle loading state:
  if (isLoading && !offersData) {
    if (price <= 0) {
      return null;
    }
    return (
      <div className="w-full mt-3 h-11 border border-pink-100/60 rounded-xl bg-pink-50/30 animate-pulse" />
    );
  }

  // 4. Container Collapse Rule:
  // When no offers are available, collapse completely to null.
  // NEVER display an empty card, empty container, or placeholder text.
  if (!hasOffers) {
    return null;
  }

  // Calculate best price for the top banner
  const { bestPrice } = calculatePaymentOffersBestPrice(price, validBankOffers);

  return (
    <div className="w-full mt-3">
      {/* 1. TOP ACCORDION / BEST PRICE HEADER */}
      <div
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="payment-offers-collapsible-content"
        aria-label={isExpanded ? "Collapse Payment Offers" : "Expand Payment Offers"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        className={`bg-[#FFF5F5] border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-pink-50/70 transition-all select-none focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1 ${
          isExpanded ? "mb-4" : "mb-0"
        }`}
      >
        {validBankOffers.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
              BEST PRICE
            </span>
            <span className="text-green-600 font-bold text-sm">
              ₹{bestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-gray-500 font-normal">
                with all applicable{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openBankOffersModal();
                  }}
                  className="text-blue-600 font-medium hover:underline cursor-pointer focus:outline-none"
                  title="View applicable bank offers"
                >
                  Offers
                </button>
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
              PAYMENT OFFERS
            </span>
            {startingEmi ? (
              <span className="text-gray-900 font-bold text-sm">
                EMI available from{" "}
                <span className="text-[#b91c1c] font-black">
                  ₹{startingEmi.toLocaleString("en-IN")}/month
                </span>
              </span>
            ) : (
              <span className="text-gray-800 font-bold text-sm">
                Flexible Payment Options
              </span>
            )}
          </div>
        )}

        {/* Accordion Toggle Arrow Button */}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="payment-offers-collapsible-content"
          aria-label={isExpanded ? "Collapse Payment Offers" : "Expand Payment Offers"}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-pink-100/60 transition-all focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
          title={isExpanded ? "Collapse Payment Offers" : "Expand Payment Offers"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* 2. COLLAPSIBLE OFFERS CONTENT */}
      {isExpanded && (
        <div id="payment-offers-collapsible-content" className="animate-fadeIn">
          {/* SECTION HEADER */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 text-base">Payment Offers</h3>
          </div>

          <div className="space-y-4">
            {/* DEDICATED INTEGRATED RAZORPAY EMI STARTING ROW */}
            {startingEmi ? (
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenRazorpayEmi}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenRazorpayEmi();
                  }
                }}
                aria-label={`EMI plans starting from ₹${startingEmi.toLocaleString("en-IN")}/month. View Plans.`}
                className="group border border-red-200/90 hover:border-red-400 rounded-xl p-3 sm:p-3.5 bg-red-50/20 hover:bg-red-50/50 transition-all cursor-pointer flex items-center justify-between gap-2 sm:gap-4 shadow-2xs select-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              >
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      EMI plans starting from{" "}
                      <span className="text-[#b91c1c] font-black">
                        ₹{startingEmi.toLocaleString("en-IN")}/month
                      </span>
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium italic whitespace-nowrap">
                      powered by <strong className="font-semibold text-gray-600">Razorpay</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      <span title="RBL Bank" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#0c2340] text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center border border-white shadow-2xs">R</span>
                      <span title="ICICI Bank" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#991b1b] text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center border border-white shadow-2xs">i</span>
                      <span title="HDFC Bank" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#004c8f] text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center border border-white shadow-2xs">H</span>
                      <span title="SBI Card" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#0082cb] text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center border border-white shadow-2xs">S</span>
                      <span title="Axis Bank" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#881337] text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center border border-white shadow-2xs">A</span>
                    </div>
                    <span className="text-[10.5px] sm:text-[11px] text-gray-500 font-medium truncate">
                      Credit &amp; Debit Cards
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#b91c1c] group-hover:translate-x-0.5 transition-transform shrink-0 pl-1">
                  <span className="whitespace-nowrap">View Plans</span>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ) : null}
        {/* 3. EMI OFFERS ROW */}
        {showEmi && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-gray-800">EMI Offers</h4>
              <button
                type="button"
                onClick={() => openEmiModal("all")}
                className="text-blue-600 text-sm font-medium hover:underline hover:text-blue-700 cursor-pointer focus:outline-hidden"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rawEmiOffers.slice(0, 3).map((offer, index) => {
                const isSelected = selectedOfferId === offer.offerId;
                return (
                  <div
                    key={offer.offerId || `${offer.bankShortCode}-${offer.tenureMonths || index}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEmiModal(offer)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEmiModal(offer);
                      }
                    }}
                    className={`border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? "ring-2 ring-primary border-pink-500 shadow-sm"
                        : offer.isBestDeal
                        ? "border-pink-500 hover:border-pink-600"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <BankLogo
                        bankCode={offer.bankShortCode}
                        bankName={offer.bankName || offer.bankShortCode || "Bank"}
                        logoUrl={offer.bankLogoUrl}
                        size={32}
                      />
                      {offer.isBestDeal ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmiModal(offer);
                          }}
                          className="bg-pink-100 text-pink-600 text-[9px] font-bold px-2 py-0.5 rounded-full hover:bg-pink-200 cursor-pointer"
                        >
                          Best Deal
                        </span>
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmiModal(offer);
                          }}
                          className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full hover:bg-gray-200 cursor-pointer"
                        >
                          Standard EMI
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        ₹{offer.monthlyEmi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{offer.tenureMonths}m
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 uppercase line-clamp-2">
                        {offer.bankName || 'BANK'} CREDIT CARD EMI ({offer.annualInterestRate}% P.A.)
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3">
                      Effective Price: ₹{(offer.totalPayable || offer.effectivePrice || price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. BANK OFFERS ROW */}
        {showBankOffers && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-gray-800">Bank Offers</h4>
              <button
                type="button"
                onClick={() => openBankOffersModal()}
                className="text-blue-600 text-sm font-medium hover:underline hover:text-blue-700 cursor-pointer focus:outline-hidden"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {validBankOffers.slice(0, 3).map((offer, index) => {
                const isSelected = selectedOfferId === offer.offerId;
                return (
                  <div
                    key={offer.offerId || `${offer.bankShortCode || 'bank'}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openBankOffersModal(offer)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBankOffersModal(offer);
                      }
                    }}
                    className={`border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? "ring-2 ring-primary border-fuchsia-500 shadow-sm"
                        : offer.isBestOffer
                        ? "border-fuchsia-500 hover:border-fuchsia-600"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <BankLogo
                        bankCode={offer.bankShortCode}
                        bankName={offer.bankName || offer.bankShortCode || "Bank"}
                        logoUrl={offer.bankLogoUrl}
                        size={32}
                      />
                      {offer.isBestOffer ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openBankOffersModal(offer);
                          }}
                          className="bg-fuchsia-50 text-fuchsia-600 text-[9px] font-bold px-2 py-0.5 rounded-full hover:bg-fuchsia-100 cursor-pointer"
                        >
                          Best Offer
                        </span>
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openBankOffersModal(offer);
                          }}
                          className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full hover:bg-blue-100 cursor-pointer"
                        >
                          Credit/Debit
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-xs line-clamp-2 leading-tight">
                        {offer.name}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3">
                      Effective Price: ₹{offer.effectivePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Fallback Internal Razorpay EMI Options Modal when no parent handler passed */}
      {internalEmiModalOpen && (
        <RazorpayEmiModal
          isOpen={internalEmiModalOpen}
          onClose={() => setInternalEmiModalOpen(false)}
          price={price}
          productName={product?.name}
        />
      )}

      {/* 5. REUSED EMI PLANS & DETAILS MODAL */}
      {isEmiModalOpen && (
        <EmiPlansModal
          basePrice={price}
          emiOffers={rawEmiOffers}
          selectedBankKey={selectedBankKey}
          onSelectBank={setSelectedBankKey}
          onClose={closeModal}
        />
      )}

      {/* 6. REUSED BANK OFFERS & TERMS MODAL */}
      {isBankOffersModalOpen && (
        <BankOffersModal
          basePrice={price}
          bankOffers={validBankOffers}
          bankEffectivePrice={bestPrice}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
