"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Filter valid non-empty image paths from a product images array.
 */
export function filterValidProductImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter((img) => {
    if (typeof img !== "string") return false;
    const trimmed = img.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    return lower !== "null" && lower !== "undefined";
  });
}

function ChevronIcon({ direction = "left", className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}

/**
 * Single-row, overflow-safe horizontal thumbnail strip with smooth left/right navigation.
 */
export function ThumbnailStrip({
  images,
  selectedImageIndex,
  onSelect,
  resolveImagePath,
  onError,
  className = "",
}) {
  const stripRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    left: false,
    right: false,
  });

  const validImages = useMemo(() => filterValidProductImages(images), [images]);

  const updateScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el || el.clientWidth === 0) {
      setScrollState({ hasOverflow: false, left: false, right: false });
      return;
    }
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setScrollState({
      hasOverflow,
      left: hasOverflow && el.scrollLeft > 2,
      right: hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    updateScroll();
    const rafId = requestAnimationFrame(updateScroll);
    window.addEventListener("resize", updateScroll);

    let observer;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateScroll);
      observer.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateScroll);
      if (observer) observer.disconnect();
    };
  }, [validImages.length, updateScroll]);

  useEffect(() => {
    const el = stripRef.current;
    const thumb = el?.children?.[selectedImageIndex];
    if (!el || !thumb || el.clientWidth === 0) return;

    thumb.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    const timerId = setTimeout(updateScroll, 220);
    return () => clearTimeout(timerId);
  }, [selectedImageIndex, validImages.length, updateScroll]);

  const scrollStripBy = (direction) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 260, behavior: "smooth" });
  };

  if (!validImages.length) return null;

  const getArrowClass = (enabled) =>
    `flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all ${
      enabled
        ? "bg-white border-gray-300 text-gray-700 shadow-sm hover:border-[#d72828] hover:text-[#d72828] hover:shadow cursor-pointer active:scale-95"
        : "bg-gray-50 border-gray-200 text-gray-300 opacity-50 cursor-not-allowed"
    }`;

  return (
    <div
      className={`relative flex items-center gap-1.5 w-full min-w-0 max-w-full ${className}`.trim()}
    >
      {scrollState.hasOverflow && (
        <button
          type="button"
          aria-label="Scroll thumbnails left"
          disabled={!scrollState.left}
          onClick={() => scrollStripBy(-1)}
          className={getArrowClass(scrollState.left)}
        >
          <ChevronIcon direction="left" className="w-4 h-4" />
        </button>
      )}

      <div
        ref={stripRef}
        onScroll={updateScroll}
        className="flex flex-nowrap items-center flex-1 min-w-0 max-w-full gap-2 overflow-x-auto overflow-y-hidden py-1 px-0.5 scrollbar-none scroll-smooth"
      >
        {validImages.map((image, index) => {
          const isSelected = selectedImageIndex === index;
          return (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => onSelect(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={isSelected}
              className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white p-1 border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-[#d72828] ring-1 ring-[#d72828]/20 shadow-sm opacity-100"
                  : "border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-400"
              }`}
            >
              <img
                src={resolveImagePath(image)}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-contain pointer-events-none select-none"
                onError={(e) => onError(e, image)}
              />
            </button>
          );
        })}
      </div>

      {scrollState.hasOverflow && (
        <button
          type="button"
          aria-label="Scroll thumbnails right"
          disabled={!scrollState.right}
          onClick={() => scrollStripBy(1)}
          className={getArrowClass(scrollState.right)}
        >
          <ChevronIcon direction="right" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Viewport-safe PDP image lightbox modal with Prev/Next arrows, counter, Esc close, and overflow-locked thumbnail carousel.
 */
export function PdpLightboxModal({
  isOpen,
  onClose,
  images,
  selectedImageIndex,
  onSelect,
  productName,
  resolveImagePath,
  onError,
}) {
  const validImages = useMemo(() => filterValidProductImages(images), [images]);
  const totalImages = validImages.length;
  const safeIndex =
    totalImages > 0 ? Math.max(0, Math.min(selectedImageIndex, totalImages - 1)) : 0;

  const handleNavigate = useCallback(
    (direction) => {
      if (totalImages <= 1) return;
      const nextIndex =
        direction === "prev"
          ? (safeIndex - 1 + totalImages) % totalImages
          : (safeIndex + 1) % totalImages;
      onSelect(nextIndex);
    },
    [totalImages, safeIndex, onSelect]
  );

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handleNavigate("prev");
      if (e.key === "ArrowRight") handleNavigate("next");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, handleNavigate]);

  if (!isOpen || totalImages === 0) return null;

  const activeImage = validImages[safeIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName || "Product"} image gallery`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-3 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-gray-200 shrink-0 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate min-w-0">
            {productName || "Product Images"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {safeIndex + 1} / {totalImages}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close image viewer"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enlarged Main Image Stage */}
        <div className="relative flex-1 min-h-0 my-3 flex items-center justify-center bg-gray-50/70 rounded-lg border border-gray-100 p-3 sm:p-6 overflow-hidden">
          {totalImages > 1 && (
            <button
              type="button"
              aria-label="Previous product image"
              onClick={() => handleNavigate("prev")}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:border-[#d72828] hover:text-[#d72828] transition-all cursor-pointer active:scale-95"
            >
              <ChevronIcon direction="left" className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <img
            src={resolveImagePath(activeImage)}
            alt={productName || `Product image ${safeIndex + 1}`}
            className="object-contain max-h-[54vh] sm:max-h-[60vh] w-auto max-w-full rounded-md select-none"
            onError={(e) => onError(e, activeImage)}
          />

          {totalImages > 1 && (
            <button
              type="button"
              aria-label="Next product image"
              onClick={() => handleNavigate("next")}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:border-[#d72828] hover:text-[#d72828] transition-all cursor-pointer active:scale-95"
            >
              <ChevronIcon direction="right" className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Overflow-Locked Single-Row Thumbnail Carousel */}
        <div className="w-full min-w-0 pt-2 border-t border-gray-200 shrink-0">
          <ThumbnailStrip
            images={validImages}
            selectedImageIndex={safeIndex}
            onSelect={onSelect}
            resolveImagePath={resolveImagePath}
            onError={onError}
          />
        </div>
      </div>
    </div>
  );
}
