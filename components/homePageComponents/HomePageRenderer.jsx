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
import CategorySuperCategories from "@/components/categoryPageComponents/CategorySuperCategories";
import CategoryWhyBuyReasons from "@/components/categoryPageComponents/CategoryWhyBuyReasons";
import TrendingVideoSection from "@/components/TrendingVideoSection";
import DealOfTheDaySection from "@/components/homePageComponents/DealOfTheDaySection";
import { filterHomeInStockProducts } from "@/components/product/AvailableInStoreNotice";

// In-memory cache to prevent layout shift and avoid re-fetching on client navigation
const homeRenderCache = new Map();

/**
 * Renders Home Settings page-builder components in saved admin order.
 * Reuses the same storefront section UI as category overview pages.
 */
export default function HomePageRenderer({ onHasDesign }) {
  const { region } = useRegion();
  const targetRegion = (region || "all").toLowerCase();

  // Initialize consistently across SSR and Client to prevent any hydration mismatch
  const [components, setComponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const onHasDesignRef = useRef(onHasDesign);
  onHasDesignRef.current = onHasDesign;

  useEffect(() => {
    let cancelled = false;

    // Use client in-memory cache if available
    const cached = homeRenderCache.get(targetRegion);
    if (cached && cached.length > 0) {
      setComponents(cached);
      setLoaded(true);
      onHasDesignRef.current?.(true);
      return;
    }

    setLoaded(false);

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
      <div className="site-container bg-white pt-5 sm:pt-6" suppressHydrationWarning>
        {/* Banner Skeleton with matching aspect ratio - prevents CLS completely */}
        <div className="relative w-full overflow-hidden rounded-lg mb-5 sm:mb-6 min-h-[150px] sm:min-h-[260px] md:min-h-[320px] bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828]" />
        </div>
        {/* Category Carousel Skeleton placeholder */}
        <div className="w-full px-4 sm:px-6 mb-8">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="flex gap-3 overflow-hidden">
            <div className="h-[240px] sm:h-[290px] md:h-[340px] w-1/2 sm:w-1/3 md:w-1/5 bg-gray-100 rounded-[20px] animate-pulse shrink-0" />
            <div className="h-[240px] sm:h-[290px] md:h-[340px] w-1/2 sm:w-1/3 md:w-1/5 bg-gray-100 rounded-[20px] animate-pulse shrink-0" />
            <div className="hidden sm:block h-[240px] sm:h-[290px] md:h-[340px] sm:w-1/3 md:w-1/5 bg-gray-100 rounded-[20px] animate-pulse shrink-0" />
            <div className="hidden md:block h-[240px] sm:h-[290px] md:h-[340px] md:w-1/5 bg-gray-100 rounded-[20px] animate-pulse shrink-0" />
            <div className="hidden md:block h-[240px] sm:h-[290px] md:h-[340px] md:w-1/5 bg-gray-100 rounded-[20px] animate-pulse shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  if (!components.length) return null;

  return (
    <div className="home-page-builder w-full bg-white pt-5 sm:pt-6 md:pt-7" suppressHydrationWarning>
      {components.map((item, idx) => {
        if (item.type === COMPONENT_TYPES.TOP_BANNER) {
          return (
            <div key={item.instanceId || idx} className="site-container bg-white">
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
          const inStockProducts = filterHomeInStockProducts(item.config?.products);
          if (!inStockProducts.length) return null;
          return (
            <CategoryProductCarousel
              key={item.instanceId || idx}
              config={{ ...item.config, products: inStockProducts }}
              hideOutOfStock
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
          return (
            <CategoryBannerSideProducts
              key={item.instanceId || idx}
              config={{
                ...item.config,
                products: filterHomeInStockProducts(item.config?.products),
              }}
              hideOutOfStock
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
          return (
            <CategoryBannerFourProducts
              key={item.instanceId || idx}
              config={{
                ...item.config,
                products: filterHomeInStockProducts(item.config?.products),
              }}
              hideOutOfStock
            />
          );
        }
        if (item.type === COMPONENT_TYPES.BANNER_GRID) {
          return (
            <CategoryBannerGrid
              key={item.instanceId || idx}
              config={{
                ...item.config,
                products: filterHomeInStockProducts(item.config?.products),
              }}
              hideOutOfStock
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
          const inStockProducts = filterHomeInStockProducts(item.config?.products);
          if (!inStockProducts.length) return null;
          return (
            <CategorySingleBannerProducts
              key={item.instanceId || idx}
              config={{ ...item.config, products: inStockProducts }}
              hideOutOfStock
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
        if (item.type === COMPONENT_TYPES.SUPER_CATEGORIES) {
          return (
            <CategorySuperCategories
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.WHY_BUY_REASONS) {
          return (
            <CategoryWhyBuyReasons
              key={item.instanceId || idx}
              config={item.config}
            />
          );
        }
        if (item.type === COMPONENT_TYPES.DEAL_OF_THE_DAY) {
          return (
            <DealOfTheDaySection
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
