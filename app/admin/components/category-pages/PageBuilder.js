"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AdminLoader from "@/app/admin/components/AdminLoader";
import {
  COMPONENT_TYPES,
  getAvailableComponents,
  getComponentMeta,
  getInstanceLabels,
  PAGE_TYPE_LABELS,
  PAGE_TYPES,
} from "@/lib/categoryPageComponents/registry";
import TopBannerConfigForm from "./TopBannerConfigForm";
import ImageCarouselConfigForm from "./ImageCarouselConfigForm";
import ProductCarouselConfigForm from "./ProductCarouselConfigForm";
import BannerSideProductsConfigForm from "./BannerSideProductsConfigForm";
import BannerFourProductsConfigForm from "./BannerFourProductsConfigForm";
import BannerGridConfigForm from "./BannerGridConfigForm";
import ImageColumnsConfigForm from "./ImageColumnsConfigForm";
import SingleBannerProductsConfigForm from "./SingleBannerProductsConfigForm";
import BrandCarouselConfigForm from "./BrandCarouselConfigForm";
import ImageHotspotBannerConfigForm from "./ImageHotspotBannerConfigForm";
import CategoryContentConfigForm from "./CategoryContentConfigForm";
import SplitBannerConfigForm from "./SplitBannerConfigForm";
import CircleImageCarouselConfigForm from "./CircleImageCarouselConfigForm";

/**
 * Page Builder:
 * - Top Banner: one per page (carousel for many images)
 * - Future components: allowMultiple → add many instances, each on Order page
 */
export default function PageBuilder({
  listHref = "/admin/category-pages",
  listLabel = "Category Settings",
}) {
  const { id } = useParams();
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
      const res = await fetch(`/api/category-pages/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const available = getAvailableComponents("category");
  const components = page?.components || [];
  const isBrandPage = page?.pageType === PAGE_TYPES.BRAND;
  const isCategoryBrandPage = page?.pageType === PAGE_TYPES.CATEGORY_BRAND;
  const productOwnerType = isBrandPage
    ? "brand"
    : isCategoryBrandPage
      ? "category_brand"
      : "category";
  const instanceLabels = getInstanceLabels(components);
  const countByType = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});
  const topBannerInstance = components.find(
    (c) => c.type === COMPONENT_TYPES.TOP_BANNER
  );

  const selectComponent = (type) => {
    setMessage("");
    setConfigType(type);
    if (type === COMPONENT_TYPES.TOP_BANNER) {
      const topInst = components.find(
        (c) => c.type === COMPONENT_TYPES.TOP_BANNER
      );
      setConfigInstanceId(topInst ? topInst.instanceId : null);
    } else {
      setConfigInstanceId(null);
    }
  };

  const addNewTopBanner = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.TOP_BANNER }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.TOP_BANNER);
      setConfigInstanceId(data.instance?.instanceId || null);
      if (data.alreadyExists) {
        setMessage("Top Banner already exists. Opening it for editing.");
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewCarouselSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.IMAGE_CAROUSEL }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.IMAGE_CAROUSEL);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewBrandCarouselSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.BRAND_CAROUSEL }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.BRAND_CAROUSEL);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewImageHotspotBannerSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewCategoryContentSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.CATEGORY_CONTENT }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.CATEGORY_CONTENT);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewProductCarouselSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.PRODUCT_CAROUSEL }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.PRODUCT_CAROUSEL);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewBannerSideProductsSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.BANNER_SIDE_PRODUCTS }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.BANNER_SIDE_PRODUCTS);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewBannerFourProductsSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.BANNER_FOUR_PRODUCTS }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.BANNER_FOUR_PRODUCTS);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewBannerGridSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.BANNER_GRID }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.BANNER_GRID);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewImageColumnsSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.IMAGE_COLUMNS }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.IMAGE_COLUMNS);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewSingleBannerProductsSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewSplitBannerSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.SPLIT_BANNER }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.SPLIT_BANNER);
      setConfigInstanceId(data.instance?.instanceId || null);
    } catch (e) {
      alert(e.message);
    }
  };

  const addNewCircleCarouselSet = async () => {
    setMessage("");
    try {
      const res = await fetch(`/api/category-pages/${id}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setConfigType(COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL);
      setConfigInstanceId(data.instance?.instanceId || null);
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
        `/api/category-pages/${id}/components?instanceId=${encodeURIComponent(
          component.instanceId
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed");

      setPage(data.page);
      if (configInstanceId === component.instanceId) {
        setConfigInstanceId(null);
        setConfigType(null);
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
        <Link href={listHref} className="text-[#ED1C24] text-sm">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full py-4 box-border lg:h-[calc(100vh-var(--admin-header-height))] lg:overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <Link
            href={listHref}
            className="inline-flex items-center gap-1 text-sm text-gray-500 mb-2"
          >
            <Icon icon="mdi:arrow-left" /> {listLabel}
          </Link>
          <h1 className="text-2xl font-semibold">Page Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-800">
              {page.pageType === PAGE_TYPES.CATEGORY_BRAND
                ? `${page.categoryName} · ${page.brandName}`
                : page.categoryName}
            </span>
            {" · "}
            {PAGE_TYPE_LABELS[page.pageType] || page.pageType}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`${listHref}/${id}/order`)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          <Icon icon="mdi:drag" className="text-lg" />
          Drag &amp; Drop Order
        </button>
      </div>

      {message && (
        <div className="shrink-0 mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Component screenshot gallery — scrolls independently */}
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
                return (
                  <button
                    key={comp.type}
                    type="button"
                    onClick={() => selectComponent(comp.type)}
                    className={`w-full text-left rounded-xl border overflow-hidden transition hover:border-[#ED1C24] ${
                      configType === comp.type
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

        {/* Config / canvas — scrolls independently */}
        <div className="lg:col-span-2 lg:min-h-0 lg:overflow-y-auto overscroll-contain">
          <div className="bg-white rounded-xl border p-5 shadow-sm min-h-[320px]">
            {!configType ? (
              components.length === 0 ? (
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
              )
            ) : configType === COMPONENT_TYPES.TOP_BANNER &&
              !configInstanceId ? (
              <div>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-semibold">Top Banner</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Select an existing banner to edit it, or use Add New to
                      create the component.
                    </p>
                  </div>
                  {!topBannerInstance && (
                    <button
                      type="button"
                      onClick={addNewTopBanner}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D]"
                    >
                      <Icon icon="mdi:plus" />
                      Add New
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
                        onClick={() =>
                          setConfigInstanceId(topBannerInstance.instanceId)
                        }
                        className="text-sm font-semibold text-[#ED1C24] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteInstance(topBannerInstance)}
                        disabled={
                          deletingInstanceId === topBannerInstance.instanceId
                        }
                        className="text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingInstanceId === topBannerInstance.instanceId
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                    <Icon
                      icon="mdi:image-area"
                      className="mx-auto mb-2 text-3xl text-gray-400"
                    />
                    <p className="text-sm text-gray-600">
                      No Top Banner has been added.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Click Add New when you are ready to create it.
                    </p>
                  </div>
                )}
              </div>
            ) : configType === COMPONENT_TYPES.TOP_BANNER ? (
              <TopBannerConfigForm
                key={configInstanceId || "top-banner"}
                pageId={page._id}
                categoryId={
                  isCategoryBrandPage ? page._id : page.categoryId
                }
                ownerIdKey={isCategoryBrandPage ? "pageId" : "categoryId"}
                pageType={page.pageType}
                categoryName={
                  isCategoryBrandPage
                    ? `${page.categoryName} · ${page.brandName}`
                    : page.categoryName
                }
                onCancel={() => {
                  setConfigInstanceId(null);
                }}
                onSaved={() => {
                  setMessage("Top Banner carousel saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.IMAGE_CAROUSEL ? (
              <ImageCarouselConfigForm
                key={configInstanceId || "list"}
                pageId={page._id}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.IMAGE_CAROUSEL)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Image Carousel",
                  }))}
                onAddNew={addNewCarouselSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Image Carousel set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Image Carousel set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.PRODUCT_CAROUSEL ? (
              <ProductCarouselConfigForm
                key={configInstanceId || "product-list"}
                pageId={page._id}
                categoryId={page.categoryId}
                categoryName={page.categoryName}
                ownerType={productOwnerType}
                brandId={page.brandId}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.PRODUCT_CAROUSEL)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Product Carousel",
                  }))}
                onAddNew={addNewProductCarouselSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Product Carousel set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Product Carousel set saved.");
                  setConfigInstanceId(null);
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS ? (
              <BannerSideProductsConfigForm
                key={configInstanceId || "bsp-list"}
                pageId={page._id}
                categoryId={page.categoryId}
                categoryName={page.categoryName}
                ownerType={productOwnerType}
                brandId={page.brandId}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter(
                    (c) => c.type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS
                  )
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Banner + Side + Products",
                  }))}
                onAddNew={addNewBannerSideProductsSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Banner + Side + Products set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Banner + Side + Products set saved.");
                  setConfigInstanceId(null);
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS ? (
              <BannerFourProductsConfigForm
                key={configInstanceId || "bfp-list"}
                pageId={page._id}
                categoryId={page.categoryId}
                categoryName={page.categoryName}
                ownerType={productOwnerType}
                brandId={page.brandId}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter(
                    (c) => c.type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS
                  )
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Banner + 3/4 Images + Products",
                  }))}
                onAddNew={addNewBannerFourProductsSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Banner + 3/4 Images + Products set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Banner + 3/4 Images + Products set saved.");
                  setConfigInstanceId(null);
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.BANNER_GRID ? (
              <BannerGridConfigForm
                key={configInstanceId || "bg-list"}
                pageId={page._id}
                categoryId={page.categoryId}
                categoryName={page.categoryName}
                ownerType={productOwnerType}
                brandId={page.brandId}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.BANNER_GRID)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Banner Grid",
                  }))}
                onAddNew={addNewBannerGridSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Banner Grid set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Banner Grid set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.IMAGE_COLUMNS ? (
              <ImageColumnsConfigForm
                key={configInstanceId || "ic-list"}
                pageId={page._id}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.IMAGE_COLUMNS)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Image Columns",
                  }))}
                onAddNew={addNewImageColumnsSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Image Columns set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Image Columns set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS ? (
              <SingleBannerProductsConfigForm
                key={configInstanceId || "sbp-list"}
                pageId={page._id}
                categoryId={page.categoryId}
                categoryName={page.categoryName}
                ownerType={productOwnerType}
                brandId={page.brandId}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter(
                    (c) => c.type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS
                  )
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Single Banner + Products",
                  }))}
                onAddNew={addNewSingleBannerProductsSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Single Banner + Products set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Single Banner + Products set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.BRAND_CAROUSEL ? (
              <BrandCarouselConfigForm
                key={configInstanceId || "brand-list"}
                pageId={page._id}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.BRAND_CAROUSEL)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Brand Carousel",
                  }))}
                onAddNew={addNewBrandCarouselSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Brand Carousel set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Brand Carousel set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER ? (
              <ImageHotspotBannerConfigForm
                key={configInstanceId || "hotspot-list"}
                pageId={page._id}
                categoryName={page.categoryName}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter(
                    (c) => c.type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER
                  )
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Image Hotspot Banner",
                  }))}
                onAddNew={addNewImageHotspotBannerSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Image Hotspot Banner set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Image Hotspot Banner set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.CATEGORY_CONTENT ? (
              <CategoryContentConfigForm
                key={configInstanceId || "content-list"}
                pageId={page._id}
                categoryName={page.categoryName}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.CATEGORY_CONTENT)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Category Content",
                  }))}
                onAddNew={addNewCategoryContentSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Category Content deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Category Content saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.SPLIT_BANNER ? (
              <SplitBannerConfigForm
                key={configInstanceId || "split-list"}
                pageId={page._id}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.SPLIT_BANNER)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Single / Double Banner",
                  }))}
                onAddNew={addNewSplitBannerSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Single / Double Banner set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Single / Double Banner set saved.");
                  load();
                }}
              />
            ) : configType === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL ? (
              <CircleImageCarouselConfigForm
                key={configInstanceId || "cic-list"}
                pageId={page._id}
                instanceId={configInstanceId}
                setLabel={
                  configInstanceId
                    ? instanceLabels[configInstanceId]
                    : null
                }
                existingSets={[...components]
                  .filter((c) => c.type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => ({
                    instanceId: c.instanceId,
                    title: c.title || "",
                    label:
                      instanceLabels[c.instanceId] ||
                      c.title ||
                      "Circle Image Carousel",
                  }))}
                onAddNew={addNewCircleCarouselSet}
                onEditSet={(instanceId) => {
                  setConfigInstanceId(instanceId);
                  setMessage("");
                }}
                onDeleteSet={() => {
                  setMessage("Circle Image Carousel set deleted.");
                  load();
                }}
                onBackToList={() => {
                  setConfigInstanceId(null);
                  load();
                }}
                onSaved={() => {
                  setMessage("Circle Image Carousel set saved.");
                  load();
                }}
              />
            ) : (
              <p className="text-sm text-gray-500">
                Form for this component comes next. Instance:{" "}
                {configInstanceId || "—"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
