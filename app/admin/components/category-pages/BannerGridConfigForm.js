"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { buildProductSearchQuery } from "@/lib/categoryPageComponents/productSearchQuery";
import ProductFilterPicker from "./ProductFilterPicker";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const MIN_W = 1;
const MIN_H = 1;
const MAX_W = 600;
const MAX_H = 600;
const MIN_PRODUCTS = 6;

function productImageSrc(product) {
  const image = product?.images?.[0];
  if (!image) return "";
  return image.startsWith("http") ? image : `/uploads/products/${image}`;
}

function emptyBanner() {
  return {
    image: "",
    imageFile: null,
    imagePreview: "",
    url: "",
    width: null,
    height: null,
  };
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(img.src);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = URL.createObjectURL(file);
  });
}

function validateDimensions(width, height) {
  if (width > MAX_W || height > MAX_H) {
    return `Image must be below ${MAX_W}×${MAX_H}px. Got ${width}×${height}px.`;
  }
  if (width < MIN_W || height < MIN_H) {
    return `Invalid image size: ${width}×${height}px.`;
  }
  return null;
}

function readShowGap(value) {
  return value === true || value === "true" || value === 1;
}

/**
 * Admin: 2–4 equal-size banners with URL links.
 */
export default function BannerGridConfigForm({
  pageId,
  categoryId,
  categoryName,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-banner-grid",
  searchApiBase = "/api/category-product-carousel/search",
  ownerType = "category",
  brandId,
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [showGap, setShowGap] = useState(false);
  const [imageCount, setImageCount] = useState(4);
  const [banners, setBanners] = useState(
    Array.from({ length: 4 }, emptyBanner)
  );
  const [productName, setProductName] = useState("");
  const [seeAllLink, setSeeAllLink] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const referenceDims = useRef(null);

  useEffect(() => {
    if (!instanceId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${apiBase}?instanceId=${instanceId}`
        );
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          const count = [2, 3, 4].includes(d.imageCount) ? d.imageCount : 4;
          setName(d.name || "");
          setStatus(d.status || "active");
          setShowGap(readShowGap(d.showGap));
          setImageCount(count);
          setProductName(d.productName || "");
          setSeeAllLink(d.seeAllLink || "");
          setSelected(data.products || []);
          const rows = [...(d.banners || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setBanners(
            Array.from({ length: 4 }, (_, i) => {
              const b = rows[i];
              return b
                ? {
                    image: b.image || "",
                    imageFile: null,
                    imagePreview: b.image || "",
                    url: b.url || "",
                    width: null,
                    height: null,
                  }
                : emptyBanner();
            })
          );
          referenceDims.current = null;
        } else {
          setName("");
          setImageCount(4);
          setShowGap(false);
          setBanners(Array.from({ length: 4 }, emptyBanner));
          setProductName("");
          setSeeAllLink("");
          setSelected([]);
          setStatus("active");
          referenceDims.current = null;
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId]);

  const addProduct = (product) => {
    setSelected((current) => [...current, product]);
  };

  const addMultipleProducts = (list) => {
    setSelected((current) => [...current, ...list]);
  };

  const removeProduct = (productId) => {
    setSelected((current) =>
      current.filter((product) => String(product._id) !== String(productId))
    );
  };

  const moveProduct = (index, direction) => {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleImageCountChange = (count) => {
    setImageCount(count);
    setError("");
  };

  const updateBanner = (index, patch) => {
    setBanners((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const pickBannerImage = async (index, file) => {
    if (!file) return;
    setError("");

    // Keep the selected file immediately. Browser-side dimension decoding can
    // fail for valid formats (notably AVIF on some systems), but the server can
    // still process them with Sharp.
    const imagePreview = URL.createObjectURL(file);
    updateBanner(index, {
      imageFile: file,
      imagePreview,
      width: null,
      height: null,
    });

    try {
      const { width, height } = await readImageDimensions(file);
      const dimErr = validateDimensions(width, height);
      if (dimErr) {
        setError(dimErr);
      }

      if (referenceDims.current) {
        const ref = referenceDims.current;
        if (ref.width !== width || ref.height !== height) {
          setError(
            `All images must be the same height and width. Expected ${ref.width}×${ref.height}px, got ${width}×${height}px.`
          );
        }
      } else {
        for (let i = 0; i < imageCount; i++) {
          if (i === index) continue;
          const b = banners[i];
          if (b.width && b.height) {
            if (b.width !== width || b.height !== height) {
              setError(
                `All images must be the same height and width. Image ${i + 1} is ${b.width}×${b.height}px.`
              );
            }
            referenceDims.current = { width: b.width, height: b.height };
            break;
          }
        }
        if (!referenceDims.current) {
          referenceDims.current = { width, height };
        }
      }

      updateBanner(index, {
        width,
        height,
      });
    } catch {
      // Preview and upload remain valid even when the browser cannot inspect
      // dimensions; server-side image validation still runs on save.
    }
  };

  const handleDeleteSet = async (setInstanceId, label) => {
    if (
      !window.confirm(
        `Delete "${label || "this set"}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(setInstanceId);
    setError("");
    try {
      const res = await fetch(
        `${apiBase}?instanceId=${encodeURIComponent(setInstanceId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed");
      onDeleteSet?.(setInstanceId);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    for (let i = 0; i < imageCount; i++) {
      if (!banners[i].imagePreview && !banners[i].image) {
        setError(`Banner image ${i + 1} is required.`);
        return;
      }
    }
    if (productName.trim() || selected.length > 0) {
      if (!productName.trim()) {
        setError("Enter a products name for the selected products.");
        return;
      }
      if (selected.length < MIN_PRODUCTS) {
        setError(`Add at least ${MIN_PRODUCTS} products, or leave the product section empty.`);
        return;
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("productName", productName.trim());
      fd.append("seeAllLink", seeAllLink.trim());
      fd.append("status", status);
      fd.append("showGap", showGap ? "true" : "false");
      fd.append("imageCount", String(imageCount));
      fd.append(
        "bannersMeta",
        JSON.stringify(
          banners.slice(0, imageCount).map((b) => ({
            image: b.image || "",
            url: b.url || "",
          }))
        )
      );
      banners.slice(0, imageCount).forEach((b, i) => {
        if (b.imageFile) fd.append(`bannerImage_${i}`, b.imageFile);
      });
      fd.append(
        "productIds",
        JSON.stringify(selected.map((product) => product._id))
      );

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      if (data.data) {
        setShowGap(readShowGap(data.data.showGap));
      }
      onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const visibleBanners = banners.slice(0, imageCount);

  if (isListMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Banner Grid (2–4) + Products
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add 2, 3, or 4 banners with an optional product row for{" "}
              <span className="font-medium text-gray-700">
                {categoryName || "this category"}
              </span>
              .
            </p>
            <p className="text-sm font-medium text-[#ED1C24] mt-2">
              All images must be the same height and width and below 600×600px.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-3 py-2 text-sm font-medium text-white hover:bg-[#C4161D]"
          >
            <Icon icon="mdi:plus" className="text-base" />
            ADD NEW
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {existingSets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
            No banner grid sets yet. Click <strong>ADD NEW</strong>.
          </div>
        ) : (
          <ul className="space-y-2">
            {existingSets.map((s) => (
              <li
                key={s.instanceId}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50/60"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {s.label}
                  </div>
                  {s.title ? (
                    <div className="text-xs text-gray-500 mt-0.5">{s.title}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSet?.(s.instanceId)}
                    className="text-sm font-medium text-[#ED1C24] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === s.instanceId}
                    onClick={() => handleDeleteSet(s.instanceId, s.label)}
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === s.instanceId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-1 text-xs text-gray-500 mb-1 hover:text-gray-800"
          >
            <Icon icon="mdi:arrow-left" /> Back to sets
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {setLabel || "New Banner Grid"}
          </h3>
          <p className="text-sm font-medium text-[#ED1C24] mt-2">
            All images must be the same height and width and below 600×600px.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-3 py-2 text-sm font-medium text-white hover:bg-[#C4161D]"
        >
          <Icon icon="mdi:plus" className="text-base" />
          ADD NEW
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Featured Offers"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Gap between images
        </label>
        <p className="text-xs text-gray-500 mb-3">
          ON shows space between banners. OFF displays banners with no gap.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGap(true)}
            className={`rounded-lg border px-6 py-2 text-sm font-semibold transition ${
              showGap
                ? "border-[#ED1C24] bg-[#ED1C24] text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            ON
          </button>
          <button
            type="button"
            onClick={() => setShowGap(false)}
            className={`rounded-lg border px-6 py-2 text-sm font-semibold transition ${
              !showGap
                ? "border-[#ED1C24] bg-[#ED1C24] text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            OFF
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of banners *
        </label>
        <div className="flex gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleImageCountChange(n)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                imageCount === n
                  ? "border-[#ED1C24] bg-[#ED1C24] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {n} images
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <h4 className="text-sm font-semibold text-gray-900">
          Banner images &amp; links
        </h4>
        <div
          className={`grid gap-3 ${
            imageCount === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : imageCount === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {visibleBanners.map((banner, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
            >
              <div className="text-xs font-semibold text-gray-700">
                Banner {index + 1}
              </div>
              <input
                type="text"
                value={banner.url}
                onChange={(e) => updateBanner(index, { url: e.target.value })}
                placeholder="URL / slug"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="file"
                accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                onChange={(e) => {
                  const { file, error } = consumeAllowedCategoryPageImage(
                    e.target.files?.[0],
                    e.target
                  );
                  if (error) {
                    setError(error);
                    return;
                  }
                  pickBannerImage(index, file);
                }}
                className="block w-full text-sm"
              />
              <p className="text-[10px] text-gray-400">
                {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
              </p>
              {banner.width && banner.height ? (
                <p className="text-[10px] text-gray-500">
                  {banner.width}×{banner.height}px
                </p>
              ) : null}
              {banner.imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner.imagePreview}
                  alt=""
                  className="mt-1 w-full max-h-[120px] object-contain rounded border bg-gray-50"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Products name (optional)
          </label>
          <input
            type="text"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="e.g. Featured Products"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            See All link / slug (optional)
          </label>
          <input
            type="text"
            value={seeAllLink}
            onChange={(event) => setSeeAllLink(event.target.value)}
            placeholder="/category/mobiles or mobiles/smartphones"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Used by the See All button. Path starting with / or a category slug.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add products (optional; minimum {MIN_PRODUCTS} when used)
          </label>
          <ProductFilterPicker
            selected={selected}
            onAddProduct={addProduct}
            onAddMultipleProducts={addMultipleProducts}
            defaultCategoryId={categoryId}
            ownerType={ownerType}
            brandId={brandId}
            searchApiBase={searchApiBase}
          />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-1">
            Selected products ({selected.length}/{MIN_PRODUCTS} min)
          </h4>
          {selected.length === 0 ? (
            <p className="text-xs text-gray-500">No products added yet.</p>
          ) : (
            <ul className="space-y-2">
              {selected.map((product, index) => (
                <li
                  key={product._id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-white"
                >
                  {productImageSrc(product) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productImageSrc(product)}
                      alt=""
                      className="h-12 w-12 object-contain bg-white border rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded" />
                  )}
                  <div className="flex-1 min-w-0 text-sm font-medium line-clamp-2">
                    {product.name}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveProduct(index, -1)}
                      className="text-xs text-gray-500"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProduct(index, 1)}
                      className="text-xs text-gray-500"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(product._id)}
                    className="text-xs text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={status === "active"}
            onChange={(e) =>
              setStatus(e.target.checked ? "active" : "inactive")
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
        <span className="text-sm font-medium">Set Active</span>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ED1C24] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
