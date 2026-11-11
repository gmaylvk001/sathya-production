"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import StorefrontProductCard from "@/components/StorefrontProductCard";

/**
 * Reusable Category Product Slider with strict isolation and one-by-one card scroll logic.
 *
 * @param {Object} props
 * @param {string} props.title - Category section heading (e.g., "TV & ACCESSORIES")
 * @param {string} props.viewAllHref - Target category URL for the red "VIEW ALL" button
 * @param {Array} props.products - Array of product objects (12 products)
 * @param {Object} props.brandMap - Brand lookup dictionary { [brandId]: brandName }
 * @param {string} [props.className] - Optional extra container classes
 */
export default function CategoryProductSlider({
  title,
  viewAllHref = "#",
  products = [],
  brandMap = {},
  className = "",
}) {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update arrow buttons visibility / disabled states based on scroll position
  const updateScrollButtons = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [products, updateScrollButtons]);

  // One-by-One Product Move Logic (Arrow Buttons)
  // Exactly 1 card width + gap smoothly moved per click
  const scrollOneCard = (direction) => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const firstCard =
      container.querySelector("[data-slider-item]") ||
      container.firstElementChild;

    let singleCardWidth = 270;
    let gap = 16;

    if (firstCard) {
      const rect = firstCard.getBoundingClientRect();
      if (rect.width > 0) singleCardWidth = rect.width;

      try {
        const computedStyle = window.getComputedStyle(container);
        const parsedGap = parseFloat(
          computedStyle.gap || computedStyle.columnGap || "16"
        );
        if (!isNaN(parsedGap) && parsedGap >= 0) {
          gap = parsedGap;
        }
      } catch (e) {
        gap = 16;
      }
    }

    const scrollDistance = singleCardWidth + gap;
    const scrollAmount = direction === "left" ? -scrollDistance : scrollDistance;

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });

    // Update buttons after animation completes
    setTimeout(updateScrollButtons, 320);
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section
      className={`relative w-full mb-10 last:mb-2 ${className}`}
      aria-label={title}
    >
      {/* Section Header: Title on Left, Red "VIEW ALL" button on Right */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-300">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide text-[#d72828] uppercase">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="bg-[#d72828] hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm px-5 sm:px-6 py-2 uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow rounded-sm inline-flex items-center select-none"
          >
            VIEW ALL
          </Link>
        )}
      </div>

      {/* Horizontal Carousel Container */}
      <div className="relative">
        {/* Left Circular Red Navigation Arrow Button (<) */}
        <button
          type="button"
          aria-label={`Previous ${title}`}
          onClick={() => scrollOneCard("left")}
          disabled={!canScrollLeft}
          className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#d72828] text-white flex items-center justify-center shadow-lg hover:bg-red-700 active:scale-95 transition-all z-20 cursor-pointer border-2 border-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#d72828]"
        >
          <FiChevronLeft size={22} strokeWidth={2.5} />
        </button>

        {/* Right Circular Red Navigation Arrow Button (>) */}
        <button
          type="button"
          aria-label={`Next ${title}`}
          onClick={() => scrollOneCard("right")}
          disabled={!canScrollRight}
          className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#d72828] text-white flex items-center justify-center shadow-lg hover:bg-red-700 active:scale-95 transition-all z-20 cursor-pointer border-2 border-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#d72828]"
        >
          <FiChevronRight size={22} strokeWidth={2.5} />
        </button>

        {/* Smooth Scrollable Product Card Track (Touch swipe supported, scrollbar hidden) */}
        <div
          ref={containerRef}
          onScroll={updateScrollButtons}
          className="flex overflow-x-auto scroll-smooth gap-4 sm:gap-5 py-3 px-1 no-scrollbar select-none"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {products.map((product, idx) => (
            <div
              key={product._id || product.slug || idx}
              data-slider-item
              className="flex-none w-[240px] sm:w-[260px] md:w-[270px]"
            >
              <StorefrontProductCard
                product={product}
                brandMap={brandMap}
                compactMobile={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

