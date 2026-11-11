"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, ExternalLink, RefreshCw, Layers } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import CompareTable from "@/components/CompareTable";
import CompareEmptyState from "@/components/CompareEmptyState";

export default function ComparisonModal({ isOpen, onClose }) {
  const { compareList, clearCompare, similarProducts, addToCompare } = useCompare();
  const [enrichedList, setEnrichedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSimilarMenu, setShowSimilarMenu] = useState(false);

  const fetchComparisonDetails = useCallback(async () => {
    if (compareList.length === 0) {
      setEnrichedList([]);
      return;
    }

    // Show cached preview immediately so modal feels instant
    setEnrichedList(compareList);
    setLoading(true);

    try {
      const ids = compareList.map((item) => String(item.productId)).join(",");
      const res = await fetch(`/api/compare?ids=${ids}`);
      if (!res.ok) throw new Error("Failed to fetch compare data");

      const data = await res.json();
      const products = data.products || [];
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      // Merge enriched products into compareList format expected by CompareTable
      const merged = compareList.map((item) => {
        const fullProduct = productMap.get(String(item.productId));
        return {
          ...item,
          productData: fullProduct || item.productData || null,
        };
      });

      setEnrichedList(merged);
    } catch (err) {
      console.error("[ComparisonModal] fetch error:", err);
      setEnrichedList(compareList);
    } finally {
      setLoading(false);
    }
  }, [compareList]);

  useEffect(() => {
    if (isOpen) {
      fetchComparisonDetails();
    }
  }, [isOpen, fetchComparisonDetails]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-7xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 text-[#d72828] flex items-center justify-center">
              <Layers size={17} />
            </div>
            <div>
              <h2 id="compare-modal-title" className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Product Comparison
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Comparing {compareList.length} of 4 items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {compareList.length > 0 && (
              <>
                {/* Quick Add Similar dropdown if slots available */}
                {compareList.length < 4 && (similarProducts || []).filter(sp => sp?._id && !compareList.some(item => String(item.productId) === String(sp._id))).length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSimilarMenu((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#d72828] bg-red-50 hover:bg-red-100 font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    >
                      <span>+ Add Similar</span>
                    </button>
                    {showSimilarMenu && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 overflow-y-auto z-50 text-left">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-1 px-1">
                          <span className="text-[11px] font-bold text-gray-700 uppercase">Add to Compare</span>
                          <button onClick={() => setShowSimilarMenu(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                        </div>
                        <div className="space-y-1">
                          {(similarProducts || [])
                            .filter(sp => sp?._id && !compareList.some(item => String(item.productId) === String(sp._id)))
                            .slice(0, 5)
                            .map((sp) => (
                              <div key={sp._id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{sp.name}</p>
                                  <p className="text-[11px] font-bold text-[#d72828]">₹{Number(sp.special_price || sp.price || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    addToCompare(sp);
                                    if (compareList.length + 1 >= 4) setShowSimilarMenu(false);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-[#d72828] text-white rounded-md shrink-0 cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={fetchComparisonDetails}
                  className="p-1.5 text-gray-400 hover:text-[#d72828] transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
                  title="Refresh comparison data"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={clearCompare}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
                <Link
                  href="/compare"
                  onClick={onClose}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span>Full Page</span>
                  <ExternalLink size={12} />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close comparison modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Comparison Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {enrichedList.length === 0 && loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
                  <div className="h-36 bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : enrichedList.length === 0 ? (
            <div className="py-12">
              <CompareEmptyState />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden relative">
              {loading && (
                <div className="absolute top-2 right-3 z-10 text-[10px] font-semibold text-gray-500 bg-white/90 border border-gray-200 rounded-full px-2 py-0.5">
                  Updating…
                </div>
              )}
              <CompareTable products={enrichedList} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
