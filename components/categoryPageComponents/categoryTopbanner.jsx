"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRegion } from "@/context/RegionContext";

/**
 * Storefront Top Banner UI.
 * Pass `banners` from CategoryPageRenderer (ordered layout),
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
    if (banners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const current = banners[index] || banners[0];
  const imageSrc = current.desktopImage || current.mobileImage;
  if (!imageSrc) return null;

  const content = (
    <div className="relative w-full overflow-hidden rounded-lg mb-6 aspect-[16/7] sm:aspect-[21/9] min-h-[160px] sm:min-h-[260px] bg-gray-100">
      <picture>
        {current.mobileImage && (
          <source media="(max-width: 767px)" srcSet={current.mobileImage} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={current.title || "SATHYA Store Promotional Banner"}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          width={1200}
          height={420}
          className="w-full h-full object-cover max-h-[420px]"
        />
      </picture>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
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
              className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (current.url) {
    const isExternal = /^https?:\/\//i.test(current.url);
    if (isExternal) {
      return (
        <a href={current.url} aria-label={current.title || "View promotional banner details"}>
          {content}
        </a>
      );
    }
    const href = current.url.startsWith("/") ? current.url : `/${current.url}`;
    return <Link href={href} aria-label={current.title || "View promotional banner details"}>{content}</Link>;
  }

  return content;
}
