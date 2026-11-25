"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const BADGE_COLOR_OPTIONS = [
  { value: "red", label: "Red Pill", bg: "bg-[#b91c1c]", text: "text-white" },
  { value: "black", label: "Dark / Gold", bg: "bg-[#18181b]", text: "text-[#facc15]" },
  { value: "gray", label: "Slate Gray", bg: "bg-[#3f3f46]", text: "text-white" },
  { value: "olive", label: "Olive / Mustard", bg: "bg-[#78711e]", text: "text-white" },
  { value: "yellow", label: "Bright Yellow", bg: "bg-[#facc15]", text: "text-black" },
  { value: "pink", label: "Soft Coral / Pink", bg: "bg-[#fee2e2]", text: "text-[#dc2626]" },
  { value: "blue", label: "Royal Blue", bg: "bg-[#1d4ed8]", text: "text-white" },
  { value: "emerald", label: "Emerald Green", bg: "bg-[#047857]", text: "text-white" },
];

export function getBadgeClasses(colorKey = "red") {
  const match = BADGE_COLOR_OPTIONS.find((b) => b.value === colorKey);
  if (match) {
    return `${match.bg} ${match.text}`;
  }
  return "bg-[#b91c1c] text-white";
}

const emptyItem = () => ({
  image: "",
  imageFile: null,
  imagePreview: "",
  badgeText: "",
  badgeColor: "red",
  title: "",
  subtitle: "",
  slug: "",
  isActive: true,
});

export default function SuperCategoriesConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-super-categories",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("Explore Super-Categories");
  const [kicker, setKicker] = useState("DEPARTMENT MATRIX");
  const [viewAllText, setViewAllText] = useState("View All 84 Sub-Categories");
  const [viewAllUrl, setViewAllUrl] = useState("/categories");
  const [status, setStatus] = useState("active");
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
        const res = await fetch(`${apiBase}?instanceId=${instanceId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setName(data.data.name || "Explore Super-Categories");
          setKicker(data.data.kicker || "DEPARTMENT MATRIX");
          setViewAllText(data.data.viewAllText || "View All 84 Sub-Categories");
          setViewAllUrl(data.data.viewAllUrl || "/categories");
          setStatus(data.data.status || "active");
          const rows = data.data.items || [];
          setItems(
            rows.length
              ? rows.map((it) => ({
                image: it.image || "",
                imageFile: null,
                imagePreview: it.image || "",
                badgeText: it.badgeText || "",
                badgeColor: it.badgeColor || "red",
                title: it.title || it.imageName || "",
                subtitle: it.subtitle || "",
                slug: it.slug || it.url || "",
                isActive: it.isActive !== false,
              }))
              : [emptyItem()]
          );
        } else {
          setName("Explore Super-Categories");
          setKicker("DEPARTMENT MATRIX");
          setViewAllText("View All 84 Sub-Categories");
          setViewAllUrl("/categories");
          setItems([emptyItem()]);
          setStatus("active");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId, apiBase]);

  const updateItem = (index, patch) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Section Title is required.");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].imageFile && !items[i].image) {
        setError(`Card #${i + 1}: Image is required.`);
        return;
      }
      if (!items[i].title.trim()) {
        setError(`Card #${i + 1}: Category Title is required.`);
        return;
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("kicker", kicker.trim());
      fd.append("viewAllText", viewAllText.trim());
      fd.append("viewAllUrl", viewAllUrl.trim());
      fd.append("status", status);
      fd.append(
        "itemsMeta",
        JSON.stringify(
          items.map((it, i) => ({
            image: it.image || "",
            badgeText: it.badgeText.trim(),
            badgeColor: it.badgeColor || "red",
            title: it.title.trim(),
            subtitle: it.subtitle.trim(),
            slug: it.slug.trim(),
            url: it.slug.trim(),
            isActive: it.isActive !== false,
            order: i,
          }))
        )
      );
      items.forEach((it, i) => {
        if (it.imageFile) fd.append(`image_${i}`, it.imageFile);
      });

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const displayTitle = setLabel || "Super Categories Matrix";

  if (isListMode) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
                <Icon icon="mdi:grid-large" className="text-xl" />
              </span>
              Super Categories Matrix
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore Super-Categories (Department Matrix) with offer badges, category titles, subtitle tags, and View All link.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ED1C24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D] transition-all shadow-xs hover:shadow shrink-0"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            Add New Set
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" className="text-lg shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {existingSets.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/60">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto text-gray-400 mb-3 shadow-2xs">
                <Icon icon="mdi:grid-large" className="text-2xl" />
              </div>
              <p className="text-gray-700 font-semibold">No Super Categories sets added yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;Add New Set&quot; above to create your first Super Categories matrix.
              </p>
            </div>
          ) : (
            existingSets.map((s, idx) => (
              <div
                key={s.instanceId}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200/80 hover:border-gray-300 hover:shadow-xs bg-white transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-[#ED1C24] font-bold text-sm shrink-0 border border-red-100">
                    #{idx + 1}
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-gray-900 truncate text-sm">
                      {s.title || s.label || `Super Categories Set #${idx + 1}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Section Title: <span className="text-[#ED1C24] font-semibold">{s.title || "Explore Super-Categories"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSet(s.instanceId)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#ED1C24] hover:bg-red-50 rounded-lg transition border border-red-200/80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === s.instanceId}
                    onClick={() => handleDeleteSet(s.instanceId, s.title || s.label)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  >
                    {deletingId === s.instanceId ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
        <Icon icon="mdi:loading" className="animate-spin text-3xl mx-auto mb-2 text-[#ED1C24]" />
        <p className="text-sm font-medium">Loading Super Categories configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition"
              title="Back to sets list"
            >
              <Icon icon="mdi:arrow-left" className="text-xl" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
                <Icon icon="mdi:grid-large" className="text-lg" />
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                {displayTitle}
              </h2>
              <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? "card" : "cards"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure department matrix section header, cards, offer pill badges, and target links.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-700 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ED1C24] px-5 py-2 text-xs font-bold text-white hover:bg-[#C4161D] transition-all shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <Icon icon="mdi:loading" className="animate-spin text-sm" />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save" className="text-sm" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <Icon icon="mdi:alert-circle-outline" className="text-lg shrink-0" />
          {error}
        </div>
      )}

      {/* Component Section Header Settings Box */}
      <div className="mt-6 p-5 bg-gradient-to-br from-gray-50/90 to-gray-50/40 rounded-2xl border border-gray-200/90">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="mdi:tune-variant" className="text-gray-500 text-base" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Section Header Settings
          </h3>
        </div>

        {/* Row 1: Section Title, Top Kicker, Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Section Title <span className="text-[#ED1C24]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Explore Super-Categories"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">Main heading shown in large bold text on storefront</p>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Top Kicker Subtitle
            </label>
            <input
              type="text"
              value={kicker}
              onChange={(e) => setKicker(e.target.value)}
              placeholder="e.g. DEPARTMENT MATRIX"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white font-medium text-[#d72828]"
            />
            <p className="text-[11px] text-gray-400 mt-1">Small uppercase kicker tag above title</p>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Display Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white font-medium"
            >
              <option value="active">Active (Visible)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Control visibility on storefront</p>
          </div>
        </div>

        {/* Row 2: View All Text, View All URL */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 pt-3 border-t border-gray-200/60">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              View All Link Text
            </label>
            <input
              type="text"
              value={viewAllText}
              onChange={(e) => setViewAllText(e.target.value)}
              placeholder="e.g. View All 84 Sub-Categories"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">Right-side clickable link text</p>
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              View All Target URL
            </label>
            <input
              type="text"
              value={viewAllUrl}
              onChange={(e) => setViewAllUrl(e.target.value)}
              placeholder="e.g. /categories"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">Destination URL when View All is clicked</p>
          </div>
        </div>
      </div>

      {/* Cards List Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Icon icon="mdi:cards-outline" className="text-base text-gray-500" />
              Category Cards ({items.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Each card contains a product/category image, pill offer badge, bold category title, and subtitle text.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#ED1C24] hover:bg-red-50 border border-red-200 rounded-xl transition shadow-2xs"
          >
            <Icon icon="mdi:plus" />
            Add Card
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-200/90 bg-white hover:border-gray-300 transition-all shadow-2xs overflow-hidden"
            >
              {/* Card Header Bar */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50/60 px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-red-100/70 text-[#ED1C24] font-bold text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-xs text-gray-800 truncate max-w-xs sm:max-w-md">
                    {item.title ? item.title : `Untitled Card #${idx + 1}`}
                  </span>
                  {item.badgeText && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getBadgeClasses(item.badgeColor)}`}>
                      {item.badgeText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Active Toggle Switch */}
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 mr-2 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => updateItem(idx, { isActive: e.target.checked })}
                      className="rounded text-[#ED1C24] focus:ring-[#ED1C24] w-3.5 h-3.5"
                    />
                    <span>{item.isActive ? "Active" : "Hidden"}</span>
                  </label>

                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      const newItems = [...items];
                      const [temp] = newItems.splice(idx, 1);
                      newItems.splice(idx - 1, 0, temp);
                      setItems(newItems);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition rounded-lg hover:bg-gray-100"
                    title="Move Up"
                  >
                    <Icon icon="mdi:arrow-up" className="text-base" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => {
                      const newItems = [...items];
                      const [temp] = newItems.splice(idx, 1);
                      newItems.splice(idx + 1, 0, temp);
                      setItems(newItems);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition rounded-lg hover:bg-gray-100"
                    title="Move Down"
                  >
                    <Icon icon="mdi:arrow-down" className="text-base" />
                  </button>

                  {/* Delete Card */}
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => {
                      if (items.length > 1) {
                        setItems((prev) => prev.filter((_, i) => i !== idx));
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-20 ml-1"
                    title="Delete Card"
                  >
                    <Icon icon="mdi:trash-can-outline" className="text-base" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start">
                {/* Left: Image Upload & Preview Box */}
                <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-[#ED1C24] shadow-2xs flex items-center justify-center relative group bg-gray-50/50 p-2 transition cursor-pointer">
                    {item.imagePreview || item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imagePreview || item.image}
                        alt={item.title || `Card ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                        <Icon icon="mdi:image-plus" className="text-2xl mb-1 text-gray-400" />
                        <span className="text-[11px] font-medium text-gray-500">Upload Image</span>
                        <span className="text-[9px] text-gray-400">WebP / AVIF</span>
                      </div>
                    )}

                    {/* Hover Upload Overlay */}
                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white text-[11px] font-semibold z-10 backdrop-blur-[2px]">
                      <Icon icon="mdi:camera" className="text-lg mb-0.5" />
                      {item.imagePreview || item.image ? "Change" : "Upload"}
                      <input
                        type="file"
                        accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const { file: validFile, error: err } =
                            consumeAllowedCategoryPageImage(file, e.target);
                          if (err || !validFile) return;
                          const preview = URL.createObjectURL(validFile);
                          updateItem(idx, {
                            imageFile: validFile,
                            imagePreview: preview,
                          });
                        }}
                      />
                    </label>
                  </div>

                  <label className="text-xs text-[#ED1C24] font-semibold hover:underline cursor-pointer">
                    {item.imagePreview || item.image ? "Change Image" : "Upload Image"}
                    <input
                      type="file"
                      accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const { file: validFile, error: err } =
                          consumeAllowedCategoryPageImage(file, e.target);
                        if (err || !validFile) return;
                        const preview = URL.createObjectURL(validFile);
                        updateItem(idx, {
                          imageFile: validFile,
                          imagePreview: preview,
                        });
                      }}
                    />
                  </label>
                </div>

                {/* Right: Form Grid (Spacious 2-row layout) */}
                <div className="flex-1 w-full space-y-3.5">
                  {/* Row 1: Category Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Category Title <span className="text-[#ED1C24]">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="e.g. Mobiles & Tablets"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition font-medium"
                        required
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Bold category heading below badge
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Subtitle Description
                      </label>
                      <input
                        type="text"
                        value={item.subtitle}
                        onChange={(e) => updateItem(idx, { subtitle: e.target.value })}
                        placeholder="e.g. Smartphones, iPads & Covers"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Small descriptive text shown underneath title
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Badge Text, Badge Style, Target Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1 border-t border-gray-100">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Pill Badge Text
                      </label>
                      <input
                        type="text"
                        value={item.badgeText}
                        onChange={(e) => updateItem(idx, { badgeText: e.target.value })}
                        placeholder="e.g. From ₹6,999 or Up to 55% Off"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Offer pill label below image
                      </p>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Badge Color Style
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.badgeColor || "red"}
                          onChange={(e) => updateItem(idx, { badgeColor: e.target.value })}
                          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
                        >
                          {BADGE_COLOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 shadow-2xs ${getBadgeClasses(item.badgeColor)}`}>
                          {item.badgeText || "Badge"}
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Target Link / Slug
                      </label>
                      <input
                        type="text"
                        value={item.slug}
                        onChange={(e) => updateItem(idx, { slug: e.target.value })}
                        placeholder="e.g. /category/mobiles"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        URL navigated when clicked
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Card Button */}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mt-5 w-full py-3.5 border-2 border-dashed border-gray-300 hover:border-[#ED1C24] text-gray-600 hover:text-[#ED1C24] rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-gray-50/50 hover:bg-red-50/20 group shadow-2xs"
        >
          <span className="w-6 h-6 rounded-lg bg-gray-200 group-hover:bg-[#ED1C24] text-gray-600 group-hover:text-white flex items-center justify-center transition">
            <Icon icon="mdi:plus" />
          </span>
          Add Another Category Card
        </button>

        <p className="text-[11px] text-gray-400 text-center mt-3">
          {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
        </p>
      </div>
    </form>
  );
}
