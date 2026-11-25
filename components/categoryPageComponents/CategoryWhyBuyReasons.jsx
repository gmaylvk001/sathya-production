"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

const ICON_COLOR_STYLES = {
  light_red: "bg-red-50 text-[#d72828] border border-red-100",
  yellow: "bg-[#facc15] text-black shadow-2xs",
  dark_red: "bg-[#991b1b] text-white shadow-2xs",
  dark: "bg-[#18181b] text-white shadow-2xs",
  green: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  blue: "bg-blue-50 text-blue-600 border border-blue-100",
};

const TAG_COLOR_STYLES = {
  red: "text-[#d72828]",
  dark: "text-[#18181b]",
  green: "text-emerald-700",
};

export default function CategoryWhyBuyReasons({ config }) {
  const rawItems = (config?.items || []).filter(
    (i) => i?.title && i?.isActive !== false
  );

  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawItems]);

  if (!items.length) return null;

  const kicker = String(config?.kicker || "THE OMNICHANNEL ADVANTAGE").trim();
  const heading = String(config?.name || "Why Buy From Sathya?").trim();
  const subtitle = String(
    config?.subtitle ||
      "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores."
  ).trim();

  // Choose responsive column count based on number of items:
  // 3 items -> 3 cols; 4 or 8 items -> 4 cols on xl screens
  const gridClasses =
    items.length % 4 === 0 || items.length >= 7
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7";

  return (
    <section className="w-full mb-12 bg-white py-6">
      <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10 px-2">
          {kicker && (
            <p className="text-xs sm:text-xs font-bold text-[#d72828] uppercase tracking-wider mb-2">
              {kicker}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight">
            {heading}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm md:text-base text-gray-500 max-w-2xl mx-auto mt-2.5 leading-relaxed font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {/* Feature Cards Grid (6 to 8 cards) */}
        <div className={gridClasses}>
          {items.map((item, idx) => {
            const iconClass =
              ICON_COLOR_STYLES[item.iconColor] || ICON_COLOR_STYLES.light_red;
            const tagClass =
              TAG_COLOR_STYLES[item.tagColor] || TAG_COLOR_STYLES.red;

            const cardClasses =
              "group/whycard flex flex-col items-center bg-[#f8f9fa] hover:bg-white rounded-3xl p-6 sm:p-7 text-center transition-all duration-300 border border-gray-100 hover:border-gray-200/90 hover:shadow-lg no-underline h-full";

            const cardContent = (
              <>
                {/* Circular Icon Badge */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-5 shrink-0 transition-transform duration-300 group-hover/whycard:scale-110 ${iconClass}`}
                >
                  {item.iconType === "image" && item.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <Icon
                      icon={item.icon || "mdi:storefront-outline"}
                      className="text-2xl sm:text-3xl"
                    />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-[#111827] leading-snug mb-2 group-hover/whycard:text-[#d72828] transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-5 flex-1 font-normal">
                    {item.description}
                  </p>
                )}

                {/* Footer Highlight Tag */}
                {item.tagText && (
                  <span
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mt-auto pt-2 block ${tagClass}`}
                  >
                    {item.tagText}
                  </span>
                )}
              </>
            );

            if (item.link) {
              const isExternal = /^https?:\/\//i.test(item.link);
              if (isExternal) {
                return (
                  <a
                    key={item._id || idx}
                    href={item.link}
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
                  href={item.link}
                  className={cardClasses}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={item._id || idx} className={cardClasses}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
