"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import HotspotEditor from "./HotspotEditor";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

function createHotspotId() {
  return `hs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyHotspot(rect = {}, order = 0) {
  return {
    id: createHotspotId(),
    label: `Hotspot ${order + 1}`,
    link: "",
    openInNewTab: false,
    isActive: true,
    x: rect.x ?? 10,
    y: rect.y ?? 10,
    width: rect.width ?? 20,
    height: rect.height ?? 15,
    order,
  };
}

/**
 * Admin: Image Hotspot Banner — one image, unlimited %-based clickable regions.
 */
export default function ImageHotspotBannerConfigForm({
  pageId,
  categoryName,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-image-hotspot-banner",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [drawingEnabled, setDrawingEnabled] = useState(false);
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
          setBannerImage(d.bannerImage || "");
          setBannerPreview(d.bannerImage || "");
          setBannerFile(null);
          const rows = [...(d.hotspots || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setHotspots(rows);
          setSelectedId(rows[0]?.id || null);
        } else {
          setName("");
          setStatus("active");
          setBannerImage("");
          setBannerPreview("");
          setHotspots([]);
          setSelectedId(null);
        }
        setDrawingEnabled(false);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId]);

  const selected = hotspots.find((h) => h.id === selectedId) || null;

  const updateHotspot = (id, patch) => {
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
    );
  };

  const handleCreateFromDraw = (rect) => {
    const hs = emptyHotspot(rect, hotspots.length);
    setHotspots((prev) => [...prev, hs]);
    setSelectedId(hs.id);
    setDrawingEnabled(false);
  };

  const addDefaultHotspot = () => {
    if (!bannerPreview) {
      setError("Upload a banner image first.");
      return;
    }
    setDrawingEnabled(true);
    setSelectedId(null);
    setError("");
  };

  const deleteHotspot = (id) => {
    setHotspots((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id || null);
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
    if (!bannerPreview && !bannerImage) {
      setError("Banner image is required.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("pageId", pageId);
      fd.append("name", name.trim());
      fd.append("status", status);
      fd.append("existingBannerImage", bannerImage);
      fd.append(
        "hotspots",
        JSON.stringify(
          hotspots.map((h, i) => ({
            ...h,
            order: i,
          }))
        )
      );
      if (bannerFile) fd.append("bannerImage", bannerFile);

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
              Image Hotspot Banner
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              One banner image with clickable regions for{" "}
              <span className="font-medium text-gray-700">
                {categoryName || "this category"}
              </span>
              . Coordinates are percentage-based and responsive.
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
            No hotspot banners yet. Click <strong>ADD NEW</strong>.
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
            {setLabel || "New Image Hotspot Banner"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload one banner, then draw hotspots that link to category /
            product / custom URLs.
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
          placeholder="e.g. Budget Map / Offer Zones"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/40">
        <h4 className="text-sm font-semibold text-gray-900">Banner image *</h4>
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
            setBannerFile(file);
            if (file) {
              setBannerPreview(URL.createObjectURL(file));
              setHotspots([]);
              setSelectedId(null);
            }
          }}
          className="block w-full text-sm"
        />
        <p className="text-[11px] text-gray-500">
          {CATEGORY_PAGE_IMAGE_ACCEPT_HINT} Replacing the image clears existing
          hotspots on this form until you re-draw them.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addDefaultHotspot}
          disabled={!bannerPreview}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            drawingEnabled
              ? "bg-green-600 hover:bg-green-700"
              : "bg-[#ED1C24] hover:bg-[#C4161D]"
          }`}
        >
          <Icon icon="mdi:vector-rectangle" className="text-base" />
          {drawingEnabled ? "Drawing… click & drag on image" : "Add Hotspot"}
        </button>
        {drawingEnabled ? (
          <button
            type="button"
            onClick={() => setDrawingEnabled(false)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Cancel draw
          </button>
        ) : null}
        <span className="text-xs text-gray-500">
          {hotspots.length} hotspot{hotspots.length === 1 ? "" : "s"}
        </span>
      </div>

      <HotspotEditor
        imageSrc={bannerPreview}
        hotspots={hotspots}
        selectedId={selectedId}
        drawingEnabled={drawingEnabled}
        onSelect={setSelectedId}
        onChangeHotspot={(id, rect) => updateHotspot(id, rect)}
        onCreateHotspot={handleCreateFromDraw}
      />

      {selected ? (
        <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Hotspot settings
            </h4>
            <button
              type="button"
              onClick={() => deleteHotspot(selected.id)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Delete hotspot
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Label
            </label>
            <input
              type="text"
              value={selected.label}
              onChange={(e) =>
                updateHotspot(selected.id, { label: e.target.value })
              }
              placeholder="e.g. Under ₹10,000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Destination link
            </label>
            <input
              type="text"
              value={selected.link}
              onChange={(e) =>
                updateHotspot(selected.id, { link: e.target.value })
              }
              placeholder="/category/... /product/... or https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Category, subcategory, child, product path, or full custom URL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.isActive !== false}
                onChange={(e) =>
                  updateHotspot(selected.id, { isActive: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              Active
            </label>
          </div>

          <p className="text-[11px] text-gray-400 font-mono">
            x:{selected.x?.toFixed?.(1) ?? selected.x}% y:
            {selected.y?.toFixed?.(1) ?? selected.y}% w:
            {selected.width?.toFixed?.(1) ?? selected.width}% h:
            {selected.height?.toFixed?.(1) ?? selected.height}%
          </p>
        </div>
      ) : hotspots.length > 0 ? (
        <p className="text-xs text-gray-500">
          Select a hotspot on the image to edit its link and label.
        </p>
      ) : null}

      {hotspots.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold mb-2">All hotspots</h4>
          <ul className="space-y-1.5">
            {hotspots.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(h.id);
                    setDrawingEnabled(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    h.id === selectedId
                      ? "border-[#ED1C24] bg-red-50"
                      : "border-gray-200 bg-gray-50/60"
                  }`}
                >
                  <span className="font-medium truncate">
                    {h.label || "Untitled"}
                    {h.isActive === false ? (
                      <span className="ml-2 text-[10px] uppercase text-gray-400">
                        Inactive
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-gray-400 truncate max-w-[40%]">
                    {h.link || "No link"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
