"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function usePerPage() {
  const [perPage, setPerPage] = useState(6);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setPerPage(3);
      else if (w < 768) setPerPage(4);
      else if (w < 1024) setPerPage(5);
      else if (w < 1280) setPerPage(6);
      else setPerPage(7);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
}

function resolveItemHref(item) {
  const target = String(item?.slug || item?.url || "").trim();
  if (!target) return "#";
  if (/^https?:\/\//i.test(target) || target.startsWith("/")) return target;
  return `/${target.replace(/^\/+/, "")}`;
}

/**
 * Category & Home Circle Image Carousel:
 * - Whole component name in red color, centered at the top.
 * - Circular images (radius 100%).
 * - Image name displayed at the bottom of each image.
 * - Click navigates to the item's slug / url.
 */
export default function CategoryCircleImageCarousel({ config }) {
  const items = (config?.items || []).filter((i) => i?.image);
  const name = config?.name || "";
  const perPage = usePerPage();
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const checkScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
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
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const gap = 12; // gap-3 = 12px
    const distance = isMobile ? el.clientWidth + gap : el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  // Pointer drag support
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
    el.style.scrollBehavior = "auto";
    el.style.cursor = "grabbing";
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
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
    if (el) {
      el.style.cursor = "grab";
      el.style.scrollBehavior = "smooth";
      checkScroll();
    }
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
    <section className="w-full my-6 py-4 bg-white select-none">
      <div className="w-full px-4 sm:px-6">
        {/* Whole component name displaying red color top center */}
        {name && (
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-[#d72828] mb-4 sm:mb-5 tracking-tight">
            {name}
          </h2>
        )}

        {/* Carousel Container */}
        <div
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Arrow */}
          <button
            type="button"
            aria-label="Previous"
            disabled={!canScrollLeft}
            onClick={() => scrollByDirection("left")}
            className={`absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#BC2121] text-white flex items-center justify-center shadow-md transition-all duration-200 hover:bg-[#9E1B1B] hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none`}
          >
            <FiChevronLeft size={18} />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            aria-label="Next"
            disabled={!canScrollRight}
            onClick={() => scrollByDirection("right")}
            className={`absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#BC2121] text-white flex items-center justify-center shadow-md transition-all duration-200 hover:bg-[#9E1B1B] hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none`}
          >
            <FiChevronRight size={18} />
          </button>

          {/* Scrollable Track */}
          <div
            ref={scrollerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={onClickCapture}
            className="flex items-start overflow-x-auto scrollbar-hide py-2 px-0 sm:px-1 cursor-grab snap-x snap-mandatory touch-pan-x"
            style={{
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div className="flex items-start justify-start sm:justify-center gap-3 sm:gap-6 lg:gap-8 w-full sm:w-auto sm:mx-auto">
              {items.map((item, idx) => {
                const href = resolveItemHref(item);
                const isExternal = /^https?:\/\//i.test(href);

                const itemWrapperClass =
                  "no-underline snap-start flex-[0_0_calc((100%-24px)/3)] min-w-[calc((100%-24px)/3)] max-w-[calc((100%-24px)/3)] sm:flex-initial sm:min-w-0 sm:max-w-none sm:w-auto flex flex-col items-center justify-center shrink-0";

                const content = (
                  <div className="flex flex-col items-center group/item cursor-pointer w-full sm:w-28 md:w-32 lg:w-36 shrink-0 transition-transform duration-200 hover:-translate-y-1">
                    {/* Circle image container with radius 100 & red outline border */}
                    <div
                      className="w-[84px] h-[84px] min-[390px]:w-24 min-[390px]:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 overflow-hidden bg-white border-2 sm:border-[2.5px] border-[#BC2121] shadow-xs flex items-center justify-center p-2 transition-all duration-300 group-hover/item:shadow-md group-hover/item:border-[#9E1B1B]"
                      style={{ borderRadius: "100%" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.imageName || name || `Image ${idx + 1}`}
                        className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 group-hover/item:scale-105"
                        style={{ borderRadius: "100%" }}
                        draggable={false}
                      />
                    </div>

                    {/* Image name displaying in the bottom of the image in red color */}
                    {item.imageName && (
                      <span className="mt-2 sm:mt-2.5 text-center text-[11px] sm:text-sm font-semibold text-[#BC2121] line-clamp-2 sm:whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5 sm:px-1 leading-tight sm:leading-snug tracking-tight transition-colors duration-200 group-hover/item:text-[#9E1B1B]">
                        {item.imageName}
                      </span>
                    )}
                  </div>
                );

                if (href && href !== "#") {
                  if (isExternal) {
                    return (
                      <a
                        key={item._id || idx}
                        href={href}
                        className={itemWrapperClass}
                      >
                        {content}
                      </a>
                    );
                  }
                  const linkHref = href.startsWith("/") ? href : `/${href}`;
                  return (
                    <Link
                      key={item._id || idx}
                      href={linkHref}
                      className={itemWrapperClass}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={item._id || idx} className={itemWrapperClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
