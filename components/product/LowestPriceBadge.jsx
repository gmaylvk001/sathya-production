"use client";

import React from "react";
import Image from "next/image";

/**
 * LowestPriceBadge Component
 *
 * - Mobile & iPad (< 1024px): 3D Circular Seal Logo Image (/images/lowest-price-seal.png)
 * - Desktop (>= 1024px): Sleek Ribbon Badge flush at -top-px -left-px.
 *   Uses fluid typography (clamp) and NO ellipsis so "LOWEST PRICE ACROSS RETAILERS"
 *   is ALWAYS 100% fully visible without any "..." truncation.
 */
export default function LowestPriceBadge({
  product,
  variant = "card",
  className = "",
}) {
  const rawLsp = product?.lsp ?? product?.rawProduct?.lsp ?? product?.product?.lsp;
  const lsp = Number(rawLsp);
  const hasLsp = Boolean((lsp && !isNaN(lsp) && lsp > 0) || product?.hasLspPrice || product?.product?.hasLspPrice);

  if (!hasLsp) return null;

  return (
    <>
      {/* ─── Mobile & iPad / Tablet (< 1024px): 3D Seal Logo Image ─── */}
      <div
        className={`lg:hidden absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20 pointer-events-none select-none ${className}`}
        aria-label="Lowest Price Across Retailers"
        title="Lowest Price Across Retailers"
      >
        <Image
          src="/images/lowest-price-seal.png"
          alt="Lowest Price Across Retailers"
          width={120}
          height={104}
          className="w-[40px] min-[380px]:w-[46px] sm:w-[54px] md:w-[58px] h-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
          unoptimized
        />
      </div>

      {/* ─── Desktop (>= 1024px): Sleek Ribbon Badge (Full text, ZERO "...") ─── */}
      <div
        className={`hidden lg:flex absolute -top-px -left-px z-20 pointer-events-none select-none items-center rounded-tl-[16px]  rounded-br-[9px] rounded-bl-none pl-2 pr-2.5 xl:pl-2.5 xl:pr-3 py-[2.5px] xl:py-[2.5px] shadow-[0_3px_8px_rgba(0,0,0,0.32)] max-w-[calc(100%-36px)] ${className}`}
        style={{
          background: "linear-gradient(90deg, #E71B23 0%, #A01A1A 100%)",
        }}
        aria-label="Lowest Price Across Retailers"
        title="Lowest Price Across Retailers"
      >
        <span
          className="text-white font-[600] uppercase whitespace-nowrap leading-tight text-[7.5px] min-[1280px]:text-[9px] min-[1440px]:text-[9.5px]"
          style={{
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          Lowest Price Across Retailers
        </span>
      </div>
    </>
  );
}
