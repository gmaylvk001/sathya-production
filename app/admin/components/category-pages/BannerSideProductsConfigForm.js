"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { buildProductSearchQuery } from "@/lib/categoryPageComponents/productSearchQuery";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";
import ProductFilterPicker from "./ProductFilterPicker";

function productImageSrc(product) {
  const img = product?.images?.[0];
  if (!img) return "";
  return img.startsWith("http") ? img : `/uploads/products/${img}`;
}

function ImageUploadField({ label, preview, onPick, hint, onInvalid }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {hint ? (
        <p className="text-[11px] text-gray-500 mb-2">{hint}</p>
      ) : null}
      <input
        type="file"
        accept={CATEGORY_PAGE_IMAGE_ACCEPT}
        onChange={(e) => {
          const { file, error } = consumeAllowedCategoryPageImage(
            e.target.files?.[0],
            e.target
          );
          if (error) {
            onInvalid?.(error);
            return;
          }
          onPick(file);
        }}
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
      />
      <p className="mt-1 text-[11px] text-gray-400">
        {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
      </p>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="mt-2 max-h-36 rounded-lg border object-contain bg-gray-50"
        />
      ) : null}
    </div>
  );
}

/**
 * Admin: main banner + side banner (left/right) + product search row.
 * See All on storefront uses main banner URL.
 */
export default function BannerSideProductsConfigForm({
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
  apiBase = "/api/category-banner-side-products",
  searchApiBase = "/api/category-product-carousel/search",
  ownerType = "category",
  brandId,
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [mainBannerUrl, setMainBannerUrl] = useState("");
  const [sideBannerUrl, setSideBannerUrl] = useState("");
  const [sideBannerPosition, setSideBannerPosition] = useState("left");
  const [mainDesktop, setMainDesktop] = useState("");
  const [mainMobile, setMainMobile] = useState("");
  const [sideImage, setSideImage] = useState("");
  const [mainDesktopPreview, setMainDesktopPreview] = useState("");
  const [mainMobilePreview, setMainMobilePreview] = useState("");
  const [sidePreview, setSidePreview] = useState("");
  const [mainDesktopFile, setMainDesktopFile] = useState(null);
  const [mainMobileFile, setMainMobileFile] = useState(null);
  const [sideImageFile, setSideImageFile] = useState(null);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const searchTimer = useRef(null);
  const wrapRef = useRef(null);

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
          setMainBannerUrl(d.mainBannerUrl || "");
          setSideBannerUrl(d.sideBannerUrl || "");
          setSideBannerPosition(
            d.sideBannerPosition === "right" ? "right" : "left"
          );
          setMainDesktop(d.mainBannerDesktop || "");
          setMainMobile(d.mainBannerMobile || "");
          setSideImage(d.sideBannerImage || "");
          setMainDesktopPreview(d.mainBannerDesktop || "");
          setMainMobilePreview(d.mainBannerMobile || "");
          setSidePreview(d.sideBannerImage || "");
          setSelected(data.products || []);
        } else {
          setName("");
          setMainBannerUrl("");
          setSideBannerUrl("");
          setSideBannerPosition("left");
          setMainDesktop("");
          setMainMobile("");
          setSideImage("");
          setMainDesktopPreview("");
          setMainMobilePreview("");
          setSidePreview("");
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

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!categoryId || !query.trim()) {
      setSuggestions([]);
      return undefined;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${searchApiBase}?${buildProductSearchQuery({
            categoryId,
            ownerType,
            brandId,
            q: query.trim(),
          })}`
        );
        const data = await res.json();
        if (data.success) {
          const selectedIds = new Set(selected.map((p) => String(p._id)));
          setSuggestions(
            (data.products || []).filter((p) => !selectedIds.has(String(p._id)))
          );
          setDropOpen(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(searchTimer.current);
  }, [query, categoryId, selected, ownerType, brandId]);

  const pickMainDesktop = (file) => {
    setError("");
    setMainDesktopFile(file);
    if (file) setMainDesktopPreview(URL.createObjectURL(file));
  };
  const pickMainMobile = (file) => {
    setError("");
    setMainMobileFile(file);
    if (file) setMainMobilePreview(URL.createObjectURL(file));
  };
  const pickSide = (file) => {
    setError("");
    setSideImageFile(file);
    if (file) setSidePreview(URL.createObjectURL(file));
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
    if (!mainDesktopPreview && !mainDesktop) {
      setError("Main banner desktop image is required.");
      return;
    }
    if (!sidePreview && !sideImage) {
      setError("Side banner image is required.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("status", status);
      fd.append("mainBannerUrl", mainBannerUrl.trim());
      fd.append("sideBannerUrl", sideBannerUrl.trim());
      fd.append("sideBannerPosition", sideBannerPosition);
      fd.append("existingMainBannerDesktop", mainDesktop);
      fd.append("existingMainBannerMobile", mainMobile);
      fd.append("existingSideBannerImage", sideImage);
      fd.append(
        "productIds",
        JSON.stringify(selected.map((p) => p._id))
      );

      if (mainDesktopFile) fd.append("mainBannerDesktop", mainDesktopFile);
      if (mainMobileFile) fd.append("mainBannerMobile", mainMobileFile);
      if (sideImageFile) fd.append("sideBannerImage", sideImageFile);

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
              Banner + Side + Products
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Main banner, side image (left/right), and product row for{" "}
              <span className="font-medium text-gray-700">
                {categoryName || "this category"}
              </span>
              . See All uses the main banner URL.
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
            {setLabel || "New Banner + Side + Products"}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product section name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Samsung Monitor"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <h4 className="text-sm font-semibold text-gray-900">Main banner</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Banner URL *
          </label>
          <input
            type="text"
            value={mainBannerUrl}
            onChange={(e) => setMainBannerUrl(e.target.value)}
            placeholder="/category/monitors or full URL"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Used for main banner click and the See All button.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="Desktop image *"
            preview={mainDesktopPreview}
            hint="Wide banner (recommended 1200×400+)"
            onPick={pickMainDesktop}
            onInvalid={setError}
          />
          <ImageUploadField
            label="Mobile image (optional)"
            preview={mainMobilePreview}
            hint="Falls back to desktop if empty"
            onPick={pickMainMobile}
            onInvalid={setError}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/40">
        <h4 className="text-sm font-semibold text-gray-900">Side banner</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image position
          </label>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="sidePosition"
                checked={sideBannerPosition === "left"}
                onChange={() => setSideBannerPosition("left")}
              />
              Left
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="sidePosition"
                checked={sideBannerPosition === "right"}
                onChange={() => setSideBannerPosition("right")}
              />
              Right
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Side banner URL (optional)
          </label>
          <input
            type="text"
            value={sideBannerUrl}
            onChange={(e) => setSideBannerUrl(e.target.value)}
            placeholder="/category/gaming-monitors"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <ImageUploadField
          label="Side image *"
          preview={sidePreview}
          hint="Vertical promo image beside products"
          onPick={pickSide}
          onInvalid={setError}
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Add products (optional)
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
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">{p.name}</div>
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
