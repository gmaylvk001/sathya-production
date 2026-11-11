"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

function emptyBanner() {
  return {
    image: "",
    imageFile: null,
    imagePreview: "",
    url: "",
  };
}

/**
 * Admin: Single (1) or Double (left + right) banners with URL. No name field.
 */
export default function SplitBannerConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-split-banner",
}) {
  const isListMode = !instanceId;
  const [status, setStatus] = useState("active");
  const [bannerCount, setBannerCount] = useState(1);
  const [banners, setBanners] = useState([emptyBanner(), emptyBanner()]);
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
          `${apiBase}?instanceId=${encodeURIComponent(instanceId)}`
        );
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          const count = Number(d.bannerCount) === 2 ? 2 : 1;
          setBannerCount(count);
          setStatus(d.status === "inactive" ? "inactive" : "active");
          const sorted = [...(d.banners || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setBanners([
            {
              image: sorted[0]?.image || "",
              imageFile: null,
              imagePreview: sorted[0]?.image || "",
              url: sorted[0]?.url || "",
            },
            {
              image: sorted[1]?.image || "",
              imageFile: null,
              imagePreview: sorted[1]?.image || "",
              url: sorted[1]?.url || "",
            },
          ]);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId, apiBase]);

  const updateBanner = (index, patch) => {
    setBanners((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const onPickImage = (index, file, inputEl) => {
    const { file: allowed, error } = consumeAllowedCategoryPageImage(
      file,
      inputEl
    );
    if (error) {
      setError(error);
      return;
    }
    if (!allowed) return;
    setError("");
    updateBanner(index, {
      imageFile: allowed,
      imagePreview: URL.createObjectURL(allowed),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pageId || !instanceId) return;
    setSaving(true);
    setError("");
    try {
      const needed = banners.slice(0, bannerCount);
      for (let i = 0; i < needed.length; i++) {
        if (!needed[i].image && !needed[i].imageFile) {
          throw new Error(
            bannerCount === 1
              ? "Please upload a banner image."
              : `Please upload the ${i === 0 ? "left" : "right"} banner image.`
          );
        }
      }

      const formData = new FormData();
      formData.append("instanceId", instanceId);
      formData.append("pageId", pageId);
      formData.append("status", status);
      formData.append("bannerCount", String(bannerCount));
      formData.append(
        "bannersMeta",
        JSON.stringify(
          needed.map((b) => ({
            image: b.image || "",
            url: b.url || "",
          }))
        )
      );
      needed.forEach((b, i) => {
        if (b.imageFile) formData.append(`image_${i}`, b.imageFile);
      });

      const res = await fetch(apiBase, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      onSaved?.(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isListMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Single / Double Banner</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Existing sets. Add New creates another banner block.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-3 py-2 text-sm font-medium text-white hover:bg-[#C4161D]"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            Add New
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {existingSets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <Icon
              icon="mdi:image-multiple-outline"
              className="mx-auto mb-2 text-3xl text-gray-400"
            />
            <p className="text-sm text-gray-600">No banner sets yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {existingSets.map((set) => (
              <li
                key={set.instanceId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {set.label || set.title || "Banner"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSet?.(set.instanceId)}
                    className="text-sm font-semibold text-[#ED1C24] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteSet(
                        set.instanceId,
                        set.label || set.title || "Banner"
                      )
                    }
                    disabled={deletingId === set.instanceId}
                    className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === set.instanceId ? "Deleting..." : "Delete"}
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
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  const slots =
    bannerCount === 1
      ? [{ index: 0, label: "Banner" }]
      : [
          { index: 0, label: "Left Banner" },
          { index: 1, label: "Right Banner" },
        ];

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">
            {setLabel || "Single / Double Banner"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose 1 or 2 banners. Each needs an image and optional URL.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToList}
          className="text-sm text-gray-600 hover:underline"
        >
          Back to list
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banner mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBannerCount(1)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              bannerCount === 1
                ? "border-[#ED1C24] ring-1 ring-[#ED1C24] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="h-10 w-full rounded bg-gray-300 mb-2" />
            <div className="text-sm font-medium">Single Banner</div>
            <div className="text-[11px] text-gray-500">One full-width image</div>
          </button>
          <button
            type="button"
            onClick={() => setBannerCount(2)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              bannerCount === 2
                ? "border-[#ED1C24] ring-1 ring-[#ED1C24] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="grid grid-cols-2 gap-1 h-10 mb-2">
              <div className="rounded bg-gray-300" />
              <div className="rounded bg-gray-300" />
            </div>
            <div className="text-sm font-medium">Double Banner</div>
            <div className="text-[11px] text-gray-500">Left + right images</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className={`grid gap-4 ${bannerCount === 2 ? "md:grid-cols-2" : ""}`}>
        {slots.map(({ index, label }) => {
          const banner = banners[index];
          return (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
            >
              <div className="text-sm font-semibold text-gray-800">{label}</div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Image
                </label>
                {banner.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.imagePreview}
                    alt={label}
                    className="mb-2 w-full max-h-40 object-cover rounded-lg border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="mb-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-xs text-gray-400">
                    No image
                  </div>
                )}
                <input
                  type="file"
                  accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                  onChange={(e) =>
                    onPickImage(index, e.target.files?.[0], e.target)
                  }
                  className="block w-full text-xs text-gray-600"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  URL (optional)
                </label>
                <input
                  type="text"
                  value={banner.url}
                  onChange={(e) => updateBanner(index, { url: e.target.value })}
                  placeholder="https://… or /category/…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ED1C24] px-4 py-2 text-sm font-medium text-white hover:bg-[#C4161D] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
