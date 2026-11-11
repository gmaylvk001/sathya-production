"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import SharedProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";

function usePerPage() {
  const [perPage, setPerPage] = useState(5);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerPage(2);
      else if (w < 900) setPerPage(3);
      else if (w < 1100) setPerPage(4);
      else if (w < 1280) setPerPage(5);
      else setPerPage(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const match =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
          Boolean(window.matchMedia && window.matchMedia("(max-width: 767px)").matches));
      setIsMobile(match);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
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

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

function BannerLink({ href, children, className = "", style }) {
  if (!href) return <div className={className} style={style}>{children}</div>;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        href={href}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

function RelatedProducts({ products, seeAllHref, name }) {
  const perPage = usePerPage();
  const isMobile = useIsMobile();
  const scrollerRef = useRef(null);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [brandMap, setBrandMap] = useState({});

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch('/api/brand');
        const result = await response.json();
        if (!result.error && Array.isArray(result.data)) {
          const map = {};
          result.data.forEach((b) => {
            map[b._id] = b.brand_name;
          });
          setBrandMap(map);
        }
      } catch (error) {
        console.error('Error fetching brand map:', error);
      }
    };
    fetchBrand();
  }, []);

  const handleProductClick = (product) => {
    try {
      const storedString = localStorage.getItem('recentlyViewed');
      let stored = [];
      try {
        stored = JSON.parse(storedString) || [];
      } catch {
        stored = [];
      }
      const updated = [product, ...stored.filter((p) => p._id !== product._id)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating recentlyViewed localStorage:', e);
    }
  };

  const pageStarts = useMemo(
    () => getPageStarts(products.length, perPage),
    [products.length, perPage]
  );
  const pages = useMemo(
    () => pageStarts.map((start) => products.slice(start, start + perPage)),
    [products, pageStarts, perPage]
  );
  const pageCount = Math.max(1, pages.length);

  const scrollToPage = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      let next = index;
      if (next >= pageCount) next = 0;
      if (next < 0) next = pageCount - 1;
      el.scrollTo({ left: next * el.clientWidth, behavior });
      setPage(next);
    },
    [pageCount]
  );

  useEffect(() => {
    setPage(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [perPage]);

  // Keep page index synced with scroll position (e.g. manual swipe on mobile)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const handleScroll = () => {
      const w = el.clientWidth || 1;
      const currentPage = Math.round(el.scrollLeft / w);
      setPage((prev) => (prev !== currentPage ? currentPage : prev));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // 100% disable auto-scroll on mobile view (<= 767px)
    if (isMobile) return undefined;
    if (
      typeof window !== "undefined" &&
      (window.innerWidth < 768 ||
        window.matchMedia?.("(max-width: 767px)")?.matches)
    ) {
      return undefined;
    }
    if (pageCount <= 1 || paused) return undefined;
    const id = setInterval(() => {
      setPage((current) => {
        const next = current + 1 >= pageCount ? 0 : current + 1;
        const el = scrollerRef.current;
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [pageCount, paused, isMobile]);

  const gapPx = 14;
  const cellStyle = {
    width: `calc((100% - ${(perPage - 1) * gapPx}px) / ${perPage})`,
  };

  const renderCard = (product, key) => {
    return (
      <div
        key={key}
        className="box-border min-w-0 shrink-0 py-1"
        style={cellStyle}
      >
        <SharedProductCard
          product={normalizeProduct(product, brandMap)}
          onProductClick={handleProductClick}
        />
      </div>
    );
  };

  if (!products.length) return null;

  return (
    <div className="w-full mt-6">
      <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#d72828] tracking-tight">
          {name}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="text-sm font-semibold text-[#d72828] hover:text-[#b31e1e] hover:underline"
            >
              See All
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollToPage(page - 1)}
            className="h-8 w-8 border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200"
          >
            <FiChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollToPage(page + 1)}
            className="h-8 w-8 border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scrollerRef}
          className="flex w-full overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-hide bg-white"
        >
          {pages.map((chunk, pageIdx) => (
            <div
              key={pageIdx}
              className="flex w-full min-w-full shrink-0 snap-start snap-always"
              style={{ gap: `${gapPx}px` }}
            >
              {chunk.map((p, i) => renderCard(p, `${p._id}-${pageIdx}-${i}`))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Storefront: top banner + 3 or 4 tiles on colored BG + related products.
 * Banner & tiles: display at exact uploaded size; if too large, shrink to fit
 * (tiles max 450×450) without cropping.
 */
const TILE_MAX_DISPLAY = 450;

function getDisplaySize(naturalWidth, naturalHeight, maxSide = TILE_MAX_DISPLAY) {
  const nw = naturalWidth || 0;
  const nh = naturalHeight || 0;
  if (nw <= 0 || nh <= 0) return null;
  if (nw <= maxSide && nh <= maxSide) {
    return { width: nw, height: nh };
  }
  const scale = Math.min(maxSide / nw, maxSide / nh);
  return {
    width: Math.round(nw * scale),
    height: Math.round(nh * scale),
  };
}

function ExactSizeImage({ src, alt = "", maxSide, className = "" }) {
  const [displaySize, setDisplaySize] = useState(null);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (maxSide != null) {
      setDisplaySize(getDisplaySize(naturalWidth, naturalHeight, maxSide));
      return;
    }
    // Banner: keep exact pixel size (container may shrink via maxWidth)
    setDisplaySize({ width: naturalWidth, height: naturalHeight });
  };

  const style =
    maxSide != null
      ? displaySize
        ? {
          width: `${displaySize.width}px`,
          height: "auto",
          aspectRatio: `${displaySize.width} / ${displaySize.height}`,
          maxWidth: "100%",
          maxHeight: `${displaySize.height}px`,
        }
        : {
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: `${maxSide}px`,
        }
      : displaySize
        ? {
          width: `${displaySize.width}px`,
          maxWidth: "100%",
          height: "auto",
        }
        : {
          width: "auto",
          height: "auto",
          maxWidth: "100%",
        };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onLoad={handleLoad}
      style={style}
      className={`block object-contain ${className}`}
      draggable={false}
    />
  );
}

export default function CategoryBannerFourProducts({ config }) {
  const bannerDesktop = config?.bannerDesktop || "";
  const bannerMobile = config?.bannerMobile || bannerDesktop;
  const bannerHref = config?.bannerHref || "";
  const tilesBgColor = config?.tilesBgColor || "#0d9488";
  const tiles = (config?.tiles || []).filter((t) => t?.image);
  const products = (config?.products || []).filter((p) => p?._id || p?.slug);
  const name = config?.name || "";

  if (!bannerDesktop || tiles.length < 3) return null;

  const visibleTiles = tiles.slice(0, 4);
  const tileGridClass =
    visibleTiles.length === 3
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <section className="w-full mb-8 bg-white">
      <div className="w-full px-4 sm:px-6">
        <BannerLink
          href={bannerHref}
          className="flex w-full items-center justify-center overflow-hidden rounded-sm"
        >
          <picture className="flex w-full items-center justify-center">
            {bannerMobile && bannerMobile !== bannerDesktop ? (
              <source media="(max-width: 767px)" srcSet={bannerMobile} />
            ) : null}
            <ExactSizeImage src={bannerDesktop} alt="" className="mx-auto" />
          </picture>
        </BannerLink>

        <div
          className="w-full px-2 sm:px-3 py-3 sm:py-4 rounded-sm"
          style={{ backgroundColor: tilesBgColor }}
        >
          <div
            className={`grid ${tileGridClass} gap-2 sm:gap-3 place-items-center`}
          >
            {visibleTiles.map((tile, idx) => {
              const href = resolveHref(tile.url);
              return (
                <BannerLink
                  key={idx}
                  href={href}
                  className="flex items-center justify-center w-full min-w-0 overflow-hidden rounded-md hover:opacity-95 transition-opacity"
                >
                  <ExactSizeImage
                    src={tile.image}
                    alt=""
                    maxSide={TILE_MAX_DISPLAY}
                  />
                </BannerLink>
              );
            })}
          </div>
        </div>

        <RelatedProducts
          products={products}
          seeAllHref={bannerHref}
          name={name}
        />
      </div>
    </section>
  );
}
