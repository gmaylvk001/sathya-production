"use client";

import { useEffect, useRef, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";
import dynamic from "next/dynamic";
import CategoryTopBanner from "@/components/categoryPageComponents/categoryTopbanner";
import CategoryCircleImageCarousel from "@/components/categoryPageComponents/categoryCircleImageCarousel";

const CategoryImageCarousel = dynamic(() => import("@/components/categoryPageComponents/categoryImageCarousel"));
const CategoryProductCarousel = dynamic(() => import("@/components/categoryPageComponents/categoryProductCarousel"));
const CategoryBannerSideProducts = dynamic(() => import("@/components/categoryPageComponents/categoryBannerSideProducts"));
const CategoryBannerFourProducts = dynamic(() => import("@/components/categoryPageComponents/categoryBannerFourProducts"));
const CategoryBannerGrid = dynamic(() => import("@/components/categoryPageComponents/categoryBannerGrid"));
const CategoryImageColumns = dynamic(() => import("@/components/categoryPageComponents/categoryImageColumns"));
const CategorySingleBannerProducts = dynamic(() => import("@/components/categoryPageComponents/categorySingleBannerProducts"));
const CategoryBrandCarousel = dynamic(() => import("@/components/categoryPageComponents/categoryBrandCarousel"));
const CategoryImageHotspotBanner = dynamic(() => import("@/components/categoryPageComponents/categoryImageHotspotBanner"));
const CategoryContentBlock = dynamic(() => import("@/components/categoryPageComponents/categoryContent"));
const CategorySplitBanner = dynamic(() => import("@/components/categoryPageComponents/categorySplitBanner"));
const TrendingVideoSection = dynamic(() => import("@/components/TrendingVideoSection"));

// In-memory cache to prevent layout shift and avoid re-fetching on client navigation
const homeRenderCache = new Map();

/**
 * Renders Home Settings page-builder components in saved admin order.
 * Reuses the same storefront section UI as category overview pages.
 */
export default function HomePageRenderer({ onHasDesign }) {
  const { region } = useRegion();
  const targetRegion = (region || "all").toLowerCase();
  const cached = homeRenderCache.get(targetRegion);

  const [components, setComponents] = useState(cached || []);
  const [loaded, setLoaded] = useState(Boolean(cached && cached.length > 0));
  const onHasDesignRef = useRef(onHasDesign);
  onHasDesignRef.current = onHasDesign;

  useEffect(() => {
    let cancelled = false;
    if (!homeRenderCache.has(targetRegion)) {
      setLoaded(false);
    }

    const load = async () => {
      try {
        const res = await fetch(
          `/api/home-pages/render?region=${encodeURIComponent(targetRegion)}`
        );
        const data = await res.json();
        if (cancelled) return;

        const list = data.success ? data.components || [] : [];
        homeRenderCache.set(targetRegion, list);
        setComponents(list);
        onHasDesignRef.current?.(list.length > 0);
      } catch (err) {
        console.error("HomePageRenderer:", err);
        if (!cancelled && !homeRenderCache.has(targetRegion)) {
          setComponents([]);
          onHasDesignRef.current?.(false);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [targetRegion]);

  if (!loaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]" />
      </div>
    );
  }

  if (!components.length) return null;

  return (
    <div className="home-page-builder w-full bg-white">
      {components.map((item, idx) => {
        if (item.type === COMPONENT_TYPES.TOP_BANNER) {
          return (
            <div key={item.instanceId || idx} className="w-full bg-white">
              <CategoryTopBanner banners={item.config?.banners} />
            </div>
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_CAROUSEL) {
          return (
            <CategoryImageCarousel
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.PRODUCT_CAROUSEL) {
          return (
            <CategoryProductCarousel
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
          return (
            <CategoryBannerSideProducts
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
          return (
            <CategoryBannerFourProducts
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_GRID) {
          return (
            <CategoryBannerGrid
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_COLUMNS) {
          return (
            <CategoryImageColumns
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS) {
          return (
            <CategorySingleBannerProducts
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BRAND_CAROUSEL) {
          return (
            <CategoryBrandCarousel
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER) {
          return (
            <CategoryImageHotspotBanner
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.CATEGORY_CONTENT) {
          return (
            <CategoryContentBlock
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.SPLIT_BANNER) {
          return (
            <CategorySplitBanner
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL) {
          return (
            <CategoryCircleImageCarousel
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.TRENDING_VIDEOS) {
          return (
            <TrendingVideoSection
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
