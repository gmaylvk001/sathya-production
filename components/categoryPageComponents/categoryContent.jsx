"use client";

import { CATEGORY_PAGE_SHELL_CLASS } from "@/lib/categoryPageComponents/layout";

/**
 * Storefront: category content block on white background.
 */
export default function CategoryContentBlock({ config }) {
  const content = String(config?.content || "").trim();
  if (!content) return null;

  const title = String(config?.name || "").trim();

  return (
    <section className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 py-6 md:py-8">
        {title ? (
          <h2 className="text-lg md:text-xl font-bold text-[#d72828] mb-3 tracking-tight">
            {title}
          </h2>
        ) : null}
        <div className="bg-white text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </section>
  );
}
