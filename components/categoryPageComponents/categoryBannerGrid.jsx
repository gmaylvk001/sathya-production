"use client";

import { useState } from "react";
import Link from "next/link";
import CategoryProductCarousel from "./categoryProductCarousel";

/** Storefront max box — images larger than this shrink to fit, never crop */
const MAX_DISPLAY = 450;

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

function BannerLink({ href, children, className = "" }) {
  if (!href) return <div className={className}>{children}</div>;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        href={href}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * Actual size if both ≤ 450.
 * If either side is larger (e.g. 550×350 or 600×600), shrink proportionally
 * so the full image fits inside 450×450 — no cropping / half-cut.
 */
function getDisplaySize(naturalWidth, naturalHeight) {
  const nw = naturalWidth || 0;
  const nh = naturalHeight || 0;
  if (nw <= 0 || nh <= 0) return null;
  if (nw <= MAX_DISPLAY && nh <= MAX_DISPLAY) {
    return { width: nw, height: nh };
  }
  const scale = Math.min(MAX_DISPLAY / nw, MAX_DISPLAY / nh);
  return {
    width: Math.round(nw * scale),
    height: Math.round(nh * scale),
  };
}

function BannerTile({ banner, className = "" }) {
  const href = resolveHref(banner.url);
  const [displaySize, setDisplaySize] = useState(null);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setDisplaySize(getDisplaySize(naturalWidth, naturalHeight));
  };

  return (
    <BannerLink
      href={href}
      className={`flex items-center justify-center w-full min-w-0 overflow-hidden rounded-sm hover:opacity-95 transition-opacity ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image}
        alt=""
        onLoad={handleLoad}
        style={
          displaySize
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
                maxHeight: `${MAX_DISPLAY}px`,
              }
        }
        className="block object-contain"
        draggable={false}
      />
    </BannerLink>
  );
}

/**
 * Storefront: 2–4 banners in a responsive grid.
 * Admin may upload up to 600×600.
 * Display: actual size if ≤ 450×450; otherwise shrink to fit 450×450 (no crop).
 */
export default function CategoryBannerGrid({ config }) {
  const name = config?.name || "";
  const productName = config?.productName || "";
  const products = (config?.products || []).filter(
    (product) => product?._id || product?.slug
  );
  const showGap = Boolean(config?.showGap);
  const banners = (config?.banners || []).filter((b) => b?.image);
  const count = banners.length;

  if (count < 2) return null;

  const gapClass = showGap ? "gap-2 sm:gap-3" : "gap-0";

  const desktopCols =
    count === 2
      ? "md:grid-cols-2"
      : count === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";

  const gridClass = `grid w-full min-w-0 justify-items-center grid-cols-2 ${gapClass} ${desktopCols}`;

  return (
    <section className="w-full mb-8 bg-white overflow-hidden">
      <div className="w-full px-4 sm:px-6">
        {name ? (
          <h2 className="text-xl sm:text-2xl font-bold text-[#d72828] mb-4 px-1 text-center tracking-tight">
            {name}
          </h2>
        ) : null}

        {count === 3 ? (
          /* Mobile: row1 = 2 equal, row2 = 1 centered (same cell size). Desktop: 3 in a row */
          <div
            className={`grid w-full min-w-0 justify-items-center grid-cols-4 md:grid-cols-3 ${gapClass}`}
          >
            <div className="col-span-2 md:col-span-1 min-w-0 w-full flex justify-center">
              <BannerTile banner={banners[0]} />
            </div>
            <div className="col-span-2 md:col-span-1 min-w-0 w-full flex justify-center">
              <BannerTile banner={banners[1]} />
            </div>
            <div className="col-span-2 col-start-2 md:col-span-1 md:col-start-auto min-w-0 w-full flex justify-center">
              <BannerTile banner={banners[2]} />
            </div>
          </div>
        ) : (
          <div className={gridClass}>
            {banners.map((banner, idx) => (
              <div key={idx} className="min-w-0 w-full flex justify-center">
                <BannerTile banner={banner} />
              </div>
            ))}
          </div>
        )}

        {products.length >= 6 && productName ? (
          <CategoryProductCarousel
            config={{
              name: productName,
              products,
              seeAllHref:
                config?.seeAllHref ||
                (config?.seeAllLink ? resolveHref(config.seeAllLink) : ""),
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
