"use client";

import { useEffect, useRef, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";
import CategoryTopBanner from "./categoryTopbanner";
import CategoryImageCarousel from "./categoryImageCarousel";
import CategoryProductCarousel from "./categoryProductCarousel";
import CategoryBannerSideProducts from "./categoryBannerSideProducts";
import CategoryBannerFourProducts from "./categoryBannerFourProducts";
import CategoryBannerGrid from "./categoryBannerGrid";
import CategoryImageColumns from "./categoryImageColumns";
import CategorySingleBannerProducts from "./categorySingleBannerProducts";
import CategoryBrandCarousel from "./categoryBrandCarousel";
import CategoryImageHotspotBanner from "./categoryImageHotspotBanner";
import CategoryContentBlock from "./categoryContent";
import CategorySplitBanner from "./categorySplitBanner";
import CategoryCircleImageCarousel from "./categoryCircleImageCarousel";

/**
 * Renders category page builder components in saved admin order.
 * Calls onHasDesign(true|false) after load so parents can fall back
 * to the classic filters + products listing when there is no design.
 */
export default function CategoryPageRenderer({
  pageType,
  categoryId,
  slug,
  parentSlug,
  brandSlug,
  onHasDesign,
}) {
  const { region } = useRegion();
  const [components, setComponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const onHasDesignRef = useRef(onHasDesign);
  onHasDesignRef.current = onHasDesign;

  useEffect(() => {
    if (!pageType || (!categoryId && !slug)) {
      setComponents([]);
      setLoaded(true);
      onHasDesignRef.current?.(false);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    const load = async () => {
      try {
        const params = new URLSearchParams({ pageType });
        if (slug) params.set("slug", String(slug));
        if (parentSlug) params.set("parent", String(parentSlug));
        if (brandSlug) params.set("brandSlug", String(brandSlug));
        if (categoryId) params.set("categoryId", String(categoryId));
        if (region) params.set("region", String(region));

        const res = await fetch(`/api/category-pages/render?${params}`);
        const data = await res.json();
        if (cancelled) return;

        if (!data?.success) {
          setComponents([]);
          // Keep /overview open when render fails; bouncing hid designed pages.
          onHasDesignRef.current?.(true);
          return;
        }
        const list = data.components || [];
        setComponents(list);
        onHasDesignRef.current?.(Boolean(data.hasPage || list.length > 0));
      } catch (err) {
        console.error("CategoryPageRenderer:", err);
        if (!cancelled) {
          setComponents([]);
          onHasDesignRef.current?.(true);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pageType, categoryId, slug, parentSlug, brandSlug, region]);

  if (!loaded || !components.length) return null;

  return (
    <div className="category-page-builder w-full bg-white">
      {components.map((item, idx) => {
        if (item.type === COMPONENT_TYPES.TOP_BANNER) {
          return (
            <div key={item.instanceId ? `${item.instanceId}-${idx}` : idx} className="w-full bg-white">
              <CategoryTopBanner
                banners={item.config?.banners}
                categoryId={categoryId}
                slug={slug}
              />
            </div>
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_CAROUSEL) {
          return (
            <CategoryImageCarousel
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.PRODUCT_CAROUSEL) {
          return (
            <CategoryProductCarousel
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
          return (
            <CategoryBannerSideProducts
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
          return (
            <CategoryBannerFourProducts
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_GRID) {
          return (
            <CategoryBannerGrid
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_COLUMNS) {
          return (
            <CategoryImageColumns
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS) {
          return (
            <CategorySingleBannerProducts
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BRAND_CAROUSEL) {
          return (
            <CategoryBrandCarousel
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER) {
          return (
            <CategoryImageHotspotBanner
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.CATEGORY_CONTENT) {
          return (
            <CategoryContentBlock
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.SPLIT_BANNER) {
          return (
            <CategorySplitBanner
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL) {
          return (
            <CategoryCircleImageCarousel
              key={item.instanceId ? `${item.instanceId}-${idx}` : idx}
              config={item.config}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
