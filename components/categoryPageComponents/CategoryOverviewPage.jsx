"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryPageRenderer from "@/components/categoryPageComponents/CategoryPageRenderer";
import { buildCategoryBasePath } from "@/lib/categoryPageComponents/categoryHref";
import {
  CATEGORY_OVERVIEW_INNER_CLASS,
  CATEGORY_OVERVIEW_OUTER_CLASS,
} from "@/lib/categoryPageComponents/layout";

/**
 * Overview page wrapper: renders page-builder components for a category.
 * If no active design exists, redirects to the listing URL.
 */
export default function CategoryOverviewPage({
  pageType,
  slug,
  parentSlug = "",
  brandSlug,
  listingSlugs = [],
  listingPath: listingPathProp,
}) {
  const router = useRouter();
  const [hasDesign, setHasDesign] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const listingPath =
    listingPathProp ||
    buildCategoryBasePath(
      listingSlugs.length ? listingSlugs : slug ? [slug] : []
    );

  const handleHasDesign = (value) => {
    setHasDesign(Boolean(value));
    setLoaded(true);
  };

  useEffect(() => {
    if (!loaded || hasDesign !== false) return;
    router.replace(listingPath);
  }, [loaded, hasDesign, listingPath, router]);

  return (
    <div className={CATEGORY_OVERVIEW_OUTER_CLASS} style={{ backgroundColor: "#EBEBEB" }}>
      <div className={CATEGORY_OVERVIEW_INNER_CLASS}>
        {!loaded && (
          <div className="py-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]" />
            </div>
          </div>
        )}
        <CategoryPageRenderer
          pageType={pageType}
          slug={slug}
          parentSlug={parentSlug}
          brandSlug={brandSlug}
          onHasDesign={handleHasDesign}
        />
      </div>
    </div>
  );
}
