"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/** How many images per screen by viewport width */
function usePerPage() {
  const [perPage, setPerPage] = useState(5);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerPage(2);
      else if (w < 900) setPerPage(3);
      else if (w < 1100) setPerPage(4);
      else setPerPage(5);
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

/**
 * Storefront Image Carousel — full slides (no single leftover product),
 * auto-play + scrollable + L/R + dots. Max image 320×430.
 */
export default function CategoryImageCarousel({ config }) {
  const items = (config?.items || []).filter((i) => i?.image);
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

  const gapPx = showGap ? 12 : 0;
  const cellStyle =
    showGap && perPage > 1
      ? {
          width: `calc((100% - ${(perPage - 1) * gapPx}px) / ${perPage})`,
        }
      : { width: `${100 / perPage}%` };

  const renderItem = (item, idx) => {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt={name || `Image ${idx + 1}`}
        className="block w-full h-auto max-w-[320px] max-h-[430px] object-contain pointer-events-none select-none"
        draggable={false}
      />
    );

    const wrapClass =
      "box-border flex min-w-0 shrink-0 items-center justify-center";

    if (item.url) {
      const external = /^https?:\/\//i.test(item.url);
      if (external) {
        return (
          <a
            key={`img-${idx}`}
            href={item.url}
            className={wrapClass}
            style={cellStyle}
          >
            {img}
          </a>
        );
      }
      const href = item.url.startsWith("/") ? item.url : `/${item.url}`;
      return (
        <Link
          key={`img-${idx}`}
          href={href}
          className={wrapClass}
          style={cellStyle}
        >
          {img}
        </Link>
      );
    }

    return (
      <div
        key={`img-${idx}`}
        className={wrapClass}
        style={cellStyle}
      >
        {img}
      </div>
    );
  };

  return (
    <section className="w-full mb-8 bg-white">
      <div className="w-full px-4 sm:px-6">
        {name && (
          <h2 className="text-xl sm:text-2xl font-bold text-[#d72828] mb-4 px-1 bg-white text-center tracking-tight">
            {name}
          </h2>
        )}

        <div
          className="relative px-8 sm:px-10 lg:px-10 bg-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <button
            type="button"
            aria-label="Previous"
            disabled={page <= 0}
            onClick={() => scrollToPage(page - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#ED1C24] text-white flex items-center justify-center shadow disabled:opacity-30 disabled:pointer-events-none"
          >
            <FiChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={page >= pageCount - 1}
            onClick={() => scrollToPage(page + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#ED1C24] text-white flex items-center justify-center shadow disabled:opacity-30 disabled:pointer-events-none"
          >
            <FiChevronRight size={22} />
          </button>

          <div
            ref={scrollerRef}
            className="flex w-full gap-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-hide cursor-grab touch-pan-x select-none bg-white"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            {pages.map((chunk, pageIdx) => (
              <div
                key={pageIdx}
                className="flex w-full min-w-full shrink-0 snap-start snap-always bg-white"
                style={{ gap: `${gapPx}px` }}
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
            className="flex items-center justify-center gap-2 mt-4"
            role="tablist"
            aria-label="Carousel pages"
          >
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === page}
                aria-label={`Page ${i + 1}`}
                onClick={() => scrollToPage(i)}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i === page
                    ? "bg-[#ED1C24] scale-110"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
