import React from "react";
import { FaShieldAlt } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";

export default function ProductCardTrustBadge({ product }) {
  if (!product) return null;

  // 1. Resolve dynamic warranty value from product model
  const rawWarranty = product.warranty ?? product.extended_warranty ?? null;
  let warrantyText = null;

  if (rawWarranty && !isNaN(rawWarranty) && Number(rawWarranty) > 0) {
    const years = Number(rawWarranty);
    warrantyText = `${years} Year${years > 1 ? "s" : ""} Brand Warranty`;
  } else if (typeof rawWarranty === "string" && rawWarranty.trim() !== "") {
    warrantyText = rawWarranty.includes("Warranty") ? rawWarranty : `${rawWarranty} Warranty`;
  } else {
    // If product has no warranty specified in DB, DO NOT display badge
    return null;
  }

  return (
    <div className="w-full box-border rounded-[8px] bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-blue-50/40 border border-emerald-200/70 px-2.5 py-1.5 mb-1 flex items-center justify-between gap-1.5 text-[10.5px]">
      {/* Dynamic Warranty Badge */}
      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold leading-tight truncate">
        <FaShieldAlt className="text-emerald-600 w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{warrantyText}</span>
      </div>

      {/* Free Delivery Tag */}
      <div className="flex items-center gap-1 text-teal-700 font-medium shrink-0">
        <TbTruckDelivery className="text-teal-600 w-3.5 h-3.5" />
        <span className="font-semibold text-[10px]">Free Delivery</span>
      </div>
    </div>
  );
}
