"use client";

import React, { useState } from "react";

export default function ApplyCouponCard({
  couponCode = "",
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon = null,
  couponDiscount = 0,
  couponError = "",
  couponSuccess = "",
  isValidating = false,
  availableCoupons = [],
}) {
  const [showOffersList, setShowOffersList] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplyCoupon?.(couponCode);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-[#d72828] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span>Apply Coupon</span>
        </h3>

        {availableCoupons.length > 0 && !appliedCoupon && (
          <button
            type="button"
            onClick={() => setShowOffersList((prev) => !prev)}
            className="text-xs font-bold text-[#d72828] hover:text-[#b91c1c] hover:underline cursor-pointer shrink-0"
          >
            {showOffersList
              ? "Hide Coupons"
              : `View Coupons (${availableCoupons.length})`}
          </button>
        )}
      </div>

      {appliedCoupon ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wider">
                ✓ {appliedCoupon.offer_code} APPLIED
              </span>
            </div>
            <p className="text-xs font-semibold text-emerald-800 mt-1">
              You save ₹{Number(couponDiscount || 0).toLocaleString("en-IN")} on this order
            </p>
          </div>

          <button
            type="button"
            onClick={onRemoveCoupon}
            aria-label={`Remove coupon ${appliedCoupon.offer_code}`}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="coupon_input"
            type="text"
            placeholder="Enter Coupon Code"
            value={couponCode}
            onChange={(e) => onCouponCodeChange?.(e.target.value.toUpperCase())}
            className="flex-1 min-w-0 bg-gray-50 border border-gray-300/80 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-900 placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#d72828] focus:bg-white"
          />
          <button
            type="submit"
            disabled={isValidating || !couponCode.trim()}
            className="shrink-0 bg-[#d72828] hover:bg-[#b91c1c] text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? "Checking..." : "Apply"}
          </button>
        </form>
      )}

      {couponError ? (
        <p role="alert" className="text-red-600 text-xs font-medium mt-2 flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{couponError}</span>
        </p>
      ) : null}

      {couponSuccess && !appliedCoupon ? (
        <p className="text-emerald-600 text-xs font-medium mt-2">{couponSuccess}</p>
      ) : null}

      {!appliedCoupon && showOffersList && availableCoupons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 max-h-56 overflow-y-auto">
          {availableCoupons.map((off) => {
            const discountLabel =
              off.percentage > 0
                ? `${off.percentage}% OFF`
                : off.fixed_price > 0
                  ? `₹${Number(off.fixed_price).toLocaleString("en-IN")} OFF`
                  : "Special Offer";
            return (
              <div
                key={off.code}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50/70 hover:border-red-200 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#d72828] uppercase tracking-wide">
                      {off.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {discountLabel}
                    </span>
                  </div>
                  {(off.minOrderAmount > 0 || off.notes) && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                      {off.minOrderAmount > 0
                        ? `Min. order ₹${Number(off.minOrderAmount).toLocaleString("en-IN")}`
                        : ""}
                      {off.minOrderAmount > 0 && off.notes ? " · " : ""}
                      {off.notes || ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isValidating}
                  onClick={() => onApplyCoupon?.(off.code)}
                  className="shrink-0 text-xs font-bold text-[#d72828] border border-[#d72828] hover:bg-[#d72828] hover:text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
