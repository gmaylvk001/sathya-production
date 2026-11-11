import React from "react";
import { getDiscountInfo } from "@/lib/discountHelper";

export default function PriceBlock({ price, mrp, priceClass = "text-sm sm:text-base" }) {
  const safePrice = Number(price) || 0;
  const safeMrp = Number(mrp) || 0;

  const { discountPercent, showDiscount } = getDiscountInfo(safeMrp, safePrice);

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });

  const formattedPrice = formatter.format(Math.round(safePrice));
  const formattedMrp = formatter.format(Math.round(safeMrp));

  // High-value / 6-figure prices (>= ₹1,00,000) take more space;
  // slightly decrease font size and spacing so price, MRP & discount fit in 1 line.
  const isLargePrice = safePrice >= 100000 || safeMrp >= 100000;

  let resolvedPriceClass = priceClass;
  if (isLargePrice) {
    if (priceClass.includes("text-base sm:text-lg")) {
      resolvedPriceClass = "text-sm sm:text-base";
    } else if (priceClass.includes("text-xs sm:text-sm")) {
      resolvedPriceClass = "text-[11px] sm:text-xs";
    } else if (priceClass.includes("text-[13px]")) {
      resolvedPriceClass = "text-[11.5px] sm:text-[13px] lg:text-sm";
    } else {
      resolvedPriceClass = "text-[12px] sm:text-[13.5px] lg:text-sm";
    }
  }

  const resolvedMrpClass = isLargePrice
    ? "text-[9px] sm:text-[10px]"
    : "text-[10px] sm:text-[11px]";

  const resolvedDiscountClass = isLargePrice
    ? "text-[9.5px] sm:text-[10.5px]"
    : "text-[10px] sm:text-[11.5px]";

  return (
    <div
      className={`flex items-baseline ${
        isLargePrice ? "gap-x-1 sm:gap-x-1.5" : "gap-x-1.5"
      } mb-1.5 leading-tight flex-nowrap whitespace-nowrap overflow-hidden`}
    >
      {/* 1. Price */}
      <span className={`font-bold text-[#d72828] shrink-0 tracking-tight ${resolvedPriceClass}`}>
        ₹{formattedPrice}
      </span>

      {/* 2. MRP (strikethrough) - reduced size to fit in 1 line */}
      {showDiscount && (
        <span className={`text-gray-400 line-through shrink-0 font-normal ${resolvedMrpClass}`}>
          MRP ₹{formattedMrp}
        </span>
      )}

      {/* 3. Offer (% OFF) */}
      {showDiscount && (
        <span className={`font-bold text-emerald-600 shrink-0 tracking-tight ${resolvedDiscountClass}`}>
          {discountPercent}% OFF
        </span>
      )}
    </div>
  );
}

