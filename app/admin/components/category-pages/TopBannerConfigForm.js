"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const formatDateTimeForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getBannerTimerStatus = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return { label: "Always Active", color: "bg-gray-100 text-gray-700 border-gray-200" };
  }
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && now < start) {
    return {
      label: `Upcoming (Starts ${start.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-amber-50 text-amber-800 border-amber-300 font-medium"
    };
  }
  if (end && now > end) {
    return {
      label: `Expired (${end.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-red-50 text-red-700 border-red-300 font-medium"
    };
  }
  if (end) {
    return {
      label: `Live (Ends ${end.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium"
    };
  }
  return { label: "Live (No expiry)", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium" };
};

const emptyBanner = () => ({
  desktopImage: "",
  mobileImage: "",
  desktopFile: null,
  mobileFile: null,
  desktopPreview: "",
  mobilePreview: "",
  url: "",
  state: "all",
  isActive: true,
  startDate: "",
  endDate: "",
});

/**
 * Top Banner input form — used inside Category Page Builder.
 */
export default function TopBannerConfigForm({
  categoryId,
  pageId,
  pageType,
  categoryName,
  onSaved,
  onCancel,
  apiBase = "/api/category-topbanner",
  ownerIdKey = "categoryId",
}) {
  const [banners, setBanners] = useState([emptyBanner()]);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}?${ownerIdKey}=${categoryId}`
        );
        const data = await res.json();
        if (data.success && data.data) {
          setStatus(data.data.status || "active");
          const rows = data.data.banners || [];
          setBanners(
            rows.length
              ? rows.map((b) => ({
                  desktopImage: b.desktopImage || "",
                  mobileImage: b.mobileImage || "",
                  desktopFile: null,
                  mobileFile: null,
                  desktopPreview: b.desktopImage || "",
                  mobilePreview: b.mobileImage || "",
                  url: b.url || "",
                  state: b.state || "all",
                  isActive: b.isActive !== false,
                  startDate: b.startDate ? formatDateTimeForInput(b.startDate) : "",
                  endDate: b.endDate ? formatDateTimeForInput(b.endDate) : "",
                }))
              : [emptyBanner()]
          );
        } else {
          setBanners([emptyBanner()]);
          setStatus("active");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId, apiBase, ownerIdKey]);

  const updateBanner = (index, patch) => {
    setBanners((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    for (let i = 0; i < banners.length; i++) {
      if (!banners[i].desktopFile && !banners[i].desktopImage) {
        setError(`Banner #${i + 1}: desktop image required.`);
        return;
      }
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append(ownerIdKey, categoryId);
      if (pageId) fd.append("pageId", pageId);
      fd.append("pageType", pageType);
      fd.append("status", status);
      fd.append(
        "bannersMeta",
        JSON.stringify(
          banners.map((b, i) => ({
            desktopImage: b.desktopImage || "",
            mobileImage: b.mobileImage || "",
            url: b.url || "",
            state: b.state || "all",
            isActive: b.isActive !== false,
            startDate: b.startDate || null,
            endDate: b.endDate || null,
            order: i,
          }))
        )
      );
      banners.forEach((b, i) => {
        if (b.desktopFile) fd.append(`desktopImage_${i}`, b.desktopFile);
        if (b.mobileFile) fd.append(`mobileImage_${i}`, b.mobileFile);
      });

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");

      if (data.data) {
        setStatus(data.data.status || "active");
        const rows = data.data.banners || [];
        setBanners(
          rows.length
            ? rows.map((b) => ({
                desktopImage: b.desktopImage || "",
                mobileImage: b.mobileImage || "",
                desktopFile: null,
                mobileFile: null,
                desktopPreview: b.desktopImage || "",
                mobilePreview: b.mobileImage || "",
                url: b.url || "",
                state: b.state || "all",
                isActive: b.isActive !== false,
                startDate: b.startDate ? formatDateTimeForInput(b.startDate) : "",
                endDate: b.endDate ? formatDateTimeForInput(b.endDate) : "",
              }))
            : [emptyBanner()]
        );
      }
      setSuccessMsg("Top Banner saved successfully!");
      onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Top Banner</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Inputs for {categoryName || "this category"}
        </p>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="text-xs text-green-700 hover:text-green-900 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

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

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Banners ({banners.length})</h4>
        <button
          type="button"
          onClick={() => setBanners((p) => [...p, emptyBanner()])}
          className="text-sm text-[#ED1C24] font-medium hover:underline inline-flex items-center gap-1"
        >
          <Icon icon="mdi:plus" /> Add another banner
        </button>
      </div>

      {banners.map((banner, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/60"
        >
          <div className="flex justify-between">
            <span className="text-sm font-medium">Banner #{index + 1}</span>
            {banners.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setBanners((p) => p.filter((_, i) => i !== index))
                }
                className="text-xs text-red-600 font-medium hover:underline"
              >
                Remove Banner #{index + 1}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Banner Image (Desktop) *
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
                  updateBanner(index, {
                    desktopFile: file,
                    desktopPreview: URL.createObjectURL(file),
                  });
                }}
                className="w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
              </p>
              {banner.desktopPreview && (
                <div className="relative mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.desktopPreview}
                    alt=""
                    className="h-24 w-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateBanner(index, {
                        desktopFile: null,
                        desktopImage: "",
                        desktopPreview: "",
                      })
                    }
                    className="absolute top-1 right-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] px-1.5 py-0.5"
                  >
                    Clear Image
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mobile Banner Image
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
                  updateBanner(index, {
                    mobileFile: file,
                    mobilePreview: URL.createObjectURL(file),
                  });
                }}
                className="w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
              </p>
              {banner.mobilePreview && (
                <div className="relative mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.mobilePreview}
                    alt=""
                    className="h-24 w-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateBanner(index, {
                        mobileFile: null,
                        mobileImage: "",
                        mobilePreview: "",
                      })
                    }
                    className="absolute top-1 right-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] px-1.5 py-0.5"
                  >
                    Clear Image
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Target Region / State
              </label>
              <select
                value={banner.state || "all"}
                onChange={(e) => updateBanner(index, { state: e.target.value })}
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
                Banner URL
              </label>
              <input
                type="text"
                value={banner.url}
                onChange={(e) => updateBanner(index, { url: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="/category/... or https://..."
              />
            </div>
          </div>

          {/* Schedule / Timer Row */}
          <div className="pt-2 border-t border-gray-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <span>⏰</span> Schedule / Timer (Optional)
              </span>
              {(() => {
                const badge = getBannerTimerStatus(banner.startDate, banner.endDate);
                return (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                  Show From (Start Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={banner.startDate || ""}
                  onChange={(e) => updateBanner(index, { startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                  Hide After (End Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={banner.endDate || ""}
                  onChange={(e) => updateBanner(index, { endDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
                />
              </div>
            </div>
            {(banner.startDate || banner.endDate) && (
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => updateBanner(index, { startDate: "", endDate: "" })}
                  className="text-[11px] text-gray-500 hover:text-red-600 underline"
                >
                  Clear Schedule (Show Always)
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={banner.isActive}
                onChange={(e) =>
                  updateBanner(index, { isActive: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm">
              {banner.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ED1C24] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Top Banner"}
        </button>
      </div>
    </form>
  );
}
