"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AdminLoader from "@/app/admin/components/AdminLoader";
import {
  COMPONENT_TYPES,
  getAvailableComponents,
  getComponentMeta,
  getInstanceLabels,
} from "@/lib/categoryPageComponents/registry";
import TopBannerConfigForm from "../category-pages/TopBannerConfigForm";
import ImageCarouselConfigForm from "../category-pages/ImageCarouselConfigForm";
import ProductCarouselConfigForm from "../category-pages/ProductCarouselConfigForm";
import BannerSideProductsConfigForm from "../category-pages/BannerSideProductsConfigForm";
import BannerFourProductsConfigForm from "../category-pages/BannerFourProductsConfigForm";
import BannerGridConfigForm from "../category-pages/BannerGridConfigForm";
import ImageColumnsConfigForm from "../category-pages/ImageColumnsConfigForm";
import SingleBannerProductsConfigForm from "../category-pages/SingleBannerProductsConfigForm";
import BrandCarouselConfigForm from "../category-pages/BrandCarouselConfigForm";
import ImageHotspotBannerConfigForm from "../category-pages/ImageHotspotBannerConfigForm";
import CategoryContentConfigForm from "../category-pages/CategoryContentConfigForm";
import SplitBannerConfigForm from "../category-pages/SplitBannerConfigForm";
import CircleImageCarouselConfigForm from "../category-pages/CircleImageCarouselConfigForm";
import SuperCategoriesConfigForm from "../category-pages/SuperCategoriesConfigForm";
import WhyBuyReasonsConfigForm from "../category-pages/WhyBuyReasonsConfigForm";
import TrendingVideosConfigForm from "./TrendingVideosConfigForm";
import DealOfTheDayConfigForm from "./DealOfTheDayConfigForm";
import HeroGridConfigForm from "./HeroGridConfigForm";

export default function HomePageBuilder() {
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configType, setConfigType] = useState(null);
  const [configInstanceId, setConfigInstanceId] = useState(null);
  const [deletingInstanceId, setDeletingInstanceId] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/home-pages");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isHeroGridType = (type) =>
    type === COMPONENT_TYPES.HERO_GRID_BIG_LEFT ||
    type === COMPONENT_TYPES.HERO_GRID_BIG_RIGHT;

  const isTopBannerFamily = (type) =>
    type === COMPONENT_TYPES.TOP_BANNER || isHeroGridType(type);

  const id = page?._id;
  const available = getAvailableComponents("home").filter((c) => !c.hideInSidebar);
  const components = page?.components || [];
  const instanceLabels = getInstanceLabels(components);
  const countByType = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});
  const topBannerInstance = components.find(
    (c) => c.type === COMPONENT_TYPES.TOP_BANNER
  );
  const heroBigLeftInstances = [...components]
    .filter((c) => c.type === COMPONENT_TYPES.HERO_GRID_BIG_LEFT)
    .sort((a, b) => a.order - b.order);
  const heroBigRightInstances = [...components]
    .filter((c) => c.type === COMPONENT_TYPES.HERO_GRID_BIG_RIGHT)
    .sort((a, b) => a.order - b.order);
  const trendingVideosInstance = components.find(
    (c) => c.type === COMPONENT_TYPES.TRENDING_VIDEOS
  );

  const selectComponent = (type) => {
    setMessage("");
    setConfigType(type);
    setConfigInstanceId(null);
  };

  const addNewInstance = async (type) => {
    if (!id) return;
    setMessage("");
    try {
      const res = await fetch(`/api/home-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(type);
      setConfigInstanceId(data.instance?.instanceId || null);
      if (data.alreadyExists) {
        setMessage(`${getComponentMeta(type)?.label || type} already exists. Opening it for editing.`);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const openEditInstance = (c) => {
    setConfigType(c.type);
    setConfigInstanceId(c.instanceId);
    setMessage("");
  };

  const deleteInstance = async (component) => {
    if (!id) return;
    const label =
      instanceLabels[component.instanceId] ||
      getComponentMeta(component.type)?.label ||
      "this component";
    if (
      !window.confirm(
        `Delete "${label}"? Its saved configuration will also be removed. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingInstanceId(component.instanceId);
    setMessage("");
    try {
      const res = await fetch(
        `/api/home-pages/${id}/components?instanceId=${encodeURIComponent(
          component.instanceId
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed");

      setPage(data.page);
      if (configInstanceId === component.instanceId) {
        setConfigInstanceId(null);
        setConfigType(isHeroGridType(component.type) ? COMPONENT_TYPES.TOP_BANNER : null);
      }
      setMessage(`${label} deleted.`);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingInstanceId(null);
    }
  };

  if (loading) {
    return <AdminLoader />;
  }

  if (error || !page) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Not found"}</p>
      </div>
    );
  }

  const renderConfigForm = () => {
    if (!configType) {
      return components.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">
          <Icon
            icon="mdi:view-dashboard-outline"
            className="mx-auto text-4xl text-gray-300 mb-2"
          />
          <p className="text-gray-600 font-medium">
            Select a component screenshot on the left to configure inputs.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            On this page: 0 component instance(s)
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="text-center pb-4 mb-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-600">
              Select a component screenshot on the left to configure inputs.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              On this page: {components.length} component instance(s)
            </p>
          </div>
          <ul className="space-y-2 w-full">
            {[...components]
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <li
                  key={c.instanceId}
                  className="flex items-center justify-between gap-3 text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/60 hover:bg-gray-50 transition"
                >
                  <span className="font-medium text-gray-800">
                    {instanceLabels[c.instanceId] ||
                      getComponentMeta(c.type)?.label ||
                      c.type}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${c.isActive !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                        }`}
                    >
                      {c.isActive !== false ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      className="text-[#ED1C24] text-xs font-semibold hover:underline"
                      onClick={() => openEditInstance(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => deleteInstance(c)}
                      disabled={deletingInstanceId === c.instanceId}
                    >
                      {deletingInstanceId === c.instanceId
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      );
    }

    const commonProps = (type, label) => ({
      pageId: page._id,
      instanceId: configInstanceId,
      setLabel: configInstanceId ? instanceLabels[configInstanceId] : null,
      existingSets: [...components]
        .filter((c) => c.type === type)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          instanceId: c.instanceId,
          title: c.title || "",
          label: instanceLabels[c.instanceId] || c.title || label,
        })),
      onAddNew: () => addNewInstance(type),
      onEditSet: (iid) => { setConfigInstanceId(iid); setMessage(""); },
      onDeleteSet: () => { setMessage(`${label} set deleted.`); load(); },
      onBackToList: () => { setConfigInstanceId(null); load(); },
      onSaved: () => { setMessage(`${label} set saved.`); setConfigInstanceId(null); load(); },
    });

    const renderHeroGridSection = ({ type, title, subtitle, variant, instances }) => {
      const isBigRight = variant === "big-right";
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                aria-hidden="true"
                className={`shrink-0 grid h-10 w-16 grid-rows-2 gap-0.5 rounded-md border border-gray-200 bg-white p-1 ${
                  isBigRight ? "grid-cols-[1fr_1.9fr]" : "grid-cols-[1.9fr_1fr]"
                }`}
              >
                <div
                  className={`rounded-[2px] bg-[#ED1C24]/85 row-span-2 ${
                    isBigRight ? "col-start-2 row-start-1" : "col-start-1 row-start-1"
                  }`}
                />
                <div
                  className={`rounded-[2px] bg-gray-300 ${
                    isBigRight ? "col-start-1 row-start-1" : "col-start-2 row-start-1"
                  }`}
                />
                <div
                  className={`rounded-[2px] bg-gray-300 ${
                    isBigRight ? "col-start-1 row-start-2" : "col-start-2 row-start-2"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => addNewInstance(type)}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#ED1C24] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C4161D]"
            >
              <Icon icon="mdi:plus" /> Add New
            </button>
          </div>

          {instances.length > 0 ? (
            <ul className="space-y-2">
              {instances.map((inst) => (
                <li
                  key={inst.instanceId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {instanceLabels[inst.instanceId] || title}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${
                        inst.isActive !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {inst.isActive !== false ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditInstance(inst)}
                      className="text-sm font-semibold text-[#ED1C24] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteInstance(inst)}
                      disabled={deletingInstanceId === inst.instanceId}
                      className="text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingInstanceId === inst.instanceId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">
              No {title} set configured yet. Click Add New to upload 3 banners.
            </p>
          )}
        </div>
      );
    };

    if (isTopBannerFamily(configType) && !configInstanceId) {
      return (
        <div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Top Banner</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the existing banner to edit it, or Add New.
              </p>
            </div>
            {!topBannerInstance && (
              <button
                type="button"
                onClick={() => addNewInstance(COMPONENT_TYPES.TOP_BANNER)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D]"
              >
                <Icon icon="mdi:plus" /> Add New
              </button>
            )}
          </div>
          {topBannerInstance ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Top Banner</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  One banner carousel is configured for this page.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfigInstanceId(topBannerInstance.instanceId)}
                  className="text-sm font-semibold text-[#ED1C24] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteInstance(topBannerInstance)}
                  disabled={deletingInstanceId === topBannerInstance.instanceId}
                  className="text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingInstanceId === topBannerInstance.instanceId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <Icon icon="mdi:image-area" className="mx-auto mb-2 text-3xl text-gray-400" />
              <p className="text-sm text-gray-600">No Top Banner has been added.</p>
              <p className="mt-1 text-xs text-gray-400">Click Add New when you are ready to create it.</p>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {renderHeroGridSection({
              type: COMPONENT_TYPES.HERO_GRID_BIG_LEFT,
              title: "Hero Grid - Big Left",
              subtitle: "1 Large Banner Left (66%) + 2 Small Banners stacked Right (34%).",
              variant: "big-left",
              instances: heroBigLeftInstances,
            })}
            {renderHeroGridSection({
              type: COMPONENT_TYPES.HERO_GRID_BIG_RIGHT,
              title: "Hero Grid - Big Right",
              subtitle: "2 Small Banners stacked Left (34%) + 1 Large Banner Right (66%).",
              variant: "big-right",
              instances: heroBigRightInstances,
            })}
          </div>
        </div>
      );
    }

    if (configType === COMPONENT_TYPES.TOP_BANNER) {
      return (
        <TopBannerConfigForm
          key={configInstanceId}
          categoryId={page._id}
          pageType="home"
          categoryName="Home Page"
          apiBase="/api/home-topbanner"
          ownerIdKey="pageId"
          onCancel={() => setConfigInstanceId(null)}
          onSaved={() => { setMessage("Top Banner carousel saved."); setConfigInstanceId(null); load(); }}
        />
      );
    }

    if (configType === COMPONENT_TYPES.TRENDING_VIDEOS && !configInstanceId) {
      return (
        <div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Instagram Feed Carousel</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage Instagram reels &amp; posts displayed in the homepage carousel.
              </p>
            </div>
            {!trendingVideosInstance && (
              <button
                type="button"
                onClick={() => addNewInstance(COMPONENT_TYPES.TRENDING_VIDEOS)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D]"
              >
                <Icon icon="mdi:plus" /> Add New
              </button>
            )}
          </div>
          {trendingVideosInstance ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Instagram Feed Carousel</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {trendingVideosInstance.title || "Instagram Feed"} &bull; Configured on home page.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfigInstanceId(trendingVideosInstance.instanceId)}
                  className="text-sm font-semibold text-[#ED1C24] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteInstance(trendingVideosInstance)}
                  disabled={deletingInstanceId === trendingVideosInstance.instanceId}
                  className="text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingInstanceId === trendingVideosInstance.instanceId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <Icon icon="mdi:instagram" className="mx-auto mb-2 text-3xl text-gray-400" />
              <p className="text-sm text-gray-600">No Instagram Feed Carousel has been added.</p>
              <p className="mt-1 text-xs text-gray-400">Click Add New when you are ready to create it.</p>
            </div>
          )}
        </div>
      );
    }

    if (configType === COMPONENT_TYPES.TRENDING_VIDEOS) {
      return (
        <TrendingVideosConfigForm
          key={configInstanceId}
          pageId={page._id}
          instanceId={configInstanceId}
          initialTitle={trendingVideosInstance?.title || "Instagram Feed"}
          onBackToList={() => { setConfigInstanceId(null); load(); }}
          onSaved={() => { setMessage("Instagram Feed Carousel saved."); load(); }}
        />
      );
    }

    const heroGridExtra = (variant, label) => {
      const returnToTopBanner = (msg) => {
        if (msg) setMessage(msg);
        setConfigInstanceId(null);
        setConfigType(COMPONENT_TYPES.TOP_BANNER);
        load();
      };
      return {
        variant,
        backLabel: "Back to Top Banner",
        onBackToList: () => returnToTopBanner(),
        onSaved: () => returnToTopBanner(`${label} saved.`),
        onDeleteSet: () => returnToTopBanner(`${label} deleted.`),
      };
    };

    const formMap = {
      [COMPONENT_TYPES.IMAGE_CAROUSEL]: {
        Form: ImageCarouselConfigForm,
        label: "Image Carousel",
        extra: { apiBase: "/api/home-image-carousel" },
      },
      [COMPONENT_TYPES.PRODUCT_CAROUSEL]: {
        Form: ProductCarouselConfigForm,
        label: "Product Carousel",
        extra: {
          categoryId: page._id,
          categoryName: "Home Page",
          apiBase: "/api/home-product-carousel",
          searchApiBase: "/api/home-product-carousel/search",
        },
      },
      [COMPONENT_TYPES.BANNER_SIDE_PRODUCTS]: {
        Form: BannerSideProductsConfigForm,
        label: "Banner + Side + Products",
        extra: {
          categoryId: page._id,
          categoryName: "Home Page",
          apiBase: "/api/home-banner-side-products",
          searchApiBase: "/api/home-product-carousel/search",
        },
      },
      [COMPONENT_TYPES.BANNER_FOUR_PRODUCTS]: {
        Form: BannerFourProductsConfigForm,
        label: "Banner + 3/4 Images + Products",
        extra: {
          categoryId: page._id,
          categoryName: "Home Page",
          apiBase: "/api/home-banner-four-products",
          searchApiBase: "/api/home-product-carousel/search",
        },
      },
      [COMPONENT_TYPES.BANNER_GRID]: {
        Form: BannerGridConfigForm,
        label: "Banner Grid",
        extra: {
          categoryId: page._id,
          categoryName: "Home Page",
          apiBase: "/api/home-banner-grid",
          searchApiBase: "/api/home-product-carousel/search",
        },
      },
      [COMPONENT_TYPES.IMAGE_COLUMNS]: {
        Form: ImageColumnsConfigForm,
        label: "Image Columns",
        extra: { apiBase: "/api/home-image-columns" },
      },
      [COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS]: {
        Form: SingleBannerProductsConfigForm,
        label: "Single Banner + Products",
        extra: {
          categoryId: page._id,
          categoryName: "Home Page",
          apiBase: "/api/home-single-banner-products",
          searchApiBase: "/api/home-product-carousel/search",
        },
      },
      [COMPONENT_TYPES.BRAND_CAROUSEL]: {
        Form: BrandCarouselConfigForm,
        label: "Brand Carousel",
        extra: {
          apiBase: "/api/home-brand-carousel",
          autoBrandsScope: "all",
        },
      },
      [COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER]: {
        Form: ImageHotspotBannerConfigForm,
        label: "Image Hotspot Banner",
        extra: {
          categoryName: "Home Page",
          apiBase: "/api/home-image-hotspot-banner",
        },
      },
      [COMPONENT_TYPES.CATEGORY_CONTENT]: {
        Form: CategoryContentConfigForm,
        label: "Category Content",
        extra: {
          categoryName: "Home Page",
          apiBase: "/api/home-content",
        },
      },
      [COMPONENT_TYPES.SPLIT_BANNER]: {
        Form: SplitBannerConfigForm,
        label: "Single / Double Banner",
        extra: { apiBase: "/api/home-split-banner" },
      },
      [COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL]: {
        Form: CircleImageCarouselConfigForm,
        label: "Category Cards Carousel",
        extra: { apiBase: "/api/home-circle-image-carousel" },
      },
      [COMPONENT_TYPES.SUPER_CATEGORIES]: {
        Form: SuperCategoriesConfigForm,
        label: "Super Categories Matrix",
        extra: { apiBase: "/api/home-super-categories" },
      },
      [COMPONENT_TYPES.WHY_BUY_REASONS]: {
        Form: WhyBuyReasonsConfigForm,
        label: "Why Buy From Sathya",
        extra: { apiBase: "/api/home-why-buy-reasons" },
      },
      [COMPONENT_TYPES.DEAL_OF_THE_DAY]: {
        Form: DealOfTheDayConfigForm,
        label: "Deal of the Day",
        extra: { apiBase: "/api/home-deal-of-the-day" },
      },
      [COMPONENT_TYPES.HERO_GRID_BIG_LEFT]: {
        Form: HeroGridConfigForm,
        label: "Hero Grid - Big Left",
        extra: heroGridExtra("big-left", "Hero Grid - Big Left"),
      },
      [COMPONENT_TYPES.HERO_GRID_BIG_RIGHT]: {
        Form: HeroGridConfigForm,
        label: "Hero Grid - Big Right",
        extra: heroGridExtra("big-right", "Hero Grid - Big Right"),
      },
    };

    const entry = formMap[configType];
    if (entry) {
      const { Form, label, extra = {} } = entry;
      return (
        <Form
          key={configInstanceId || `${configType}-list`}
          {...commonProps(configType, label)}
          {...extra}
        />
      );
    }

    return (
      <p className="text-sm text-gray-500">
        Form for this component comes next. Instance: {configInstanceId || "—"}
      </p>
    );
  };

  return (
    <div className="flex flex-col w-full py-4 box-border lg:h-[calc(100vh-var(--admin-header-height))] lg:overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Home Page Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add, configure, and order components for the home page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/admin/homesettings/order`)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            <Icon icon="mdi:drag" className="text-lg" />
            Drag &amp; Drop Order
          </button>
        </div>
      </div>

      {message && (
        <div className="shrink-0 mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="lg:col-span-1 flex flex-col max-h-[42vh] lg:max-h-none lg:min-h-0 lg:h-full overflow-hidden">
          <div className="bg-white rounded-xl border p-4 shadow-sm flex flex-col min-h-0 h-full overflow-hidden">
            <div className="shrink-0 mb-4">
              <h2 className="text-sm font-semibold mb-1">Components</h2>
              <p className="text-xs text-gray-500">
                Select a component to view its existing sets. A component is
                created only after you click Add New.
              </p>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 overscroll-contain">
              {available.map((comp) => {
                const count = countByType[comp.type] || 0;
                const added = count > 0;
                const isSelected =
                  comp.type === COMPONENT_TYPES.TOP_BANNER
                    ? isTopBannerFamily(configType)
                    : configType === comp.type;
                return (
                  <button
                    key={comp.type}
                    type="button"
                    onClick={() => selectComponent(comp.type)}
                    className={`w-full text-left rounded-xl border overflow-hidden transition hover:border-[#ED1C24] ${
                      isSelected
                        ? "border-[#ED1C24] ring-1 ring-[#ED1C24]"
                        : "border-gray-200"
                      }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={comp.preview}
                      alt={comp.label}
                      className="w-full h-24 object-cover bg-gray-100"
                    />
                    <div className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{comp.label}</div>
                        <div className="text-[11px] text-gray-500 line-clamp-2">
                          {comp.description}
                        </div>
                        {comp.allowMultiple && (
                          <div className="text-[10px] text-[#ED1C24] mt-1">
                            Can add multiple sets
                          </div>
                        )}
                      </div>
                      {added && (
                        <span className="shrink-0 text-[10px] uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {comp.allowMultiple
                            ? `${count} set${count > 1 ? "s" : ""}`
                            : "Added"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 lg:min-h-0 lg:overflow-y-auto overscroll-contain">
          <div className="bg-white rounded-xl border p-5 shadow-sm min-h-[320px]">
            {renderConfigForm()}
          </div>
        </div>
      </div>
    </div>
  );
}
