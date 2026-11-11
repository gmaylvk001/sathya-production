"use client";

import React, { useState, useEffect } from "react";
import ExchangeOfferModal from "./ExchangeOfferModal";

async function resolveCategoryNames(productCategory, categoryId, subCategoryId) {
  const names = new Set(
    String(productCategory || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

  const ids = [...new Set([categoryId, subCategoryId].filter(Boolean).map((id) => String(id)))];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api/categories/breadcrumb?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const cat = await res.json();
        if (cat?.category_name) names.add(String(cat.category_name).trim());
      } catch (err) {
        console.warn("Exchange offer category lookup failed:", err);
      }
    })
  );

  return [...names].join(",");
}

export default function ExchangeOfferSection({
  productCategory,
  categoryId,
  subCategoryId,
  sellingPrice = 0,
  mrp = 0,
  onExchangeApply,
  onAvailabilityChange,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [hasExchangeOffers, setHasExchangeOffers] = useState(false);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [resolvedCategory, setResolvedCategory] = useState(productCategory || "");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("without");

  useEffect(() => {
    let cancelled = false;
    const checkAvailability = async () => {
      setIsLoading(true);
      try {
        const categoryName = await resolveCategoryNames(productCategory, categoryId, subCategoryId);
        if (cancelled) return;
        setResolvedCategory(categoryName);

        if (!categoryName) {
          setHasExchangeOffers(false);
          onAvailabilityChange?.(false);
          return;
        }

        const res = await fetch(
          `/api/exchange-offers-condition/options?categoryName=${encodeURIComponent(categoryName)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success && (data.data.hasOffers || data.data.types?.length > 0)) {
          setHasExchangeOffers(true);
          setMaxDiscount(Number(data.data.maxDiscount) || 0);
          onAvailabilityChange?.(true);
        } else {
          setHasExchangeOffers(false);
          setMaxDiscount(0);
          onAvailabilityChange?.(false);
        }
      } catch (err) {
        if (!cancelled) {
          setHasExchangeOffers(false);
          onAvailabilityChange?.(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAvailability();
    return () => {
      cancelled = true;
    };
  }, [productCategory, categoryId, subCategoryId]);

  const handleApply = (offer) => {
    setAppliedOffer(offer);
    onExchangeApply(offer);
  };

  const handleRemove = () => {
    setAppliedOffer(null);
    onExchangeApply(null);
  };

  if (isLoading || !hasExchangeOffers) return null;

  const displayPrice = Number(sellingPrice) || 0;
  const displayMrp = Number(mrp) || 0;
  const saveAmount = displayMrp > displayPrice ? displayMrp - displayPrice : 0;
  const savePercent = displayMrp > 0 && saveAmount > 0 ? Math.round((saveAmount / displayMrp) * 100) : 0;
  const upToAmount = Number(appliedOffer?.price || maxDiscount) || 0;
  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="w-full mt-3">
      <div className="flex items-stretch border-b-2 border-[#d72828]">
        <button
          type="button"
          onClick={() => setActiveTab("without")}
          className={`px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wide ${
            activeTab === "without" ? "bg-[#d72828] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          WITHOUT EXCHANGE
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("with")}
          className={`px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wide ${
            activeTab === "with" ? "bg-[#d72828] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          WITH EXCHANGE
        </button>
      </div>

      <div className="pt-3 pb-1">
        {activeTab === "with" && upToAmount > 0 && (
          <p className="text-green-600 font-semibold text-sm mb-1">
            Up To ₹{Number(upToAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Off
          </p>
        )}

        {displayPrice > 0 && (
          <>
            <p className="text-3xl font-bold text-gray-900 leading-none">₹{formatMoney(displayPrice)}</p>
            <p className="text-xs text-gray-500 mt-1">(Incl. all Taxes)</p>
          </>
        )}

        {activeTab === "without" && saveAmount > 0 && (
          <p className="text-sm mt-2">
            <span className="text-[#c45c5c] line-through">MRP: ₹{formatMoney(displayMrp)}</span>
            <span className="text-green-600 font-medium"> (Save ₹{formatMoney(saveAmount)}, {savePercent}% Off)</span>
          </p>
        )}

        {activeTab === "with" && (
          <div className="mt-3">
            {appliedOffer ? (
              <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 px-3 py-2.5">
                <div>
                  <p className="text-sm text-gray-800">Exchange applied: ₹{formatMoney(appliedOffer.price)}</p>
                  <p className="text-xs text-gray-500">
                    {appliedOffer.brand} {appliedOffer.type} ({appliedOffer.condition})
                  </p>
                </div>
                <button type="button" onClick={handleRemove} className="text-red-600 text-xs font-semibold">
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-[#f3f4f6] border border-gray-200 text-gray-700 text-sm py-3 px-4 text-left hover:bg-gray-200 transition-colors"
              >
                Choose Product to Exchange
              </button>
            )}
          </div>
        )}
      </div>

      <ExchangeOfferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryName={resolvedCategory}
        onApply={handleApply}
      />
    </div>
  );
}
