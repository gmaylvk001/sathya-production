import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";
import HomeTopBanner from "@/models/homeTopBanner";
import HomeImageCarousel from "@/models/homeImageCarousel";
import HomeProductCarousel from "@/models/homeProductCarousel";
import HomeBannerSideProducts from "@/models/homeBannerSideProducts";
import HomeBannerFourProducts from "@/models/homeBannerFourProducts";
import HomeBannerGrid from "@/models/homeBannerGrid";
import HomeImageColumns from "@/models/homeImageColumns";
import HomeSingleBannerProducts from "@/models/homeSingleBannerProducts";
import HomeBrandCarousel from "@/models/homeBrandCarousel";
import HomeImageHotspotBanner from "@/models/homeImageHotspotBanner";
import HomeContent from "@/models/homeContent";
import HomeSplitBanner from "@/models/homeSplitBanner";
import HomeCircleImageCarousel from "@/models/homeCircleImageCarousel";

export const HOME_CONFIG_MODELS = {
  [COMPONENT_TYPES.TOP_BANNER]: HomeTopBanner,
  [COMPONENT_TYPES.IMAGE_CAROUSEL]: HomeImageCarousel,
  [COMPONENT_TYPES.PRODUCT_CAROUSEL]: HomeProductCarousel,
  [COMPONENT_TYPES.BANNER_SIDE_PRODUCTS]: HomeBannerSideProducts,
  [COMPONENT_TYPES.BANNER_FOUR_PRODUCTS]: HomeBannerFourProducts,
  [COMPONENT_TYPES.BANNER_GRID]: HomeBannerGrid,
  [COMPONENT_TYPES.IMAGE_COLUMNS]: HomeImageColumns,
  [COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS]: HomeSingleBannerProducts,
  [COMPONENT_TYPES.BRAND_CAROUSEL]: HomeBrandCarousel,
  [COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER]: HomeImageHotspotBanner,
  [COMPONENT_TYPES.CATEGORY_CONTENT]: HomeContent,
  [COMPONENT_TYPES.SPLIT_BANNER]: HomeSplitBanner,
  [COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL]: HomeCircleImageCarousel,
};

export function getHomeConfigModel(type) {
  return HOME_CONFIG_MODELS[type] || null;
}
