"use client";

import { useMemo } from "react";
import Link from "next/link";

function resolveItemHref(item) {
  const target = String(item?.slug || item?.url || item?.link || item?.href || "").trim();
  if (!target) return "#";
  try {
    if (/^https?:\/\//i.test(target)) {
      const parsed = new URL(target);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "16.113.88.134" ||
        parsed.hostname.includes("sathya")
      ) {
        return (parsed.pathname + parsed.search + parsed.hash).replace(/\/+/g, "/");
      }
      return target;
    }
  } catch (e) { }
  if (target.startsWith("/")) return target.replace(/\/+/g, "/");
  return `/${target.replace(/^\/+/, "")}`;
}

export default function CategoryCircleImageCarousel({ config }) {
  const rawItems = (config?.items || []).filter((i) => i?.image && i?.isActive !== false);

  // Deduplicate categories: prevent already-seen categories / duplicate links from appearing again
  const items = useMemo(() => {
    const seen = new Set();
    return rawItems.filter((item) => {
      const slugKey = String(item?.slug || item?.url || "")
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\/[^\/]+/i, "")
        .replace(/\/+/g, "/")
        .replace(/\/$/, "");

      const nameKey = String(item?.imageName || item?.name || item?.title || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

      // Normalize synonym category names / slugs (e.g. televisions vs led-tv vs tv)
      const isTv =
        slugKey.includes("television") ||
        slugKey.includes("/tv") ||
        nameKey === "tv" ||
        nameKey === "ledtv" ||
        nameKey.includes("television");

      const normalizedKey = isTv ? "category-television" : (slugKey || nameKey);

      if (!normalizedKey) return true;

      if (
        seen.has(normalizedKey) ||
        (slugKey && seen.has(slugKey)) ||
        (nameKey && seen.has(nameKey))
      ) {
        return false;
      }

      seen.add(normalizedKey);
      if (slugKey) seen.add(slugKey);
      if (nameKey) seen.add(nameKey);
      return true;
    });
  }, [rawItems]);

  const rawName = String(config?.name || "Best Price In the Market").trim();
  const mainHeading = rawName.replace(/\.+$/, "") || "Best Price In the Market";

  if (!items.length) return null;

  return (
    <section className="w-full mb-8 bg-white py-4">
      {/* Full width container with standard side padding matching other home page sections */}
      <div className="w-full px-4 sm:px-6">
        {/* Heading */}
        <div className="mb-4 sm:mb-6 px-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#d72828] tracking-tight flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span className="text-[#d72828]">{mainHeading}.</span>
            <span className="text-sm sm:text-base md:text-lg font-medium text-gray-500">
              Shop by category.
            </span>
          </h2>
        </div>

        {/* Responsive Square Cards Grid without carousel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
          {items.map((item, idx) => {
            const href = resolveItemHref(item);
            const isExternal = /^https?:\/\//i.test(href);
            const categoryTitle = item.imageName || item.name || item.title || "Category";

            const cardClasses =
              "group/card flex flex-col items-center w-full no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d62828] text-center";

            const cardContent = (
              <>
                {/* Square Box with White Background & Contained Image */}
                <div className="relative w-full aspect-square bg-white rounded-[20px] sm:rounded-[26px] border-2 sm:border-[2.5px] border-gray-300 shadow-xs group-hover/card:shadow-md transition-all duration-300 flex items-center justify-center p-2.5 sm:p-3.5 md:p-4 overflow-hidden group-hover/card:border-[#d72828] group-hover/card:-translate-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image ? `${item.image}?v=white2` : "/favicon.webp"}
                    alt={categoryTitle}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onError={(e) => {
                      if (!e.target.dataset.triedFallback) {
                        e.target.dataset.triedFallback = "true";
                        e.target.src = "/favicon.webp";
                        e.target.className = "w-16 h-16 opacity-40 object-contain";
                      }
                    }}
                    className="w-full h-full object-contain select-none pointer-events-none transform scale-100 group-hover/card:scale-105 transition-transform duration-300 ease-out"
                  />
                </div>

                {/* Category name below the square */}
                <div className="mt-2 sm:mt-2.5 text-center w-full px-1">
                  <span className="block text-[12px] min-[400px]:text-[13px] sm:text-[14px] md:text-[15px] font-semibold text-gray-800 line-clamp-2 leading-tight group-hover/card:text-[#d72828] transition-colors duration-200">
                    {categoryTitle}
                  </span>
                </div>
              </>
            );

            if (isExternal) {
              return (
                <a
                  key={item._id || idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClasses}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={item._id || idx}
                href={href}
                className={cardClasses}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
