"use client";

import React from "react";

/**
 * Shield Check Icon SVG
 */
export function ShieldCheckIcon({ className = "w-3.5 h-3.5 text-emerald-600 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * WarrantyBadge Component
 *
 * Modern, accessible badge displayed in the pricing header when an extended warranty plan is active.
 * Features:
 * - Subtle emerald protection styling with refined borders.
 * - Dynamic plan name and formatted price.
 * - Quick-deselect cross button to instantly remove warranty without scrolling.
 *
 * @param {Object} props
 * @param {Object|null} [props.selectedWarranty] - Active warranty plan object
 * @param {number} props.selectedWarrantyAmount - Numeric warranty cost
 * @param {() => void} [props.onDeselect] - Callback invoked when quick-deselect cross is clicked
 * @param {string} [props.className] - Additional Tailwind classes
 */
export default function WarrantyBadge({
  selectedWarranty = null,
  selectedWarrantyAmount = 0,
  onDeselect,
  className = "",
}) {
  const amount = Number(
    selectedWarrantyAmount ||
    selectedWarranty?.amount ||
    selectedWarranty?.price ||
    0
  );

  // Strict isolation: only render when amount > 0 or plan exists
  if (amount <= 0 && !selectedWarranty) {
    return null;
  }

  // Derive human-readable plan title
  const planYear = selectedWarranty?.year;
  const planName =
    selectedWarranty?.title ||
    selectedWarranty?.name ||
    (planYear ? `${planYear} Year${Number(planYear) > 1 ? "s" : ""} Plan` : "Extended Warranty");

  const formattedAmount = amount > 0 ? ` (+₹${amount.toLocaleString("en-IN")})` : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 bg-emerald-50/90 text-emerald-800 border border-emerald-200/90 rounded-full px-2.5 py-1 text-xs md:text-xs font-semibold shadow-2xs transition-all animate-in fade-in duration-150 ${className}`}
      role="status"
      aria-label={`${planName} Included${formattedAmount}`}
    >
      {/* 1. Shield Check Protection Icon */}
      <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />

      {/* 2. Dynamic Plan Label & Price Increment */}
      <span className="tracking-tight truncate max-w-[220px] sm:max-w-none">
        {planName} Included{formattedAmount}
      </span>

      {/* 3. Quick-Deselect Cross Button */}
      {typeof onDeselect === "function" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeselect();
          }}
          aria-label="Remove extended warranty"
          className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-emerald-600 hover:text-emerald-950 hover:bg-emerald-200/60 transition-colors cursor-pointer focus:outline-hidden"
          title="Remove extended warranty"
        >
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
