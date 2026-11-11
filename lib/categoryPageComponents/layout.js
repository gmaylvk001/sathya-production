/**
 * Shared layout shell for category listing + overview pages.
 * Wider than max-w-7xl so 1440 / 2K screens have less empty side space,
 * while mobile keeps a small safe gutter.
 */
export const CATEGORY_PAGE_SHELL_CLASS =
  "w-full mx-auto max-w-[1600px] 2xl:max-w-[1800px] px-2 sm:px-3 md:px-4 lg:px-4 xl:px-5";

/** Outer wrap for overview (background full-bleed, content constrained). */
export const CATEGORY_OVERVIEW_OUTER_CLASS =
  "w-full px-2 sm:px-3 md:px-4 lg:px-4 xl:px-5";

export const CATEGORY_OVERVIEW_INNER_CLASS =
  "w-full mx-auto max-w-[1600px] 2xl:max-w-[1800px]";
