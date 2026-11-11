"use client";

import CategoryPage from "../Fallbackmain";

/**
 * Main category route always shows filters + products listing.
 * Custom page-builder content lives on /category/{slug}/overview.
 */
export default function CategoryPrimaryPage() {
  return <CategoryPage />;
}
