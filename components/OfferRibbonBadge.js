"use client";

import React from "react";
import { Icon } from "@iconify/react";

/**
 * OfferRibbonBadge — Presentation-only component that displays a ribbon badge
 * with a gift icon and dynamic offer/label text and color.
 *
 * Props:
 *   - offerName: string | null | undefined
 *   - labelText: string | null | undefined
 *   - labelColor: string | null | undefined
 *   - color: string | null | undefined (alias for labelColor)
 *   - text: string | null | undefined (alias for labelText/offerName)
 *
 * Designed to sit inside a `relative` container (e.g. product image gallery).
 * Returns null if text is falsy or blank — zero layout shift.
 */
export default function OfferRibbonBadge({
  offerName,
  labelText,
  labelColor,
  color,
  text,
}) {
  const displayText = (text || labelText || offerName || "").trim();
  if (!displayText) {
    return null;
  }

  const badgeColor = (color || labelColor || "#d72828").trim();

  return (
    <div
      className="absolute top-3 left-0 z-20 flex items-center pointer-events-none select-none"
      role="status"
      aria-label={`Offer: ${displayText}`}
    >
      <div
        className="flex items-center gap-1.5 pl-2.5 py-1.5 text-white text-xs sm:text-sm font-bold shadow-md"
        style={{
          backgroundColor: badgeColor,
          clipPath:
            "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
          paddingRight: "1.25rem",
        }}
      >
        <Icon
          icon="mdi:gift-outline"
          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
          aria-hidden="true"
        />
        <span className="whitespace-nowrap leading-tight">
          {displayText}
        </span>
      </div>
    </div>
  );
}
