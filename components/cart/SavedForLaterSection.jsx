"use client";

import React from "react";
import Link from "next/link";
import { getDiscountInfo } from "@/lib/discountHelper";
import AvailableInStoreNotice, {
  isProductOutOfStock,
} from "@/components/product/AvailableInStoreNotice";
import { getItemId, getItemVariations, getItemWarranty } from "@/components/cart/CartItemRow";
import { isKarnatakaPincode } from "@/lib/regionHelper";
import { isMovementAllowed } from "@/lib/addCartConfig";

export default function SavedForLaterSection({
  savedItems = [],
  pincode = "",
  region = "",
  actionLoadingId = null,
  onMoveToCart,
  onRemoveSaved,
}) {
  if (!Array.isArray(savedItems) || savedItems.length === 0) {
    return null;
  }

  const isKarnataka =
    isKarnatakaPincode(pincode) || String(region || "").toLowerCase() === "karnataka";

  return (
    <section
      aria-label="Saved for Later"
      className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden w-full min-w-0"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>Saved for Later</span>
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
            {savedItems.length} {savedItems.length === 1 ? "item" : "items"}
          </span>
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {savedItems.map((item) => {
          const itemId = getItemId(item);
          const isBusy = actionLoadingId === itemId;
          const originalPrice = item.actual_price > 0 ? item.actual_price : item.price;
          const specialPrice = item.price;
          const { discountPercent, showDiscount } = getDiscountInfo(
            originalPrice,
            specialPrice
          );
          const itemVariations = getItemVariations(item);
          const itemWarranty = getItemWarranty(item);
          const productUrl = item.isCombo
            ? item.slug
              ? `/combo-offers/${item.slug}`
              : "/combo-offers"
            : `/product/${item.slug || item.productId || itemId}`;

          const imageSrc = item.image
            ? item.image.startsWith("http") || item.image.startsWith("/")
              ? item.image
              : `/uploads/products/${item.image}`
            : "/uploads/sathyalogo.webp";

          const availableStock = Number(item.available_stock ?? item.original_quantity ?? 0);
          const outOfStock =
            isProductOutOfStock({
              quantity: availableStock,
              stock_status: item.stock_status,
            }) || availableStock <= 0;
          const isStoreOnlyLowStock =
            !outOfStock &&
            !isKarnataka &&
            !item.isUnilet &&
            availableStock < 10 &&
            !isMovementAllowed(item.movement);
          const canMoveToCart =
            !outOfStock && !isStoreOnlyLowStock && item.isDeliverable !== false;

          return (
            <div
              key={itemId}
              className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50/40 transition-colors"
            >
              <div className="flex gap-3.5 sm:gap-5 items-start">
                <Link
                  href={productUrl}
                  className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-white border border-gray-200/80 rounded-lg p-1.5 flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={imageSrc}
                    alt={item.name || "Saved product"}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/uploads/sathyalogo.webp";
                    }}
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <Link href={productUrl}>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-[#d72828] transition-colors">
                      {item.name}
                    </h3>
                  </Link>

                  {itemVariations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {itemVariations.map((v, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-800 text-[11px] font-medium px-2 py-0.5 rounded"
                        >
                          <span className="text-gray-500">{v.key}:</span>
                          <span className="font-semibold">{v.value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {itemWarranty && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-fit">
                      {itemWarranty.title}
                      {itemWarranty.price > 0
                        ? ` (+₹${Number(itemWarranty.price).toLocaleString("en-IN")})`
                        : ""}
                    </span>
                  )}

                  <div className="flex flex-wrap items-baseline gap-2 mt-1">
                    {showDiscount && (
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        ↓{discountPercent}% OFF
                      </span>
                    )}
                    {showDiscount && (
                      <s className="text-gray-400 text-xs line-through">
                        ₹{Number(originalPrice).toLocaleString("en-IN")}
                      </s>
                    )}
                    <span className="text-base sm:text-lg font-extrabold text-gray-900">
                      ₹{Number(specialPrice).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mt-1">
                    {outOfStock ? (
                      <AvailableInStoreNotice variant="compact" className="max-w-md" />
                    ) : isStoreOnlyLowStock ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                        Sold Out Online · Available in Store
                      </span>
                    ) : item.isDeliverable === false ? (
                      <span className="text-xs font-semibold text-red-600">
                        {item.deliveryErrorReason || "Unavailable at selected pincode"}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        In Stock
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!canMoveToCart || isBusy}
                    onClick={() => onMoveToCart?.(item)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      canMoveToCart && !isBusy
                        ? "border border-[#d72828] bg-white text-[#d72828] hover:bg-[#d72828] hover:text-white cursor-pointer active:scale-95"
                        : "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Moving...</span>
                      </>
                    ) : (
                      <span>Move to Cart</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onRemoveSaved?.(item)}
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
