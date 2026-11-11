"use client";

import Link from "next/link";

function BannerLink({ href, children }) {
  const url = String(href || "").trim();
  if (!url) return children;
  if (/^https?:\/\//i.test(url)) {
    return (
      <a href={url} className="block">
        {children}
      </a>
    );
  }
  return (
    <Link href={url.startsWith("/") ? url : `/${url}`} className="block">
      {children}
    </Link>
  );
}

/**
 * Storefront: 1 full-width banner, or 2 side-by-side (left + right).
 */
export default function CategorySplitBanner({ config }) {
  const bannerCount = Number(config?.bannerCount) === 2 ? 2 : 1;
  const banners = [...(config?.banners || [])]
    .filter((b) => b?.image)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, bannerCount);

  if (!banners.length) return null;

  if (bannerCount === 1 || banners.length === 1) {
    const banner = banners[0];
    return (
      <div className="w-full mb-6">
        <BannerLink href={banner.url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image}
            alt="Banner"
            className="w-full h-auto object-cover"
          />
        </BannerLink>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {banners.map((banner, idx) => (
          <BannerLink key={idx} href={banner.url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.image}
              alt={idx === 0 ? "Left banner" : "Right banner"}
              className="w-full h-auto object-cover rounded-lg"
            />
          </BannerLink>
        ))}
      </div>
    </div>
  );
}
