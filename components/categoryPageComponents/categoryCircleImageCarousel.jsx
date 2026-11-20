"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const DYNAMIC_CATEGORY_INFO = {
  "air-conditioner": {
    startingPrice: 29990,
    brands: "Daikin, LG, Voltas",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "refrigerator": {
    startingPrice: 12490,
    brands: "Samsung, LG, Whirlpool",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "mobiles": {
    startingPrice: 8999,
    brands: "Apple, Samsung, OnePlus",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "washing-machine": {
    startingPrice: 10990,
    brands: "IFB, Bosch, LG",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "televisions": {
    startingPrice: 9490,
    brands: "Sony, Samsung, LG",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "led-tv": {
    startingPrice: 9490,
    brands: "Sony, Samsung, LG",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "tv": {
    startingPrice: 9490,
    brands: "Sony, Samsung, LG",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
  "laptops": {
    startingPrice: 24990,
    brands: "HP, Dell, Lenovo",
    bg: "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  },
};

function resolveItemHref(item) {
  const target = String(item?.slug || item?.url || item?.link || item?.href || "").trim();
  if (!target) return "#";
  try {
    if (/^https?:\/\//i.test(target)) {
      const parsed = new URL(target);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "16.113.88.134" ||
        parsed.hostname.includes("sathya")
      ) {
        return (parsed.pathname + parsed.search + parsed.hash).replace(/\/+/g, "/");
      }
      return target;
    }
  } catch (e) { }
  if (target.startsWith("/")) return target.replace(/\/+/g, "/");
  return `/${target.replace(/^\/+/, "")}`;
}

function formatPrice(val) {
  if (val == null || val === "") return "";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return String(val).trim();
  return "₹" + Math.round(num).toLocaleString("en-IN");
}

function getCategoryDetails(item) {
  const name = String(item?.imageName || item?.name || item?.title || "").toLowerCase();
  const slug = String(item?.slug || item?.url || "").toLowerCase();

  let matched = null;
  for (const [key, val] of Object.entries(DYNAMIC_CATEGORY_INFO)) {
    const cleanKey = key.replace(/-/g, " ");
    if (slug.includes(key) || name.includes(cleanKey) || name.includes(key)) {
      matched = val;
      break;
    }
  }

  const rawPrice =
    item.startingPrice ??
    item.starting_price ??
    item.fromPrice ??
    item.from_price ??
    item.minPrice ??
    item.min_price ??
    item.price ??
    matched?.startingPrice;

  const rawBrands =
    item.brands ??
    item.brandList ??
    item.brand_names ??
    item.brandNames ??
    matched?.brands;

  const brandsText = Array.isArray(rawBrands)
    ? rawBrands.filter(Boolean).join(", ")
    : typeof rawBrands === "string" && rawBrands.trim()
      ? rawBrands.trim()
      : null;

  return {
    startingPriceText: rawPrice != null && rawPrice !== "" ? formatPrice(rawPrice) : null,
    brandsText,
    cardBg: matched?.bg || "linear-gradient(180deg, #fdfbf7 0%, #f6edd9 45%, #edd4b2 100%)",
  };
}

export default function CategoryCircleImageCarousel({ config }) {
  const rawItems = (config?.items || []).filter((i) => i?.image && i?.isActive !== false);

  // Deduplicate categories: prevent already-seen categories / duplicate links from appearing again
  const items = useMemo(() => {
    const seen = new Set();
    return rawItems.filter((item) => {
      const slugKey = String(item?.slug || item?.url || "")
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\/[^\/]+/i, "")
        .replace(/\/+/g, "/")
        .replace(/\/$/, "");

      const nameKey = String(item?.imageName || item?.name || item?.title || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

      // Normalize synonym category names / slugs (e.g. televisions vs led-tv vs tv)
      const isTv =
        slugKey.includes("television") ||
        slugKey.includes("/tv") ||
        nameKey === "tv" ||
        nameKey === "ledtv" ||
        nameKey.includes("television");

      const normalizedKey = isTv ? "category-television" : (slugKey || nameKey);

      if (!normalizedKey) return true;

      if (
        seen.has(normalizedKey) ||
        (slugKey && seen.has(slugKey)) ||
        (nameKey && seen.has(nameKey))
      ) {
        return false;
      }

      seen.add(normalizedKey);
      if (slugKey) seen.add(slugKey);
      if (nameKey) seen.add(nameKey);
      return true;
    });
  }, [rawItems]);
  const rawName = String(config?.name || "Best Price In the Market").trim();
  const mainHeading = rawName.replace(/\.+$/, "") || "Best Price In the Market";

  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const checkScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, items.length]);

  const scrollByDirection = useCallback((direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll carousel smoothly by about 480px
    const distance = 480;
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  // Pointer drag support for desktop mouse drag
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 6) d.moved = true;
    const el = scrollerRef.current;
    if (el) {
      el.scrollLeft = d.startScroll - dx;
    }
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    checkScroll();
  };

  const onClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  if (!items.length) return null;

  return (
    <section className="w-full mb-8 bg-white py-4">
      {/* Full width container with standard side padding matching other home page sections */}
      <div className="w-full px-4 sm:px-6">
        {/* Top row: heading on the left, two round arrow buttons (prev/next) on the right */}
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 px-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#d72828] tracking-tight flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span className="text-[#d72828]">{mainHeading}.</span>
            <span className="text-sm sm:text-base md:text-lg font-medium text-gray-500">
              Shop by category.
            </span>
          </h2>

          {/* Two round arrow buttons (prev/next) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Previous categories"
              disabled={!canScrollLeft}
              onClick={() => scrollByDirection("left")}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition-all duration-200 hover:bg-[#dcdce2] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828]"
            >
              <FiChevronLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
            <button
              type="button"
              aria-label="Next categories"
              disabled={!canScrollRight}
              onClick={() => scrollByDirection("right")}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition-all duration-200 hover:bg-[#dcdce2] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828]"
            >
              <FiChevronRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll-snap carousel of tall cards with a hidden scrollbar */}
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          className="market-carousel-scroller flex items-stretch gap-[14px] overflow-x-auto snap-x snap-mandatory py-2 select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((item, idx) => {
            const href = resolveItemHref(item);
            const isExternal = /^https?:\/\//i.test(href);
            const categoryTitle = item.imageName || item.name || item.title || "Category";
            const { startingPriceText, brandsText, cardBg } = getCategoryDetails(item);

            const cardClasses =
              "group/card relative block w-[200px] h-[300px] sm:w-[236px] sm:h-[340px] rounded-[26px] overflow-hidden shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828] no-underline shadow-xs hover:shadow-lg transition-shadow duration-300";

            const cardContent = (
              <div
                className="relative w-full h-full overflow-hidden rounded-[26px]"
                style={{ background: cardBg }}
              >
                {/* Category Product Image - fills the whole card with object-cover */}
                <div className="absolute inset-0 overflow-hidden rounded-[26px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={categoryTitle}
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      // Fallback if image path was broken
                      if (!e.target.dataset.triedFallback) {
                        e.target.dataset.triedFallback = "true";
                        e.target.src = "/favicon.webp";
                        e.target.className = "w-16 h-16 opacity-40 object-contain";
                      }
                    }}
                    className="w-full h-full object-cover select-none pointer-events-none transform scale-100 group-hover/card:scale-[1.07] group-focus-visible/card:scale-[1.07] transition-transform duration-500 ease-out"
                  />
                </div>

                {/* Dark gradient overlay at the bottom for text readability */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0, 0, 0, 0) 42%, rgba(0, 0, 0, 0.45) 68%, rgba(0, 0, 0, 0.88) 100%)",
                  }}
                />

                {/* Top right: small white circular arrow button (36px) pointing to category */}
                <span
                  aria-hidden="true"
                  className="market-arrow-btn absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10 w-[36px] h-[36px] rounded-full bg-white text-[#1d1d1f] flex items-center justify-center shadow-md transition-all duration-300 ease-out group-hover/card:bg-[#d62828] group-hover/card:text-white group-hover/card:scale-105 group-focus-visible/card:bg-[#d62828] group-focus-visible/card:text-white pointer-events-none"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 transform transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </span>

                {/* Bottom left, in white: category name, starting price, brands */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10 flex flex-col justify-end text-left pointer-events-none">
                  <h3 className="text-white text-[18px] sm:text-[20px] font-semibold leading-tight line-clamp-2 drop-shadow-xs">
                    {categoryTitle}
                  </h3>

                  {startingPriceText && (
                    <p className="text-white font-bold text-sm sm:text-base mt-1 drop-shadow-xs">
                      From {startingPriceText}
                    </p>
                  )}

                  {brandsText && (
                    <p className="market-brands-line text-xs text-white/85 truncate mt-0.5 drop-shadow-xs">
                      {brandsText}
                    </p>
                  )}
                </div>
              </div>
            );

            if (isExternal) {
              return (
                <a
                  key={item._id || idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClasses}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={item._id || idx}
                href={href}
                className={cardClasses}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .market-carousel-scroller::-webkit-scrollbar {
          display: none;
        }
        .market-brands-line {
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        :global(.group\/card:hover) .market-brands-line,
        :global(.group\/card:focus-visible) .market-brands-line {
          opacity: 1;
          transform: translateY(0);
        }
        @media (hover: none) or (pointer: coarse) {
          .market-brands-line {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .market-carousel-scroller {
            scroll-behavior: auto !important;
          }
          :global(.group\/card img),
          .market-arrow-btn,
          .market-brands-line {
            transition: none !important;
            transform: none !important;
          }
          :global(.group\/card:hover img),
          :global(.group\/card:focus-visible img),
          :global(.group\/card:hover) .market-arrow-btn,
          :global(.group\/card:focus-visible) .market-arrow-btn {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
