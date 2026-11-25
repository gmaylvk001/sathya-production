"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRegion } from "@/context/RegionContext";
import HeroBannerGrid from "@/components/homePageComponents/HeroBannerGrid";

function isGridSlide(slide) {
  return slide?.mode === "big-left" || slide?.mode === "big-right";
}

function wrapSingleSlideLink(url, content, fillDesktopHeight) {
  if (!url) return content;
  const linkClass = fillDesktopHeight ? "block w-full lg:h-full" : "block w-full";
  const isExternal = /^https?:\/\//i.test(url);
  if (isExternal) {
    return (
      <a href={url} className={linkClass}>
        {content}
      </a>
    );
  }
  const href = url.startsWith("/") ? url : `/${url}`;
  return (
    <Link href={href} className={linkClass}>
      {content}
    </Link>
  );
}

/**
 * Storefront Top Banner UI.
 * Pass `banners` from HomePageRenderer / CategoryPageRenderer (ordered layout),
 * OR pass categoryId/slug to fetch directly.
 */
export default function CategoryTopBanner({
  banners: bannersProp,
  categoryId,
  slug,
}) {
  const { region } = useRegion();
  const [banners, setBanners] = useState(bannersProp || []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (Array.isArray(bannersProp)) {
      setBanners(bannersProp);
      setIndex(0);
      return;
    }

    if (!categoryId && !slug) {
      setBanners([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ activeOnly: "1" });
        if (categoryId) params.set("categoryId", String(categoryId));
        else params.set("slug", String(slug));
        if (region) params.set("region", String(region));

        const res = await fetch(`/api/category-topbanner?${params}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setBanners(data.banners || []);
          setIndex(0);
        }
      } catch (err) {
        console.error("CategoryTopBanner:", err);
        if (!cancelled) setBanners([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [bannersProp, categoryId, slug, region]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) return null;

  const safeIndex = index < banners.length ? index : 0;
  const current = banners[safeIndex] || banners[0];
  const currentIsGrid = isGridSlide(current);
  const hasGridSlides = banners.some(isGridSlide);

  const imageSrc = current.desktopImage || current.mobileImage;
  if (!imageSrc) return null;

  const goPrev = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  };

  const goNext = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIndex((i) => (i + 1) % banners.length);
  };

  const renderSlide = () => {
    if (currentIsGrid) {
      const heroConfig = {
        variant: current.mode === "big-right" ? "big-right" : "big-left",
        largeBanner: {
          desktopImage: current.desktopImage || "",
          mobileImage: current.mobileImage || "",
          url: current.url || "",
          heading: current.heading || "",
          description: current.description || "",
          buttonText: current.buttonText || "",
          buttonUrl: current.buttonUrl || "",
          overlayAlign: current.overlayAlign || "bottom-left",
          textColor: current.textColor || "#ffffff",
          showGradientOverlay: current.showGradientOverlay !== false,
        },
        smallBanner1: current.smallBanner1 || {},
        smallBanner2: current.smallBanner2 || {},
      };
      return <HeroBannerGrid config={heroConfig} embedded />;
    }

    const imgClass = hasGridSlides
      ? "w-full h-auto max-h-[420px] lg:h-full object-cover object-center"
      : "w-full h-auto object-cover max-h-[420px]";

    const pictureEl = (
      <picture className={hasGridSlides ? "block w-full lg:h-full" : "block w-full"}>
        {current.mobileImage && (
          <source media="(max-width: 767px)" srcSet={current.mobileImage} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={current.heading || "Top banner"}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className={imgClass}
        />
      </picture>
    );

    return wrapSingleSlideLink(current.url, pictureEl, hasGridSlides);
  };

  const stageClass = hasGridSlides
    ? "relative w-full overflow-hidden rounded-lg mb-6 min-h-[150px] sm:min-h-[260px] md:min-h-[320px] lg:h-[360px] xl:h-[395px] 2xl:h-[420px] bg-white"
    : "relative w-full overflow-hidden rounded-lg mb-6 min-h-[150px] sm:min-h-[260px] md:min-h-[320px] bg-gray-50";

  return (
    <div
      className={stageClass}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches?.[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (startX == null || banners.length <= 1) return;
        const endX = e.changedTouches?.[0]?.clientX;
        if (typeof endX !== "number") return;
        const delta = endX - startX;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) goNext();
        else goPrev();
      }}
    >
      {renderSlide()}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={goPrev}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/60 backdrop-blur-sm transition"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={goNext}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/60 backdrop-blur-sm transition"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/25 px-2.5 py-1 backdrop-blur-sm">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? "w-5 bg-white" : "w-2 bg-white/55 hover:bg-white/85"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
