"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const emptyItem = () => ({
  image: "",
  imageFile: null,
  imagePreview: "",
  url: "",
  state: "all",
  isActive: true,
});

function readShowGap(value) {
  return value === true || value === "true" || value === 1;
}

/**
 * Brand Carousel component page:
 * - Select from gallery → list already-created sets + ADD NEW (top right)
 * - ADD NEW / Edit → form for that one set (many brand logos + URLs)
 */
export default function BrandCarouselConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-brand-carousel",
  autoBrandsScope = "category",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [showGap, setShowGap] = useState(false);
  const [autoBrandsFromCategory, setAutoBrandsFromCategory] = useState(false);
  const [items, setItems] = useState([emptyItem()]);
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

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
          setName(data.data.name || "");
          setStatus(data.data.status || "active");
          setShowGap(readShowGap(data.data.showGap));
          setAutoBrandsFromCategory(Boolean(data.data.autoBrandsFromCategory));
          const rows = data.data.items || [];
          setItems(
            rows.length
              ? rows.map((it) => ({
                  image: it.image || "",
                  imageFile: null,
                  imagePreview: it.image || "",
                  url: it.url || "",
                  state: it.state || "all",
                  isActive: it.isActive !== false,
                }))
              : [emptyItem()]
          );
        } else {
          setName("");
          setItems([emptyItem()]);
          setShowGap(false);
          setAutoBrandsFromCategory(false);
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

  const updateItem = (index, patch) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Section name is required (shown at top of the component).");
      return;
    }
    if (!autoBrandsFromCategory) {
      for (let i = 0; i < items.length; i++) {
        if (!items[i].imageFile && !items[i].image) {
          setError(`Brand #${i + 1}: image is required.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("status", status);
      fd.append("showGap", showGap ? "true" : "false");
      fd.append(
        "autoBrandsFromCategory",
        autoBrandsFromCategory ? "true" : "false"
      );
      if (!autoBrandsFromCategory) {
        fd.append(
          "itemsMeta",
          JSON.stringify(
            items.map((it, i) => ({
              image: it.image || "",
              url: it.url || "",
              state: it.state || "all",
              isActive: it.isActive !== false,
              order: i,
            }))
          )
        );
        items.forEach((it, i) => {
          if (it.imageFile) fd.append(`image_${i}`, it.imageFile);
        });
      }

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      if (data.data) {
        setShowGap(readShowGap(data.data.showGap));
        setAutoBrandsFromCategory(Boolean(data.data.autoBrandsFromCategory));
      }
      onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* —— List view: existing sets + ADD NEW —— */
  if (isListMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Brand Carousel
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Already created sets for this category are listed below. Click{" "}
              <strong>ADD NEW</strong> to create another set (name + many brand logos
              &amp; URLs).
            </p>
            <p className="text-sm font-medium text-[#ED1C24] mt-2">
              All images must be the same height and width.
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
            No Brand Carousel sets yet. Click <strong>ADD NEW</strong> to
            create the first one.
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

  /* —— Edit / create form for one set —— */
  return (
    <form onSubmit={handleSave} className="space-y-4">
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
            {setLabel || "New Brand Carousel"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            One set = many brand logos + URLs. Storefront shows 5 per page with
            left/right and dots.
          </p>
          <p className="text-sm font-medium text-[#ED1C24] mt-2">
            All images must be the same height and width.
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
          Section name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Shop by Brand"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Gap between brands
        </label>
        <p className="text-xs text-gray-500 mb-3">
          ON shows space between brand logos. OFF displays images with no gap.
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

      <div className="rounded-xl border-2 border-[#ED1C24]/30 bg-[#fffdf5] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              {autoBrandsScope === "all"
                ? "Show all brands"
                : "Auto Brands From Category"}
            </label>
            <p className="text-xs text-gray-600">
              {autoBrandsScope === "all"
                ? "ON loads every active brand on the home page. Each brand opens /brand/slug/overview when that brand has a designed page, otherwise /brand/slug."
                : "ON automatically shows brands that have products in this category (including child categories). Manual brand images and URLs are not required."}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={autoBrandsFromCategory}
              onChange={(e) => setAutoBrandsFromCategory(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {autoBrandsFromCategory ? (
          <p className="mt-3 text-xs text-[#C4161D] font-medium">
            Manual brand configuration is disabled while Auto mode is ON.
          </p>
        ) : null}
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

      {autoBrandsFromCategory ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
          <Icon
            icon="mdi:storefront-outline"
            className="mx-auto text-3xl text-[#ED1C24] mb-2"
          />
          <p className="text-sm font-medium text-gray-800">
            {autoBrandsScope === "all"
              ? "All brands will load automatically"
              : "Brands will load automatically from this category"}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {autoBrandsScope === "all"
              ? "On the home page this carousel lists every active brand. Links use /brand/slug/overview only when that brand overview has components."
              : "On the storefront overview page, this carousel will show brand logos and links for brands that currently have products under this category context."}
          </p>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Brands ({items.length})</h4>
          <p className="text-sm font-medium text-[#ED1C24] mt-0.5">
            All images must be the same height and width.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setItems((p) => [...p, emptyItem()])}
          className="text-sm text-[#ED1C24] font-medium hover:underline inline-flex items-center gap-1"
        >
          <Icon icon="mdi:image-plus" /> Add brand
        </button>
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/60"
        >
          <div className="flex justify-between">
            <span className="text-sm font-medium">Brand #{index + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setItems((p) => p.filter((_, i) => i !== index))
                }
                className="text-xs text-red-600"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Brand image *
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
                if (!file) return;
                setError("");
                updateItem(index, {
                  imageFile: file,
                  imagePreview: URL.createObjectURL(file),
                });
              }}
              className="w-full text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
            </p>
            {item.imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imagePreview}
                alt=""
                className="mt-2 max-h-[200px] max-w-[160px] object-contain rounded border bg-white"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Target Region / State
              </label>
              <select
                value={item.state || "all"}
                onChange={(e) => updateItem(index, { state: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Regions (Default)</option>
                <option value="karnataka">Karnataka (Unilet)</option>
                <option value="tamilnadu">Tamil Nadu</option>
                <option value="andhra">Andhra Pradesh</option>
                <option value="kerala">Kerala</option>
                <option value="telangana">Telangana</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                URL
              </label>
              <input
                type="text"
                value={item.url}
                onChange={(e) => updateItem(index, { url: e.target.value })}
                placeholder="/category/brand/... or https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={(e) =>
                  updateItem(index, { isActive: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm">
              {item.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      ))}
        </>
      )}

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
          {saving ? "Saving…" : "Save Brand Carousel"}
        </button>
      </div>
    </form>
  );
}
