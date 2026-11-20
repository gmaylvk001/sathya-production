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

function usePerPage() {
  const [perPage, setPerPage] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerPage(2);
      else if (w < 900) setPerPage(3);
      else if (w < 1150) setPerPage(4);
      else setPerPage(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
}

function getPageStarts(total, perPage) {
  if (total <= 0) return [];
  if (total <= perPage) return [0];
  const starts = [];
  for (let i = 0; i + perPage < total; i += perPage) {
    starts.push(i);
  }
  const last = total - perPage;
  if (starts[starts.length - 1] !== last) starts.push(last);
  return starts;
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

  const perPage = usePerPage();
  const scrollerRef = useRef(null);

  const pageStarts = useMemo(
    () => getPageStarts(items.length, perPage),
    [items.length, perPage],
  );
  const pages = useMemo(
    () => pageStarts.map((start) => items.slice(start, start + perPage)),
    [items, pageStarts, perPage],
  );
  const pageCount = Math.max(1, pages.length);
  const [currentPage, setCurrentPage] = useState(0);

  const scrollToPage = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, pageCount - 1));
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      setCurrentPage(clamped);
    },
    [pageCount],
  );

  useEffect(() => {
    setCurrentPage(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [perPage]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / w);
      setCurrentPage(Math.max(0, Math.min(idx, pageCount - 1)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pageCount]);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

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
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    scrollToPage(Math.round(el.scrollLeft / w), "smooth");
  };

  const onClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  if (!items.length) return null;

  const gapPx = perPage <= 2 ? 10 : 14;

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
              disabled={currentPage <= 0}
              onClick={() => scrollToPage(currentPage - 1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition-all duration-200 hover:bg-[#dcdce2] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828]"
            >
              <FiChevronLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
            <button
              type="button"
              aria-label="Next categories"
              disabled={currentPage >= pageCount - 1}
              onClick={() => scrollToPage(currentPage + 1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition-all duration-200 hover:bg-[#dcdce2] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828]"
            >
              <FiChevronRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll-snap carousel of pages */}
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          className="market-carousel-scroller flex w-full gap-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory py-2 select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
          }}
        >
          {pages.map((chunk, pageIdx) => {
            const cardWidth = `calc((100% - ${(perPage - 1) * gapPx}px) / ${perPage})`;
            const cellStyle = {
              width: cardWidth,
              flex: `0 0 ${cardWidth}`,
              maxWidth: cardWidth,
            };

            return (
              <div
                key={pageIdx}
                className="flex w-full min-w-full shrink-0 snap-start snap-always"
                style={{ gap: `${gapPx}px` }}
              >
                {chunk.map((item, itemIdx) => {
                  const href = resolveItemHref(item);
                  const isExternal = /^https?:\/\//i.test(href);
                  const categoryTitle = item.imageName || item.name || item.title || "Category";
                  const { startingPriceText, brandsText, cardBg } = getCategoryDetails(item);

                  const cardClasses =
                    "group/card relative block box-border min-w-0 shrink-0 rounded-[20px] sm:rounded-[26px] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828] no-underline shadow-xs hover:shadow-lg transition-shadow duration-300 h-[240px] sm:h-[290px] md:h-[340px]";

                  const cardContent = (
                    <div
                      className="relative w-full h-full overflow-hidden rounded-[20px] sm:rounded-[26px]"
                      style={{ background: cardBg }}
                    >
                      {/* Category Product Image - fills the whole card with object-cover */}
                      <div className="absolute inset-0 overflow-hidden rounded-[20px] sm:rounded-[26px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={categoryTitle}
                          loading="lazy"
                          draggable={false}
                          onError={(e) => {
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
                            "linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.45) 66%, rgba(0, 0, 0, 0.88) 100%)",
                        }}
                      />

                      {/* Top right: small white circular arrow button pointing to category */}
                      <span
                        aria-hidden="true"
                        className="market-arrow-btn absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-10 w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] rounded-full bg-white text-[#1d1d1f] flex items-center justify-center shadow-md transition-all duration-300 ease-out group-hover/card:bg-[#d62828] group-hover/card:text-white group-hover/card:scale-105 group-focus-visible/card:bg-[#d62828] group-focus-visible/card:text-white pointer-events-none"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
                        >
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </span>

                      {/* Bottom left, in white: category name, starting price, brands */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-10 flex flex-col justify-end text-left pointer-events-none">
                        <h3 className="text-white text-[15px] sm:text-[18px] md:text-[20px] font-semibold leading-tight line-clamp-2 drop-shadow-xs">
                          {categoryTitle}
                        </h3>

                        {startingPriceText && (
                          <p className="text-white font-bold text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 drop-shadow-xs">
                            From {startingPriceText}
                          </p>
                        )}

                        {brandsText && (
                          <p className="market-brands-line text-[10px] sm:text-xs text-white/85 truncate mt-0.5 drop-shadow-xs">
                            {brandsText}
                          </p>
                        )}
                      </div>
                    </div>
                  );

                  if (isExternal) {
                    return (
                      <a
                        key={item._id || `${pageIdx}-${itemIdx}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cardClasses}
                        style={cellStyle}
                      >
                        {cardContent}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item._id || `${pageIdx}-${itemIdx}`}
                      href={href}
                      className={cardClasses}
                      style={cellStyle}
                    >
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
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
