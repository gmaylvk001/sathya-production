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

const MIN_TILE_COUNT = 3;
const MAX_TILE_COUNT = 4;

function emptyTile() {
  return {
    image: "",
    imageFile: null,
    imagePreview: "",
    url: "",
  };
}

function productImageSrc(product) {
  const img = product?.images?.[0];
  if (!img) return "";
  return img.startsWith("http") ? img : `/uploads/products/${img}`;
}

/**
 * Admin: top banner + 3 or 4 tiles + BG color + related products.
 * See All on storefront uses banner URL.
 */
export default function BannerFourProductsConfigForm({
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
  apiBase = "/api/category-banner-four-products",
  searchApiBase = "/api/category-product-carousel/search",
  ownerType = "category",
  brandId,
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [bannerUrl, setBannerUrl] = useState("");
  const [tilesBgColor, setTilesBgColor] = useState("#0d9488");
  const [bannerDesktop, setBannerDesktop] = useState("");
  const [bannerMobile, setBannerMobile] = useState("");
  const [bannerDesktopPreview, setBannerDesktopPreview] = useState("");
  const [bannerMobilePreview, setBannerMobilePreview] = useState("");
  const [bannerDesktopFile, setBannerDesktopFile] = useState(null);
  const [bannerMobileFile, setBannerMobileFile] = useState(null);
  const [tileCount, setTileCount] = useState(MAX_TILE_COUNT);
  const [tiles, setTiles] = useState(
    Array.from({ length: MAX_TILE_COUNT }, emptyTile)
  );
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

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
          setName(d.name || "");
          setStatus(d.status || "active");
          setBannerUrl(d.bannerUrl || "");
          setTilesBgColor(d.tilesBgColor || "#0d9488");
          setBannerDesktop(d.bannerDesktop || "");
          setBannerMobile(d.bannerMobile || "");
          setBannerDesktopPreview(d.bannerDesktop || "");
          setBannerMobilePreview(d.bannerMobile || "");
          setBannerDesktopFile(null);
          setBannerMobileFile(null);
          const rows = [...(d.tiles || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setTileCount(
            rows.length === MIN_TILE_COUNT ? MIN_TILE_COUNT : MAX_TILE_COUNT
          );
          setTiles(
            Array.from({ length: MAX_TILE_COUNT }, (_, i) => {
              const t = rows[i];
              return t
                ? {
                    image: t.image || "",
                    imageFile: null,
                    imagePreview: t.image || "",
                    url: t.url || "",
                  }
                : emptyTile();
            })
          );
          setSelected(data.products || []);
        } else {
          setName("");
          setBannerUrl("");
          setTilesBgColor("#0d9488");
          setBannerDesktop("");
          setBannerMobile("");
          setBannerDesktopPreview("");
          setBannerMobilePreview("");
          setTileCount(MAX_TILE_COUNT);
          setTiles(Array.from({ length: MAX_TILE_COUNT }, emptyTile));
          setSelected([]);
          setStatus("active");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId]);

  const updateTile = (index, patch) => {
    setTiles((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
    );
  };

  const pickTileImage = (index, file) => {
    if (!file) return;
    updateTile(index, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    });
  };

  const addProduct = (p) => {
    setSelected((prev) => [...prev, p]);
  };

  const addMultipleProducts = (list) => {
    setSelected((prev) => [...prev, ...list]);
  };

  const removeProduct = (id) => {
    setSelected((prev) => prev.filter((p) => String(p._id) !== String(id)));
  };

  const moveProduct = (index, dir) => {
    setSelected((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
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
    if (!bannerDesktopPreview && !bannerDesktop) {
      setError("Top banner image is required.");
      return;
    }
    for (let i = 0; i < tileCount; i++) {
      if (!tiles[i].imagePreview && !tiles[i].image) {
        setError(`Image ${i + 1} of ${tileCount} is required.`);
        return;
      }
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("status", status);
      fd.append("bannerUrl", bannerUrl.trim());
      fd.append("tilesBgColor", tilesBgColor);
      fd.append("existingBannerDesktop", bannerDesktop);
      fd.append("existingBannerMobile", bannerMobile);
      fd.append(
        "tilesMeta",
        JSON.stringify(
          tiles.slice(0, tileCount).map((t) => ({
            image: t.image,
            url: t.url,
          }))
        )
      );
      fd.append(
        "productIds",
        JSON.stringify(selected.map((p) => p._id))
      );

      if (bannerDesktopFile) fd.append("bannerDesktop", bannerDesktopFile);
      if (bannerMobileFile) fd.append("bannerMobile", bannerMobileFile);
      tiles.slice(0, tileCount).forEach((t, i) => {
        if (t.imageFile) fd.append(`tileImage_${i}`, t.imageFile);
      });

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isListMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Banner + 3/4 Images + Products
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Top banner, 3 or 4 tiles with shared BG color, and related products for{" "}
              <span className="font-medium text-gray-700">
                {categoryName || "this category"}
              </span>
              . See All uses the banner URL.
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
            No sets yet. Click <strong>ADD NEW</strong>.
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
            {setLabel || "New Banner + 3/4 Images + Products"}
          </h3>
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

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <h4 className="text-sm font-semibold text-gray-900">Top banner</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Banner URL
          </label>
          <input
            type="text"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="/category/washing-machines or full URL"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Used for banner click and the See All button on products.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desktop image *
            </label>
            <p className="text-[11px] text-red-600 mb-1">
              Displayed at exact image size on storefront (scales down only if wider than the page).
            </p>
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
                setError("");
                setBannerDesktopFile(file);
                if (file) setBannerDesktopPreview(URL.createObjectURL(file));
              }}
              className="block w-full text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
            </p>
            {bannerDesktopPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerDesktopPreview}
                alt=""
                className="mt-2 max-h-32 rounded-lg border object-contain bg-white"
              />
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile image (optional)
            </label>
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
                setError("");
                setBannerMobileFile(file);
                if (file) setBannerMobilePreview(URL.createObjectURL(file));
              }}
              className="block w-full text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
            </p>
            {bannerMobilePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerMobilePreview}
                alt=""
                className="mt-2 max-h-32 rounded-lg border object-contain bg-white"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {tileCount} images (tiles)
            </h4>
            <p className="text-[11px] text-red-600 mt-0.5">
              Displayed at exact image size. If larger than 450×450, scaled down
              to fit (no crop).
            </p>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Number of images
            </label>
            <select
              value={tileCount}
              onChange={(e) => setTileCount(Number(e.target.value))}
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value={3}>3 images</option>
              <option value={4}>4 images</option>
            </select>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Background color for {tileCount} images *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(tilesBgColor)
                    ? tilesBgColor
                    : "#0d9488"
                }
                onChange={(e) => setTilesBgColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <input
                type="text"
                value={tilesBgColor}
                onChange={(e) => setTilesBgColor(e.target.value)}
                placeholder="#0d9488"
                className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Applied behind all {tileCount} tile images on the storefront.
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-2 sm:p-3"
          style={{
            backgroundColor: /^#[0-9A-Fa-f]{3,8}$/.test(tilesBgColor)
              ? tilesBgColor
              : "#0d9488",
          }}
        >
          <p className="text-[10px] text-white/90 mb-2 font-medium">
            Preview — {tileCount} image strip background
          </p>
          <div
            className={`grid gap-2 ${
              tileCount === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-4"
            }`}
          >
            {tiles.slice(0, tileCount).map((tile, index) => (
              <div
                key={index}
                className="rounded-md overflow-hidden min-h-[72px] flex items-center justify-center"
                style={{
                  backgroundColor: /^#[0-9A-Fa-f]{3,8}$/.test(tilesBgColor)
                    ? tilesBgColor
                    : "#0d9488",
                }}
              >
                {tile.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.imagePreview}
                    alt=""
                    className="h-16 w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-[10px] text-white/70 px-2 text-center">
                    Image {index + 1}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.slice(0, tileCount).map((tile, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
            >
              <div className="text-xs font-semibold text-gray-700">
                Image {index + 1}
              </div>
              <input
                type="text"
                value={tile.url}
                onChange={(e) => updateTile(index, { url: e.target.value })}
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
                  pickTileImage(index, file);
                }}
                className="block w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
              </p>
              {tile.imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.imagePreview}
                  alt=""
                  className="mt-1 h-24 w-full object-contain rounded border"
                  style={{
                    backgroundColor: /^#[0-9A-Fa-f]{3,8}$/.test(tilesBgColor)
                      ? tilesBgColor
                      : "#0d9488",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Related products section name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Air Conditioner"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Add related products (optional)
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
          Selected products ({selected.length})
        </h4>
        {selected.length === 0 ? (
          <p className="text-xs text-gray-500">No products added yet.</p>
        ) : (
          <ul className="space-y-2">
            {selected.map((p, index) => (
              <li
                key={p._id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60"
              >
                {productImageSrc(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={productImageSrc(p)}
                    alt=""
                    className="h-12 w-12 object-contain bg-white border rounded"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gray-100 rounded" />
                )}
                <div className="flex-1 min-w-0 text-sm font-medium line-clamp-2">
                  {p.name}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => moveProduct(index, -1)} className="text-xs text-gray-500">↑</button>
                  <button type="button" onClick={() => moveProduct(index, 1)} className="text-xs text-gray-500">↓</button>
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(p._id)}
                  className="text-xs text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onBackToList} className="rounded-lg border px-4 py-2 text-sm">
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
