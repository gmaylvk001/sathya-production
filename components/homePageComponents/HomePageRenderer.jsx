"use client";

import { useEffect, useRef, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";
import CategoryTopBanner from "@/components/categoryPageComponents/categoryTopbanner";
import CategoryImageCarousel from "@/components/categoryPageComponents/categoryImageCarousel";
import CategoryProductCarousel from "@/components/categoryPageComponents/categoryProductCarousel";
import CategoryBannerSideProducts from "@/components/categoryPageComponents/categoryBannerSideProducts";
import CategoryBannerFourProducts from "@/components/categoryPageComponents/categoryBannerFourProducts";
import CategoryBannerGrid from "@/components/categoryPageComponents/categoryBannerGrid";
import CategoryImageColumns from "@/components/categoryPageComponents/categoryImageColumns";
import CategorySingleBannerProducts from "@/components/categoryPageComponents/categorySingleBannerProducts";
import CategoryBrandCarousel from "@/components/categoryPageComponents/categoryBrandCarousel";
import CategoryImageHotspotBanner from "@/components/categoryPageComponents/categoryImageHotspotBanner";
import CategoryContentBlock from "@/components/categoryPageComponents/categoryContent";
import CategorySplitBanner from "@/components/categoryPageComponents/categorySplitBanner";
import CategoryCircleImageCarousel from "@/components/categoryPageComponents/categoryCircleImageCarousel";
import TrendingVideoSection from "@/components/TrendingVideoSection";

/**
 * Renders Home Settings page-builder components in saved admin order.
 * Reuses the same storefront section UI as category overview pages.
 */
export default function HomePageRenderer({ onHasDesign }) {
  const { region } = useRegion();
  const [components, setComponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const onHasDesignRef = useRef(onHasDesign);
  onHasDesignRef.current = onHasDesign;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    const load = async () => {
      try {
        const targetRegion = region || "all";
        const res = await fetch(
          `/api/home-pages/render?region=${encodeURIComponent(targetRegion)}`
        );
        const data = await res.json();
        if (cancelled) return;

        const list = data.success ? data.components || [] : [];
        setComponents(list);
        onHasDesignRef.current?.(list.length > 0);
      } catch (err) {
        console.error("HomePageRenderer:", err);
        if (!cancelled) {
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
  }, [region]);

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
