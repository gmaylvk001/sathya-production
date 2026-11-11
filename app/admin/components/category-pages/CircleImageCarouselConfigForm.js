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
  imageName: "",
  slug: "",
  isActive: true,
});

export default function CircleImageCarouselConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-circle-image-carousel",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
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
          setName(data.data.name || "");
          setStatus(data.data.status || "active");
          const rows = data.data.items || [];
          setItems(
            rows.length
              ? rows.map((it) => ({
                  image: it.image || "",
                  imageFile: null,
                  imagePreview: it.image || "",
                  imageName: it.imageName || "",
                  slug: it.slug || it.url || "",
                  isActive: it.isActive !== false,
                }))
              : [emptyItem()]
          );
        } else {
          setName("");
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
      setError(
        "Component Section Name is required (displayed in red color at the top center of the storefront)."
      );
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].imageFile && !items[i].image) {
        setError(`Image #${i + 1}: Image is required.`);
        return;
      }
      if (!items[i].imageName.trim()) {
        setError(`Image #${i + 1}: Image name is required (displayed at the bottom of the circle).`);
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
      fd.append(
        "itemsMeta",
        JSON.stringify(
          items.map((it, i) => ({
            image: it.image || "",
            imageName: it.imageName.trim(),
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

  if (isListMode) {
    return (
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:circle-outline" className="text-[#ED1C24] text-xl" />
              Circle Image Carousel
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Circular images (radius 100%) with custom slug and image name underneath. Whole component name is displayed in red at top center.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D] transition shadow-sm shrink-0"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            Add New Set
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {existingSets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">
              <Icon
                icon="mdi:circle-outline"
                className="mx-auto text-4xl text-gray-400 mb-2"
              />
              <p className="text-gray-500 font-medium">No circle image carousel sets added yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;Add New Set&quot; above to create your first circular carousel.
              </p>
            </div>
          ) : (
            existingSets.map((s, idx) => (
              <div
                key={s.instanceId}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-[#ED1C24] font-bold text-sm shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="truncate">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {s.title || s.label || `Circle Carousel Set #${idx + 1}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Component Name: <span className="text-[#ED1C24] font-medium">{s.title || "Untitled"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSet(s.instanceId)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#ED1C24] hover:bg-red-50 rounded-lg transition border border-red-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === s.instanceId}
                    onClick={() => handleDeleteSet(s.instanceId, s.title || s.label)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
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
      <div className="p-12 text-center text-gray-500">
        <Icon icon="mdi:loading" className="animate-spin text-3xl mx-auto mb-2 text-[#ED1C24]" />
        Loading configuration...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border p-6 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"
              title="Back to sets list"
            >
              <Icon icon="mdi:arrow-left" className="text-xl" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:circle-outline" className="text-[#ED1C24] text-xl" />
              {setLabel || "Circle Image Carousel"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Whole component title appears in red color at the top center.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ED1C24] px-5 py-2 text-sm font-semibold text-white hover:bg-[#C4161D] transition shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Icon icon="mdi:loading" className="animate-spin text-base" />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save" className="text-base" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Component Title & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded-xl border">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Component Section Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Featured Categories / Popular Brands"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-[#BC2121] focus:outline-none"
            required
          />
          <p className="text-[11px] text-[#BC2121] mt-1 font-medium">
            ★ This name will be displayed in RED COLOR at the TOP CENTER of the component on the storefront.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-[#BC2121] focus:outline-none"
          >
            <option value="active">Active (Visible)</option>
            <option value="inactive">Inactive (Hidden)</option>
          </select>
        </div>
      </div>

      {/* Items Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Carousel Circle Images ({items.length})
            </h3>
            <p className="text-xs text-gray-500">
              Each image is displayed in circle format (radius 100%) with the image name underneath and links to the slug.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#ED1C24] hover:bg-red-50 border border-red-200 rounded-lg transition"
          >
            <Icon icon="mdi:plus" />
            Add Image
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4"
            >
              {/* Order number */}
              <div className="text-xs font-bold text-gray-400 shrink-0 w-6 text-center">
                #{idx + 1}
              </div>

              {/* Circle Image Preview / Upload */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-20 h-20 overflow-hidden bg-gray-100 border-2 border-[#BC2121] shadow-sm flex items-center justify-center relative group"
                  style={{ borderRadius: "100%" }}
                >
                  {item.imagePreview || item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imagePreview || item.image}
                      alt={item.imageName || `Item ${idx + 1}`}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: "100%" }}
                    />
                  ) : (
                    <Icon icon="mdi:image-plus" className="text-2xl text-gray-400" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white text-xs font-medium">
                    Upload
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
                <label className="text-[11px] text-[#BC2121] font-medium hover:underline cursor-pointer">
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

              {/* Image Name & Slug Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Image Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.imageName}
                    onChange={(e) => updateItem(idx, { imageName: e.target.value })}
                    placeholder="e.g. Air Conditioners"
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#BC2121] focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-[#BC2121] mt-0.5 font-medium">
                    Displayed directly in red color at the bottom of the circle image.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Slug / Link URL
                  </label>
                  <input
                    type="text"
                    value={item.slug}
                    onChange={(e) => updateItem(idx, { slug: e.target.value })}
                    placeholder="e.g. air-conditioners or /category/air-conditioners"
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#BC2121] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    URL or slug to navigate when the circle image is clicked.
                  </p>
                </div>
              </div>

              {/* Action Buttons (Move, Active, Remove) */}
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 mr-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) => updateItem(idx, { isActive: e.target.checked })}
                    className="rounded text-[#BC2121] focus:ring-[#BC2121]"
                  />
                  Active
                </label>

                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => {
                    const newItems = [...items];
                    const [temp] = newItems.splice(idx, 1);
                    newItems.splice(idx - 1, 0, temp);
                    setItems(newItems);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition rounded"
                  title="Move Up"
                >
                  <Icon icon="mdi:arrow-up" />
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  onClick={() => {
                    const newItems = [...items];
                    const [temp] = newItems.splice(idx, 1);
                    newItems.splice(idx + 1, 0, temp);
                    setItems(newItems);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition rounded"
                  title="Move Down"
                >
                  <Icon icon="mdi:arrow-down" />
                </button>

                <button
                  type="button"
                  disabled={items.length === 1}
                  onClick={() => {
                    if (items.length > 1) {
                      setItems((prev) => prev.filter((_, i) => i !== idx));
                    }
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition disabled:opacity-20 ml-1"
                  title="Remove Image"
                >
                  <Icon icon="mdi:trash-can-outline" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-[#ED1C24] text-gray-600 hover:text-[#ED1C24] rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Icon icon="mdi:plus" />
          Add Another Image
        </button>

        <p className="text-[11px] text-gray-400 text-center mt-2">
          {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
        </p>
      </div>
    </form>
  );
}
