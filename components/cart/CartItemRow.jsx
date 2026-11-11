"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { getDiscountInfo } from "@/lib/discountHelper";

// Helper to extract warranty info from cart item
export const getItemWarranty = (item) => {
  if (!item) return null;
  const wd = item.warrantyData;
  const price = Number(item.extendedWarranty || wd?.price || 0);
  const year = Number(
    wd?.year ||
    wd?.duration ||
    item.selectedWarranty ||
    (typeof item.warranty === "number" && item.warranty <= 5 ? item.warranty : 0) ||
    0
  );

  if (price <= 0 && year <= 0) return null;

  const rawTitle = wd?.title || wd?.name;
  const hasValidName =
    rawTitle &&
    typeof rawTitle === "string" &&
    rawTitle.trim() !== "" &&
    rawTitle.toLowerCase() !== "null" &&
    rawTitle.toLowerCase() !== "undefined";

  const title =
    (hasValidName ? rawTitle : "") ||
    (year > 0 ? `${year} Year Extended Warranty` : "Extended Warranty Protection");

  return {
    title,
    duration: wd?.duration || (year > 0 ? `${year} Year` : ""),
    price,
    item_no: wd?.item_no || null,
  };
};

// Helper to extract variant attributes from cart item
export const getItemVariations = (item) => {
  if (!item) return [];
  const entries = [];
  const seenKeys = new Set();

  const addEntry = (rawKey, rawVal) => {
    if (!rawKey || rawVal == null) return;
    const key = String(rawKey).trim();
    if (seenKeys.has(key.toLowerCase())) return;

    let val = "";
    if (typeof rawVal === "object") {
      val = rawVal.label || rawVal.value || rawVal.name || "";
    } else {
      val = String(rawVal).trim();
    }
    if (!val || val.toLowerCase() === "undefined" || val.toLowerCase() === "null") return;

    seenKeys.add(key.toLowerCase());
    entries.push({ key, value: val });
  };

  if (item.variantValues && typeof item.variantValues === "object") {
    for (const [k, v] of Object.entries(item.variantValues)) {
      addEntry(k, v);
    }
  }

  if (item.selectedVariant && typeof item.selectedVariant === "object") {
    for (const [k, v] of Object.entries(item.selectedVariant)) {
      addEntry(k, v);
    }
  }

  if (item.color) {
    addEntry("Color", item.color);
  }

  return entries;
};

// Helper to get consistent unique ID for an item
export const getItemId = (item) => {
  if (!item) return "";
  if (item.id) return String(item.id);
  if (item.cart_item_id) return String(item.cart_item_id);
  if (item._id) return String(item._id);
  const pid = item.productId;
  if (pid && typeof pid === "object" && pid._id) return String(pid._id);
  if (pid) return String(pid);
  if (item.comboId) return String(item.comboId);
  return String(item.item_code || "");
};

/**
 * Isolated Cart Item Row with strict local state and debounced quantity controller.
 */
const CartItemRow = React.memo(function CartItemRow({
  item,
  onQuantityChange,
  onMoveToWishlist,
  onRemoveItem,
  onProceedToCheckout,
  isItemUpdating = false,
}) {
  const itemId = getItemId(item);
  const [localQty, setLocalQty] = useState(Number(item.quantity) || 1);
  const [isUpdatingLocally, setIsUpdatingLocally] = useState(false);
  const debounceTimerRef = useRef(null);

  // Synchronize local quantity whenever parent/server item.quantity updates
  useEffect(() => {
    setLocalQty(Number(item.quantity) || 1);
  }, [item.quantity]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Compute available stock with safe fallback (Bosch fridge stock = 75, etc.)
  const availableStock = useMemo(() => {
    const raw =
      item.available_stock != null && item.available_stock !== ""
        ? item.available_stock
        : item.original_quantity != null && item.original_quantity !== ""
        ? item.original_quantity
        : item.productId?.quantity != null
        ? item.productId.quantity
        : null;

    if (raw != null) {
      const parsed = Number(raw);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    // Default safe fallback if stock was omitted but item is in stock
    return Math.max(75, Number(item.quantity || 1) + 10);
  }, [item.available_stock, item.original_quantity, item.productId, item.quantity]);

  // Quantity boundaries
  const maxAllowed = Math.max(1, availableStock);
  const isUpdating = isItemUpdating || isUpdatingLocally;
  const isMin = localQty <= 1;
  const isMax = localQty >= maxAllowed;

  // Handle stepped quantity change with local optimistic update and isolated debounce
  const handleStep = (delta) => {
    const newQty = localQty + delta;
    if (newQty < 1 || newQty > maxAllowed) return;

    setLocalQty(newQty); // Instant optimistic update

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsUpdatingLocally(true);
        if (onQuantityChange) {
          await onQuantityChange(itemId, newQty, availableStock);
        }
      } catch (err) {
        // Rollback to server quantity on failure
        setLocalQty(Number(item.quantity) || 1);
      } finally {
        setIsUpdatingLocally(false);
      }
    }, 300);
  };

  // Price & Discount calculations
  const originalPrice = item.actual_price > 0 ? item.actual_price : item.price;
  const specialPrice = item.price;
  const { discountPercent, showDiscount } = getDiscountInfo(originalPrice, specialPrice);
  const itemVariations = getItemVariations(item);
  const itemWarranty = getItemWarranty(item);

  const productUrl = item.isCombo
    ? (item.slug ? `/combo-offers/${item.slug}` : `/combo-offers`)
    : `/product/${item.slug || itemId}`;

  const imageSrc = item.image
    ? (item.image.startsWith("http") || item.image.startsWith("/")
        ? item.image
        : `/uploads/products/${item.image}`)
    : "/uploads/sathyalogo.webp";

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 group transition-colors hover:bg-gray-50/40">
      <div className="flex gap-4 sm:gap-6 items-start">
        {/* Left Product Image */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-white border border-gray-200/70 rounded-lg p-2 flex items-center justify-center relative overflow-hidden group-hover:border-red-200 transition-colors">
          <Link href={productUrl} className="w-full h-full block relative">
            <img
              src={imageSrc}
              alt={item.name || "Product Image"}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/uploads/sathyalogo.webp";
              }}
            />
          </Link>
        </div>

        {/* Middle Info Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Link href={productUrl} className="group-hover/title:text-[#d72828]">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-[#d72828] transition-colors">
              {item.name}
            </h3>
          </Link>

          {/* Dynamic Variations (Color, Storage, Size, etc.) */}
          {itemVariations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {itemVariations.map((v, vIdx) => (
                <span
                  key={vIdx}
                  className="inline-flex items-center gap-1 bg-gray-100/90 border border-gray-200/90 text-gray-800 text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-md"
                >
                  <span className="text-gray-500 font-normal">{v.key}:</span>
                  <span className="font-semibold text-gray-900">{v.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Extended Warranty Badge / Protection Sub-row */}
          {itemWarranty && (
            <div className="inline-flex items-center gap-2 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1 text-xs mt-0.5 w-fit shadow-2xs">
              <div className="flex items-center gap-1.5 font-medium">
                <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-amber-950">{itemWarranty.title}</span>
              </div>
              {itemWarranty.price > 0 && (
                <span className="bg-amber-100/90 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                  +₹{Number(itemWarranty.price).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}

          {/* Exchange Value Badge */}
          {Number(item.exchangeOffer?.price) > 0 && (
            <div className="inline-flex items-center gap-2 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-lg px-2.5 py-1 text-xs mt-0.5 w-fit shadow-2xs">
              <span className="font-semibold text-emerald-950">Exchange Value</span>
              <span className="bg-emerald-100/90 text-emerald-900 font-bold px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                −₹{Number(item.exchangeOffer.price).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {item.item_code && (
            <p className="text-xs text-gray-400 font-normal">SKU: {item.item_code}</p>
          )}

          {/* Rating & Stock Badge */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="bg-emerald-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              3.8 ★
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              In Stock
            </span>
          </div>

          {/* Qty & Price Row */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {/* Qty Stepper */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Qty:</span>
              <div className="inline-flex items-center bg-gray-50/80 border border-gray-300/80 rounded-lg p-0.5 shadow-2xs">
                {/* Decrement Button (-) */}
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  disabled={isMin || isUpdating}
                  aria-label="Decrease quantity"
                  title={isMin ? "Minimum quantity is 1" : "Decrease quantity"}
                  className={`w-7 h-7 flex items-center justify-center rounded-md font-bold transition-all select-none ${
                    isMin || isUpdating
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-white hover:text-[#d72828] hover:shadow-2xs active:scale-95 cursor-pointer"
                  }`}
                >
                  <span className="leading-none text-base">−</span>
                </button>

                {/* Current Quantity Display / Per-item Loader */}
                <span className="w-8 text-center text-xs sm:text-sm font-extrabold text-gray-900 select-none flex items-center justify-center">
                  {isUpdating ? (
                    <span className="inline-block w-3 h-3 border-2 border-[#d72828] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    localQty
                  )}
                </span>

                {/* Increment Button (+) */}
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  disabled={isMax || isUpdating}
                  aria-label="Increase quantity"
                  title={isMax ? `Maximum available stock is ${maxAllowed}` : "Increase quantity"}
                  className={`w-7 h-7 flex items-center justify-center rounded-md font-bold transition-all select-none ${
                    isMax || isUpdating
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-white hover:text-[#d72828] hover:shadow-2xs active:scale-95 cursor-pointer"
                  }`}
                >
                  <span className="leading-none text-base">+</span>
                </button>
              </div>
            </div>

            {/* Price Block */}
            <div className="flex items-baseline gap-2">
              {showDiscount && (
                <span className="text-emerald-600 font-bold text-xs sm:text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  ↓{discountPercent}% OFF
                </span>
              )}
              {showDiscount && (
                <s className="text-gray-400 text-xs sm:text-sm line-through">
                  ₹{Number(originalPrice).toLocaleString("en-IN")}
                </s>
              )}
              <span className="text-lg sm:text-xl font-extrabold text-gray-900">
                ₹{Number(specialPrice).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Standard Delivery in 2 - 4 Days
          </p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-gray-100 pt-3 flex items-center gap-4 sm:gap-6 text-xs font-bold text-gray-700">
        <button
          onClick={() => onMoveToWishlist && onMoveToWishlist(itemId)}
          className="hover:text-[#d72828] text-gray-600 transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span>Move to Wishlist</span>
        </button>
        <button
          onClick={() => onRemoveItem && onRemoveItem(itemId)}
          className="hover:text-red-600 text-gray-500 transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
          <span>Remove</span>
        </button>
        <button
          onClick={() => onProceedToCheckout && onProceedToCheckout()}
          className="hover:text-[#b91c1c] transition-colors cursor-pointer uppercase tracking-wider text-[#d72828] ml-auto font-extrabold flex items-center gap-1"
        >
          <span>⚡ Buy this item now</span>
        </button>
      </div>
    </div>
  );
});

export default CartItemRow;

