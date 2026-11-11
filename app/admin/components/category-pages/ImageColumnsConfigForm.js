"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const LAYOUTS = [
  {
    id: "center_big",
    label: "Center big",
    description: "Left 2 small · Center large · Right 2 small",
  },
  {
    id: "left_big",
    label: "Left big",
    description: "Left large · Center 2 small · Right 2 small",
  },
  {
    id: "right_big",
    label: "Right big",
    description: "Left 2 small · Center 2 small · Right large",
  },
];

const LAYOUT_SLOTS = {
  center_big: [
    { slot: "tl", label: "Top Left", size: "small" },
    { slot: "bl", label: "Bottom Left", size: "small" },
    { slot: "center", label: "Center (Large)", size: "large" },
    { slot: "tr", label: "Top Right", size: "small" },
    { slot: "br", label: "Bottom Right", size: "small" },
  ],
  left_big: [
    { slot: "left", label: "Left (Large)", size: "large" },
    { slot: "c1", label: "Center Top", size: "small" },
    { slot: "c2", label: "Center Bottom", size: "small" },
    { slot: "tr", label: "Top Right", size: "small" },
    { slot: "br", label: "Bottom Right", size: "small" },
  ],
  right_big: [
    { slot: "tl", label: "Top Left", size: "small" },
    { slot: "bl", label: "Bottom Left", size: "small" },
    { slot: "c1", label: "Center Top", size: "small" },
    { slot: "c2", label: "Center Bottom", size: "small" },
    { slot: "right", label: "Right (Large)", size: "large" },
  ],
};

const SIZE_HINT = {
  large: "Approx 780×520 px",
  small: "Approx 380×250 px",
};

function emptySlot(slotDef) {
  return {
    slot: slotDef.slot,
    label: slotDef.label,
    size: slotDef.size,
    image: "",
    imageFile: null,
    imagePreview: "",
    url: "",
  };
}

function slotsForLayout(layout, previousBySlot = {}) {
  return (LAYOUT_SLOTS[layout] || LAYOUT_SLOTS.center_big).map((def) => {
    const prev = previousBySlot[def.slot];
    if (!prev) return emptySlot(def);
    return {
      ...emptySlot(def),
      image: prev.image || "",
      imageFile: prev.imageFile || null,
      imagePreview: prev.imagePreview || prev.image || "",
      url: prev.url || "",
    };
  });
}

function readShowGap(value) {
  return value === true || value === "true" || value === 1;
}

function LayoutDiagram({ layout, selected }) {
  const tone = (big = false) =>
    `h-full w-full min-h-[1.25rem] rounded-sm ${
      big ? "bg-gray-500" : "bg-gray-300"
    } ${selected ? "" : "opacity-80"}`;

  if (layout === "center_big") {
    return (
      <div className="grid h-16 w-28 grid-cols-[1fr_1.6fr_1fr] grid-rows-2 gap-0.5">
        <div className={tone()} />
        <div className={`${tone(true)} row-span-2`} />
        <div className={tone()} />
        <div className={tone()} />
        <div className={tone()} />
      </div>
    );
  }
  if (layout === "left_big") {
    return (
      <div className="grid h-16 w-28 grid-cols-[1.6fr_1fr_1fr] grid-rows-2 gap-0.5">
        <div className={`${tone(true)} row-span-2`} />
        <div className={tone()} />
        <div className={tone()} />
        <div className={tone()} />
        <div className={tone()} />
      </div>
    );
  }
  return (
    <div className="grid h-16 w-28 grid-cols-[1fr_1fr_1.6fr] grid-rows-2 gap-0.5">
      <div className={tone()} />
      <div className={tone()} />
      <div className={`${tone(true)} row-span-2`} />
      <div className={tone()} />
      <div className={tone()} />
    </div>
  );
}

/**
 * Admin: 5-image mosaic with 3 layout options.
 */
export default function ImageColumnsConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-image-columns",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [showGap, setShowGap] = useState(true);
  const [layout, setLayout] = useState("center_big");
  const [slots, setSlots] = useState(() => slotsForLayout("center_big"));
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const slotDefs = useMemo(
    () => LAYOUT_SLOTS[layout] || LAYOUT_SLOTS.center_big,
    [layout]
  );

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
          const d = data.data;
          const nextLayout = LAYOUTS.some((l) => l.id === d.layout)
            ? d.layout
            : "center_big";
          setName(d.name || "");
          setStatus(d.status || "active");
          setShowGap(readShowGap(d.showGap));
          setLayout(nextLayout);
          const bySlot = Object.fromEntries(
            (d.images || []).map((img) => [
              img.slot,
              {
                image: img.image || "",
                imagePreview: img.image || "",
                url: img.url || "",
              },
            ])
          );
          setSlots(slotsForLayout(nextLayout, bySlot));
        } else {
          setName("");
          setStatus("active");
          setShowGap(true);
          setLayout("center_big");
          setSlots(slotsForLayout("center_big"));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId]);

  const changeLayout = (nextLayout) => {
    if (nextLayout === layout) return;
    const previousBySlot = Object.fromEntries(
      slots.map((s) => [s.slot, s])
    );
    setLayout(nextLayout);
    setSlots(slotsForLayout(nextLayout, previousBySlot));
  };

  const updateSlot = (slotKey, patch) => {
    setSlots((prev) =>
      prev.map((s) => (s.slot === slotKey ? { ...s, ...patch } : s))
    );
  };

  const handleFile = (slotKey, file, inputEl) => {
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
    const preview = URL.createObjectURL(allowed);
    updateSlot(slotKey, {
      imageFile: allowed,
      imagePreview: preview,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Section name is required.");
      return;
    }
    for (const s of slots) {
      if (!s.imageFile && !s.image) {
        setError(`${s.label}: image is required.`);
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
      fd.append("layout", layout);
      fd.append("showGap", showGap ? "true" : "false");
      fd.append(
        "imagesMeta",
        JSON.stringify(
          slots.map((s) => ({
            slot: s.slot,
            url: s.url || "",
            existingImage: s.image || "",
          }))
        )
      );
      slots.forEach((s) => {
        if (s.imageFile) fd.append(`image_${s.slot}`, s.imageFile);
      });

      const res = await fetch(apiBase, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      if (data.data) {
        setShowGap(readShowGap(data.data.showGap));
        setLayout(data.data.layout || layout);
        const bySlot = Object.fromEntries(
          (data.data.images || []).map((img) => [
            img.slot,
            {
              image: img.image || "",
              imagePreview: img.image || "",
              url: img.url || "",
            },
          ])
        );
        setSlots(slotsForLayout(data.data.layout || layout, bySlot));
      }
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
              Image Columns (3 Layouts)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Already created sets for this category are listed below. Click{" "}
              <strong>ADD NEW</strong> to create another five-image mosaic.
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
            No Image Columns sets yet. Click <strong>ADD NEW</strong> to create
            the first one.
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
            {setLabel || "New Image Columns"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Pick a layout, then upload five images. URLs are optional. Size
            hints are approximate only.
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
          placeholder="e.g. Featured Collections"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Layout *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LAYOUTS.map((opt) => {
            const selected = layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => changeLayout(opt.id)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  selected
                    ? "border-[#ED1C24] bg-red-50/40"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex justify-center mb-2">
                  <LayoutDiagram layout={opt.id} selected={selected} />
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {opt.label}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {opt.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showGap}
            onChange={(e) => setShowGap(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show gap between images
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Images ({slotDefs.length})
        </h4>
        <p className="text-xs text-gray-500">{CATEGORY_PAGE_IMAGE_ACCEPT_HINT}</p>
        {slots.map((s) => (
          <div
            key={s.slot}
            className="rounded-xl border border-gray-200 bg-gray-50/50 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div className="text-sm font-medium text-gray-900">{s.label}</div>
              <div className="text-xs text-gray-500">
                {SIZE_HINT[s.size] || SIZE_HINT.small}
                {s.size === "large" ? " · dominant" : ""}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
              <div className="rounded-lg border border-dashed border-gray-300 bg-white flex items-center justify-center min-h-[90px] overflow-hidden">
                {s.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.imagePreview}
                    alt=""
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No image</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept={CATEGORY_PAGE_IMAGE_ACCEPT}
                  onChange={(e) =>
                    handleFile(s.slot, e.target.files?.[0] || null, e.target)
                  }
                  className="block w-full text-xs text-gray-600"
                />
                <p className="text-[10px] text-gray-400">
                  {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
                </p>
                <input
                  type="text"
                  value={s.url}
                  onChange={(e) => updateSlot(s.slot, { url: e.target.value })}
                  placeholder="Optional URL or category slug"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ED1C24] px-4 py-2 text-sm font-medium text-white hover:bg-[#C4161D] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
