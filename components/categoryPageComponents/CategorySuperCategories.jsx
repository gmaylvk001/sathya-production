"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

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

const BADGE_COLOR_MAP = {
  red: "bg-[#b91c1c] text-white",
  black: "bg-[#18181b] text-[#fde047]",
  gray: "bg-[#3f3f46] text-white",
  olive: "bg-[#78711e] text-white",
  yellow: "bg-[#facc15] text-black font-bold",
  pink: "bg-[#fee2e2] text-[#dc2626] font-bold",
  blue: "bg-[#1d4ed8] text-white",
  emerald: "bg-[#047857] text-white",
};

export default function CategorySuperCategories({ config }) {
  const rawItems = (config?.items || []).filter((i) => i?.image && i?.isActive !== false);

  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawItems]);

  if (!items.length) return null;

  const kicker = String(config?.kicker || "DEPARTMENT MATRIX").trim();
  const heading = String(config?.name || "Explore Super-Categories").trim();
  const viewAllText = String(config?.viewAllText || "View All 84 Sub-Categories").trim();
  const viewAllUrl = resolveItemHref({ url: config?.viewAllUrl || "/categories" });

  return (
    <section className="w-full mb-10 bg-white py-5">
      <div className="w-full px-4 sm:px-6">
        {/* Header with kicker, title, and right view all link */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 sm:mb-7 px-1">
          <div>
            {kicker && (
              <p className="text-[11px] sm:text-xs font-bold text-[#b91c1c] tracking-wider uppercase mb-1">
                {kicker}
              </p>
            )}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">
              {heading}
            </h2>
          </div>

          {viewAllText && (
            <Link
              href={viewAllUrl}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#b91c1c] hover:text-[#991b1b] transition-colors group shrink-0"
            >
              <span>{viewAllText}</span>
              <Icon
                icon="mdi:arrow-right"
                className="text-base group-hover:translate-x-1 transition-transform"
              />
            </Link>
          )}
        </div>

        {/* Super Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
          {items.map((item, idx) => {
            const href = resolveItemHref(item);
            const isExternal = /^https?:\/\//i.test(href);
            const badgeClass =
              BADGE_COLOR_MAP[item.badgeColor] || "bg-[#b91c1c] text-white";

            const cardClasses =
              "group/supercard flex flex-col items-center bg-[#f3f4f6]/80 hover:bg-white border border-transparent hover:border-gray-200/90 rounded-3xl p-3 sm:p-4 text-center transition-all duration-300 hover:shadow-lg no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d62828]";

            const cardContent = (
              <>
                {/* Pure White Image Container */}
                <div className="w-full aspect-[4/3] rounded-2xl bg-white border border-gray-150/70 shadow-2xs flex items-center justify-center p-3 relative overflow-hidden mb-3 group-hover/supercard:scale-[1.02] transition-transform duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title || `Super Category ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain max-h-24 sm:max-h-28 transition-transform duration-300 group-hover/supercard:scale-105"
                  />
                </div>

                {/* Pill Offer Badge */}
                {item.badgeText ? (
                  <span
                    className={`inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-tight shadow-2xs mb-2 ${badgeClass}`}
                  >
                    {item.badgeText}
                  </span>
                ) : (
                  <span className="inline-block h-5 mb-2" />
                )}

                {/* Bold Category Title */}
                <h3 className="text-sm sm:text-base font-bold text-[#111827] group-hover/supercard:text-[#d72828] transition-colors leading-snug line-clamp-1 w-full px-1">
                  {item.title || "Category"}
                </h3>

                {/* Subtitle Description */}
                {item.subtitle && (
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1 line-clamp-1 font-normal w-full px-1">
                    {item.subtitle}
                  </p>
                )}
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
              <Link key={item._id || idx} href={href} className={cardClasses}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
