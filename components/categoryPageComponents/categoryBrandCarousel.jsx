"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/** How many images per screen by viewport width */
function usePerPage() {
  const [perPage, setPerPage] = useState(6);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setPerPage(2);
      else if (w < 640) setPerPage(3);
      else if (w < 900) setPerPage(4);
      else if (w < 1200) setPerPage(5);
      else setPerPage(6);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
}

/**
 * Page start indexes — each slide shows a full `perPage` window when possible.
 * Example: 6 images, 5 per screen → starts [0, 1] → [1..5] and [2..6]
 * Never leaves a lonely 1-item last page.
 */
function getPageStarts(total, perPage) {
  if (total <= 0) return [];
  if (total <= perPage) return [0];

  const starts = [];
  for (let i = 0; i + perPage < total; i += perPage) {
    starts.push(i);
  }
  const last = total - perPage;
  if (starts[starts.length - 1] !== last) {
    starts.push(last);
  }
  return starts;
}

function slugify(text) {
  return text
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

/**
 * Storefront Brand Carousel — same as Image Carousel:
 * auto-play + scrollable + L/R + dots. Brand logos with optional URLs.
 */
export default function CategoryBrandCarousel({ config }) {
  const items = (config?.items || []).filter((i) => i?.image || i?.notes);
  const name = config?.name || "";
  const showGap = Boolean(config?.showGap);
  const perPage = usePerPage();
  const scrollerRef = useRef(null);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
    pointerId: null,
  });

  const pageStarts = useMemo(
    () => getPageStarts(items.length, perPage),
    [items.length, perPage]
  );

  const pages = useMemo(
    () =>
      pageStarts.map((start) => items.slice(start, start + perPage)),
    [items, pageStarts, perPage]
  );

  const pageCount = Math.max(1, pages.length);

  const scrollToPage = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      // Loop: allow wrapping past ends for autoplay
      let next = index;
      if (next >= pageCount) next = 0;
      if (next < 0) next = pageCount - 1;
      el.scrollTo({ left: next * el.clientWidth, behavior });
      setPage(next);
    },
    [pageCount]
  );

  const syncPageFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setPage(Math.max(0, Math.min(idx, pageCount - 1)));
  }, [pageCount]);

  useEffect(() => {
    setPage(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [perPage]);

  // Auto-play slides (pause on hover / drag)
  useEffect(() => {
    if (pageCount <= 1 || paused) return undefined;
    const id = setInterval(() => {
      if (dragRef.current.active) return;
      setPage((current) => {
        const next = current + 1 >= pageCount ? 0 : current + 1;
        const el = scrollerRef.current;
        if (el) {
          el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [pageCount, paused]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      if (dragRef.current.active) return;
      syncPageFromScroll();
    };

    const onResize = () => {
      const current = Math.round(el.scrollLeft / (el.clientWidth || 1));
      el.scrollTo({ left: current * el.clientWidth, behavior: "auto" });
      syncPageFromScroll();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [syncPageFromScroll]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || pageCount <= 1) return undefined;

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startScroll: el.scrollLeft,
        moved: false,
        pointerId: e.pointerId,
      };
      // Removed pointer capture to avoid swallowing click events on children
      el.style.scrollBehavior = "auto";
      el.style.cursor = "grabbing";
    };

    const onPointerMove = (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) > 6) d.moved = true;
      el.scrollLeft = d.startScroll - dx;
    };

    const endDrag = () => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      el.style.cursor = "grab";
      el.style.scrollBehavior = "smooth";
      // Removed pointer capture release

      const w = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / w);
      requestAnimationFrame(() => {
        scrollToPage(idx, "smooth");
      });
    };

    const onClickCapture = (e) => {
      if (dragRef.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current.moved = false;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [pageCount, scrollToPage]);

  if (!items.length) return null;

  const cellStyle = { width: `${100 / perPage}%` };

  const renderItem = (item, idx) => {
    const cardContent = (
      <div className="w-full h-16 sm:h-18 md:h-20 px-3 sm:px-4 py-2 bg-white rounded-xl border-2 border-gray-150/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#ff9b9b] hover:ring-2 hover:ring-[#ffe4e6] hover:shadow-md transition-all duration-300 flex items-center justify-center group overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.notes || name || `Brand ${idx + 1}`}
            className="max-h-8 sm:max-h-9 md:max-h-10 max-w-[85px] sm:max-w-[105px] w-auto h-auto object-contain pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center px-2 line-clamp-1 group-hover:text-[#ED1C24] transition-colors">
            {item.notes || `Brand ${idx + 1}`}
          </span>
        )}
      </div>
    );

    const wrapClass =
      "box-border flex min-w-0 shrink-0 items-center justify-center p-1.5 sm:p-2";

    let targetUrl = item.url;
    if (!targetUrl && item.notes) {
      targetUrl = `/brand/${slugify(item.notes)}`;
    }

    if (targetUrl) {
      const external = /^https?:\/\//i.test(targetUrl);
      if (external) {
        return (
          <a
            key={`brand-${idx}`}
            href={targetUrl}
            className={wrapClass}
            style={cellStyle}
          >
            {cardContent}
          </a>
        );
      }
      const href = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
      return (
        <Link
          key={`brand-${idx}`}
          href={href}
          className={wrapClass}
          style={cellStyle}
        >
          {cardContent}
        </Link>
      );
    }

    return (
      <div
        key={`brand-${idx}`}
        className={wrapClass}
        style={cellStyle}
      >
        {cardContent}
      </div>
    );
  };

  return (
    <section className="w-full my-4 sm:my-6 py-6 sm:py-8 bg-[#FFF5F5]">
      {name && (
        <div className="flex items-center justify-between mb-4 px-7 sm:px-10 lg:px-12">
          <h2 className="text-base sm:text-xl font-bold text-[#d72828] tracking-tight">
            {name}
          </h2>
          <Link
            href="/brands"
            className="text-sm font-semibold text-[#d72828] hover:text-[#b31e1e] flex items-center gap-1 transition-colors"
          >
            <span>See All</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}

      <div
        className="relative px-7 sm:px-10 lg:px-12 w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {pageCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              disabled={page <= 0}
              onClick={() => scrollToPage(page - 1)}
              className="absolute left-0 sm:left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#ED1C24] hover:bg-[#d01820] text-white flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-25 disabled:pointer-events-none"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next"
              disabled={page >= pageCount - 1}
              onClick={() => scrollToPage(page + 1)}
              className="absolute right-0 sm:right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#ED1C24] hover:bg-[#d01820] text-white flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-25 disabled:pointer-events-none"
            >
              <FiChevronRight size={18} />
            </button>
          </>
        )}

        <div
          ref={scrollerRef}
          className="flex w-full overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-hide cursor-grab touch-pan-x select-none py-1"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
          }}
        >
          {pages.map((chunk, pageIdx) => (
            <div
              key={pageIdx}
              className={`flex w-full min-w-full shrink-0 snap-start snap-always items-center ${pageCount === 1 ? 'justify-center' : ''}`}
            >
              {chunk.map((item, i) =>
                renderItem(item, pageStarts[pageIdx] + i)
              )}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 && (
        <div
          className="flex items-center justify-center gap-1.5 mt-3"
          role="tablist"
          aria-label="Brand carousel pages"
        >
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Page ${i + 1}`}
              onClick={() => scrollToPage(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === page
                  ? "w-4 bg-[#ED1C24]"
                  : "w-1.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
