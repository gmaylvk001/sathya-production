"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import SharedProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";

function usePerPage() {
  const [perPage, setPerPage] = useState(4);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerPage(2);
      else if (w < 900) setPerPage(3);
      else if (w < 1100) setPerPage(4);
      else setPerPage(4);
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

function BannerLink({ href, children, className = "" }) {
  if (!href) return <div className={className}>{children}</div>;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  const linkHref = href.startsWith("/") ? href : `/${href}`;
  return (
    <Link href={linkHref} className={className}>
      {children}
    </Link>
  );
}

function ProductRow({ products, seeAllHref, name }) {
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

  const gapPx = 12;
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
    <div className="w-full md:flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#d72828] tracking-tight truncate">
          {name}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="text-xs sm:text-sm font-semibold text-[#d72828] hover:text-[#b31e1e] hover:underline whitespace-nowrap"
            >
              See All
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollToPage(page - 1)}
            className="h-7 w-7 sm:h-8 sm:w-8 border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollToPage(page + 1)}
            className="h-7 w-7 sm:h-8 sm:w-8 border border-gray-300 bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scrollerRef}
          className="flex w-full gap-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-hide bg-white"
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
 * Storefront: main banner + side banner (left/right) + product row.
 * See All uses mainBannerHref from config.
 */
export default function CategoryBannerSideProducts({ config }) {
  const products = (config?.products || []).filter((p) => p?._id || p?.slug);
  const name = config?.name || "";
  const mainDesktop = config?.mainBannerDesktop || "";
  const mainMobile = config?.mainBannerMobile || mainDesktop;
  const mainHref = config?.mainBannerHref || "";
  const sideImage = config?.sideBannerImage || "";
  const sideHref = config?.sideBannerHref || "";
  const sidePosition = config?.sideBannerPosition === "right" ? "right" : "left";

  if (!mainDesktop || !sideImage) return null;

  const sideBlock = (
    <BannerLink
      href={sideHref}
      className="hidden md:block md:w-[28%] lg:w-[24%] shrink-0 overflow-hidden rounded-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sideImage}
        alt=""
        className="w-full h-full min-h-[280px] object-cover rounded-sm"
      />
    </BannerLink>
  );

  return (
    <section className="w-full mb-8 bg-white">
      <div className="w-full px-4 sm:px-6">
        <BannerLink href={mainHref} className="block w-full mb-4 overflow-hidden rounded-sm">
          <picture>
            {mainMobile && mainMobile !== mainDesktop ? (
              <source media="(max-width: 767px)" srcSet={mainMobile} />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainDesktop}
              alt=""
              className="w-full h-auto object-cover aspect-[16/5] sm:aspect-[16/4]"
            />
          </picture>
        </BannerLink>

        <div
          className={`flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch ${
            sidePosition === "right" ? "md:flex-row-reverse" : ""
          }`}
        >
          {sideBlock}
          <ProductRow products={products} seeAllHref={mainHref} name={name} />
        </div>
      </div>
    </section>
  );
}
