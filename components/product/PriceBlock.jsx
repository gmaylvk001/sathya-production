import React from "react";
import { getDiscountInfo } from "@/lib/discountHelper";

export default function PriceBlock({
  price,
  mrp,
  priceClass,
  className = "",
}) {
  const safePrice = Number(price) || 0;
  const safeMrp = Number(mrp) || 0;

  const { discountPercent, showDiscount } = getDiscountInfo(safeMrp, safePrice);

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });

  const formattedPrice = formatter.format(Math.round(safePrice));
  const formattedMrp = formatter.format(Math.round(safeMrp));
  const savings = Math.max(0, safeMrp - safePrice);
  const formattedSavings = formatter.format(Math.round(savings));

  // High-value / 6-figure prices (>= ₹1,00,000) take more horizontal room
  const isLargePrice = safePrice >= 100000 || safeMrp >= 100000;

  // Optimized responsive font sizes so selling price, MRP & savings strictly fit in 1 line
  let resolvedPriceClass = "text-[13px] sm:text-[14px]";
  if (priceClass) {
    if (priceClass.includes("text-xs")) {
      resolvedPriceClass = "text-[11.5px] sm:text-xs";
    } else if (priceClass.includes("text-base sm:text-lg")) {
      resolvedPriceClass = "text-[13.5px] sm:text-[15px]";
    }
  }

  if (isLargePrice) {
    resolvedPriceClass = "text-[11.5px] sm:text-[12.5px]";
  }

  const resolvedMrpClass = isLargePrice
    ? "text-[8.5px] sm:text-[9.5px]"
    : "text-[9.5px] sm:text-[10px]";

  const resolvedSavingsClass = isLargePrice
    ? "text-[9px] sm:text-[10px]"
    : "text-[9.5px] sm:text-[10.5px]";

  const hasSavings = showDiscount && savings > 0;

  return (
    <div
      className={`flex items-baseline ${isLargePrice ? "gap-x-1" : "gap-x-1 sm:gap-x-1.5"
        } mb-1.5 leading-tight flex-nowrap whitespace-nowrap overflow-hidden ${className}`}
    >
      {/* 1. Current Selling Price: Bold Black */}
      <span className={`font-bold text-gray-900 shrink-0 tracking-tight ${resolvedPriceClass}`}>
        ₹{formattedPrice}
      </span>

      {/* 2. Original MRP: Muted Gray Strikethrough, NO "MRP" text prefix */}
      {hasSavings && (
        <span className={`text-gray-400 line-through shrink-0 font-normal ${resolvedMrpClass}`}>
          ₹{formattedMrp}
        </span>
      )}

      {/* 3. Savings: Red text (Save ₹X) */}
      {hasSavings && (
        <span className={`font-semibold text-[#d72828] shrink-0 tracking-tight ${resolvedSavingsClass}`}>
          Save ₹{formattedSavings}
        </span>
      )}
    </div>
  );
}
