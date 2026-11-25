"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  CATEGORY_PAGE_IMAGE_ACCEPT_HINT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

const REGION_OPTIONS = [
  { value: "all", label: "All Regions (Default)" },
  { value: "karnataka", label: "Karnataka (Unilet)" },
  { value: "tamilnadu", label: "Tamil Nadu" },
  { value: "andhra", label: "Andhra Pradesh" },
  { value: "kerala", label: "Kerala" },
  { value: "telangana", label: "Telangana" },
];

const REGION_LABELS = {
  all: "All Regions",
  karnataka: "Karnataka",
  tamilnadu: "Tamil Nadu",
  andhra: "Andhra",
  kerala: "Kerala",
  telangana: "Telangana",
};

const BANNER_MODES = [
  {
    value: "single",
    title: "Single Banner",
    subtitle: "One full-width image",
  },
  {
    value: "big-left",
    title: "Big Left Side",
    subtitle: "1 large left + 2 small right",
  },
  {
    value: "big-right",
    title: "Big Right Side",
    subtitle: "2 small left + 1 large right",
  },
];

const MODE_LABELS = {
  single: "Single Banner",
  "big-left": "Big Left Side",
  "big-right": "Big Right Side",
};

const emptySmallSlot = () => ({
  desktopImage: "",
  mobileImage: "",
  desktopFile: null,
  mobileFile: null,
  desktopPreview: "",
  mobilePreview: "",
  url: "",
});

const emptySlide = () => ({
  _id: "",
  mode: "single",
  desktopImage: "",
  mobileImage: "",
  desktopFile: null,
  mobileFile: null,
  desktopPreview: "",
  mobilePreview: "",
  url: "",
  heading: "",
  description: "",
  buttonText: "",
  buttonUrl: "",
  overlayAlign: "bottom-left",
  textColor: "#ffffff",
  showGradientOverlay: true,
  smallBanner1: emptySmallSlot(),
  smallBanner2: emptySmallSlot(),
  state: "all",
  isActive: true,
  startDate: "",
  endDate: "",
});

function formatDateTimeForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toIsoStringOrNull(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function getBannerTimerStatus(startDate, endDate) {
  if (!startDate && !endDate) {
    return { label: "Always Active", color: "bg-gray-100 text-gray-700 border-gray-200" };
  }
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && now < start) {
    return {
      label: `Upcoming (${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`,
      color: "bg-amber-50 text-amber-800 border-amber-300 font-medium",
    };
  }
  if (end && now > end) {
    return {
      label: `Expired (${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`,
      color: "bg-red-50 text-red-700 border-red-300 font-medium",
    };
  }
  if (end) {
    return {
      label: `Live (Ends ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`,
      color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    };
  }
  return { label: "Live", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium" };
}

function toSlideDraft(raw) {
  const mode =
    raw?.mode === "big-left" || raw?.mode === "big-right" ? raw.mode : "single";
  const s1 = raw?.smallBanner1 || {};
  const s2 = raw?.smallBanner2 || {};
  return {
    _id: raw?._id ? String(raw._id) : "",
    mode,
    desktopImage: raw?.desktopImage || "",
    mobileImage: raw?.mobileImage || "",
    desktopFile: null,
    mobileFile: null,
    desktopPreview: raw?.desktopImage || "",
    mobilePreview: raw?.mobileImage || "",
    url: raw?.url || "",
    heading: raw?.heading || "",
    description: raw?.description || "",
    buttonText: raw?.buttonText || "",
    buttonUrl: raw?.buttonUrl || "",
    overlayAlign: raw?.overlayAlign || "bottom-left",
    textColor: raw?.textColor || "#ffffff",
    showGradientOverlay: raw?.showGradientOverlay !== false,
    smallBanner1: {
      desktopImage: s1.desktopImage || "",
      mobileImage: s1.mobileImage || "",
      desktopFile: null,
      mobileFile: null,
      desktopPreview: s1.desktopImage || "",
      mobilePreview: s1.mobileImage || "",
      url: s1.url || "",
    },
    smallBanner2: {
      desktopImage: s2.desktopImage || "",
      mobileImage: s2.mobileImage || "",
      desktopFile: null,
      mobileFile: null,
      desktopPreview: s2.desktopImage || "",
      mobilePreview: s2.mobileImage || "",
      url: s2.url || "",
    },
    state: raw?.state || "all",
    isActive: raw?.isActive !== false,
    startDate: raw?.startDate ? formatDateTimeForInput(raw.startDate) : "",
    endDate: raw?.endDate ? formatDateTimeForInput(raw.endDate) : "",
  };
}

function ModeWireframe({ mode }) {
  if (mode === "single") {
    return <div className="h-10 w-full rounded bg-gray-300 mb-2" />;
  }
  const isBigRight = mode === "big-right";
  return (
    <div
      className={`grid h-10 grid-rows-2 gap-1 mb-2 ${
        isBigRight ? "grid-cols-[1fr_1.9fr]" : "grid-cols-[1.9fr_1fr]"
      }`}
    >
      <div
        className={`rounded bg-gray-300 row-span-2 ${
          isBigRight ? "col-start-2 row-start-1" : "col-start-1 row-start-1"
        }`}
      />
      <div
        className={`rounded bg-gray-300 ${
          isBigRight ? "col-start-1 row-start-1" : "col-start-2 row-start-1"
        }`}
      />
      <div
        className={`rounded bg-gray-300 ${
          isBigRight ? "col-start-1 row-start-2" : "col-start-2 row-start-2"
        }`}
      />
    </div>
  );
}

function ImageUploadBox({ label, required = false, preview, onPick, onClear }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required ? "*" : ""}
      </label>
      <input
        type="file"
        accept={CATEGORY_PAGE_IMAGE_ACCEPT}
        onChange={(e) => onPick(e.target.files?.[0], e.target)}
        className="w-full text-xs text-gray-600"
      />
      <p className="mt-1 text-[10px] text-gray-400">
        {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
      </p>
      {preview && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="h-24 w-full object-cover rounded-lg border border-gray-200 bg-white"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 rounded bg-red-600/85 hover:bg-red-600 text-white text-[10px] px-1.5 py-0.5"
          >
            Clear Image
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Unified Top Banner manager for `/admin/homesettings`:
 * Displays slides in carousel order (`#1 — Single Banner`, `#2 — Big Left Side`, etc.)
 * and matches Single / Double Banner's list + mode-card inner form UX.
 */
export default function HomeTopBannerConfigForm({
  pageId,
  hasComponentInstance,
  onEnsureComponent,
  onChanged,
}) {
  const [slides, setSlides] = useState([]);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // null = list view, "new" = creating new slide, number = editing existing slide index
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(emptySlide);

  const loadSlides = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/home-topbanner?pageId=${pageId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load slides");
      if (data.data) {
        setStatus(data.data.status || "active");
        const sorted = [...(data.data.banners || [])].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        setSlides(sorted.map(toSlideDraft));
      } else {
        setStatus("active");
        setSlides([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  const persistSlides = async (nextSlides, nextStatus = status) => {
    if (!hasComponentInstance && onEnsureComponent) {
      await onEnsureComponent();
    }

    const fd = new FormData();
    fd.append("pageId", pageId);
    fd.append("pageType", "home");
    fd.append("status", nextStatus || "active");
    fd.append(
      "bannersMeta",
      JSON.stringify(
        nextSlides.map((s, i) => ({
          _id: s._id || undefined,
          mode: s.mode || "single",
          desktopImage: s.desktopImage || "",
          mobileImage: s.mobileImage || "",
          url: s.url || "",
          heading: s.heading || "",
          description: s.description || "",
          buttonText: s.buttonText || "",
          buttonUrl: s.buttonUrl || "",
          overlayAlign: s.overlayAlign || "bottom-left",
          textColor: s.textColor || "#ffffff",
          showGradientOverlay: s.showGradientOverlay !== false,
          smallBanner1: {
            desktopImage: s.smallBanner1?.desktopImage || "",
            mobileImage: s.smallBanner1?.mobileImage || "",
            url: s.smallBanner1?.url || "",
          },
          smallBanner2: {
            desktopImage: s.smallBanner2?.desktopImage || "",
            mobileImage: s.smallBanner2?.mobileImage || "",
            url: s.smallBanner2?.url || "",
          },
          state: s.state || "all",
          isActive: s.isActive !== false,
          startDate: toIsoStringOrNull(s.startDate),
          endDate: toIsoStringOrNull(s.endDate),
          order: i,
        }))
      )
    );

    nextSlides.forEach((s, i) => {
      if (s.desktopFile) fd.append(`desktopImage_${i}`, s.desktopFile);
      if (s.mobileFile) fd.append(`mobileImage_${i}`, s.mobileFile);
      if (s.smallBanner1?.desktopFile) {
        fd.append(`small1DesktopImage_${i}`, s.smallBanner1.desktopFile);
      }
      if (s.smallBanner1?.mobileFile) {
        fd.append(`small1MobileImage_${i}`, s.smallBanner1.mobileFile);
      }
      if (s.smallBanner2?.desktopFile) {
        fd.append(`small2DesktopImage_${i}`, s.smallBanner2.desktopFile);
      }
      if (s.smallBanner2?.mobileFile) {
        fd.append(`small2MobileImage_${i}`, s.smallBanner2.mobileFile);
      }
    });

    const res = await fetch("/api/home-topbanner", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Save failed");

    if (data.data) {
      setStatus(data.data.status || "active");
      const sorted = [...(data.data.banners || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      setSlides(sorted.map(toSlideDraft));
    }
    onChanged?.();
  };

  const handleToggleGlobalStatus = async (checked) => {
    const nextStatus = checked ? "active" : "inactive";
    setStatus(nextStatus);
    if (!slides.length && !hasComponentInstance) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await persistSlides(slides, nextStatus);
      setSuccessMsg(`Top Banner ${checked ? "activated" : "deactivated"}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSlide = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await persistSlides(next, status);
      setSuccessMsg("Slide order updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (index) => {
    const modeTitle = MODE_LABELS[slides[index]?.mode || "single"] || "Slide";
    if (
      !window.confirm(
        `Delete "Top Banner #${index + 1} — ${modeTitle}"? This cannot be undone.`
      )
    ) {
      return;
    }
    const next = slides.filter((_, i) => i !== index);
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await persistSlides(next, status);
      setSuccessMsg(`Top Banner #${index + 1} deleted.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openAddNew = () => {
    setError("");
    setSuccessMsg("");
    setDraft(emptySlide());
    setEditingIndex("new");
  };

  const openEditSlide = (index) => {
    setError("");
    setSuccessMsg("");
    setDraft(toSlideDraft(slides[index]));
    setEditingIndex(index);
  };

  const backToList = () => {
    setError("");
    setEditingIndex(null);
  };

  const pickMainFile = (fieldPrefix, file, inputEl) => {
    const { file: allowed, error: fileErr } = consumeAllowedCategoryPageImage(
      file,
      inputEl
    );
    if (fileErr) {
      setError(fileErr);
      return;
    }
    if (!allowed) return;
    setError("");
    setDraft((prev) => ({
      ...prev,
      [`${fieldPrefix}File`]: allowed,
      [`${fieldPrefix}Preview`]: URL.createObjectURL(allowed),
    }));
  };

  const pickSmallFile = (slotKey, fieldPrefix, file, inputEl) => {
    const { file: allowed, error: fileErr } = consumeAllowedCategoryPageImage(
      file,
      inputEl
    );
    if (fileErr) {
      setError(fileErr);
      return;
    }
    if (!allowed) return;
    setError("");
    setDraft((prev) => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        [`${fieldPrefix}File`]: allowed,
        [`${fieldPrefix}Preview`]: URL.createObjectURL(allowed),
      },
    }));
  };

  const updateSmallSlot = (slotKey, patch) => {
    setDraft((prev) => ({
      ...prev,
      [slotKey]: { ...prev[slotKey], ...patch },
    }));
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const isGrid = draft.mode === "big-left" || draft.mode === "big-right";
    if (!draft.desktopFile && !draft.desktopImage) {
      setError(
        isGrid
          ? "Large Banner desktop image is required."
          : "Desktop banner image is required."
      );
      return;
    }
    if (isGrid) {
      if (!draft.smallBanner1.desktopFile && !draft.smallBanner1.desktopImage) {
        setError("Small Banner 1 desktop image is required.");
        return;
      }
      if (!draft.smallBanner2.desktopFile && !draft.smallBanner2.desktopImage) {
        setError("Small Banner 2 desktop image is required.");
        return;
      }
    }

    const nextSlides = [...slides];
    if (editingIndex === "new") {
      nextSlides.push(draft);
    } else if (typeof editingIndex === "number") {
      nextSlides[editingIndex] = draft;
    }

    setSaving(true);
    try {
      await persistSlides(nextSlides, status);
      setEditingIndex(null);
      setSuccessMsg("Top Banner carousel saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  /* =========================
   * 1. SLIDE LIST VIEW
   * ========================= */
  if (editingIndex === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top Banner</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage slides for the top hero banner carousel in exact display order.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddNew}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#C4161D]"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            Add New
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={status === "active"}
                disabled={saving}
                onChange={(e) => handleToggleGlobalStatus(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <span className="text-sm font-medium text-gray-800">Set Active</span>
          </div>
          <span className="text-xs text-gray-500">
            {slides.length} slide{slides.length === 1 ? "" : "s"} in carousel
          </span>
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

        {slides.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <Icon
              icon="mdi:image-multiple-outline"
              className="mx-auto mb-2 text-3xl text-gray-400"
            />
            <p className="text-sm text-gray-600">No slides added yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Click Add New to create a Single Banner or 3-Banner Hero Grid slide.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {slides.map((slide, index) => {
              const modeLabel = MODE_LABELS[slide.mode || "single"] || "Single Banner";
              const thumb = slide.desktopPreview || slide.mobilePreview;
              const timerBadge =
                slide.startDate || slide.endDate
                  ? getBannerTimerStatus(slide.startDate, slide.endDate)
                  : null;
              return (
                <li
                  key={slide._id || `slide-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={`Slide ${index + 1}`}
                        className="h-10 w-16 shrink-0 rounded-md border border-gray-200 object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="h-10 w-16 shrink-0 rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
                        No img
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          Top Banner #{index + 1} &mdash; {modeLabel}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            slide.isActive !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {slide.isActive !== false ? "ON" : "OFF"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                        <span>{REGION_LABELS[slide.state || "all"] || slide.state}</span>
                        {slide.heading && (
                          <span className="text-gray-400">&bull; {slide.heading}</span>
                        )}
                        {timerBadge && (
                          <span
                            className={`px-1.5 py-0.2 rounded border text-[10px] ${timerBadge.color}`}
                          >
                            {timerBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-gray-200 rounded-md bg-gray-50">
                      <button
                        type="button"
                        title="Move slide up"
                        disabled={saving || index === 0}
                        onClick={() => handleMoveSlide(index, -1)}
                        className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-up" className="text-base" />
                      </button>
                      <button
                        type="button"
                        title="Move slide down"
                        disabled={saving || index === slides.length - 1}
                        onClick={() => handleMoveSlide(index, 1)}
                        className="p-1 text-gray-500 hover:text-gray-800 border-l border-gray-200 disabled:opacity-30"
                      >
                        <Icon icon="mdi:chevron-down" className="text-base" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditSlide(index)}
                      className="text-sm font-semibold text-[#ED1C24] hover:underline ml-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteSlide(index)}
                      className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  /* =========================
   * 2. SLIDE EDIT / CREATE FORM VIEW
   * ========================= */
  const slideNumber =
    editingIndex === "new" ? slides.length + 1 : Number(editingIndex) + 1;
  const isGridMode = draft.mode === "big-left" || draft.mode === "big-right";
  const isBigRight = draft.mode === "big-right";
  const timerBadge = getBannerTimerStatus(draft.startDate, draft.endDate);

  return (
    <form onSubmit={handleSaveSlide} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {editingIndex === "new"
              ? `Top Banner #${slideNumber}`
              : `Edit Top Banner #${slideNumber}`}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose single banner or 3-banner hero grid layout for this slide.
          </p>
        </div>
        <button
          type="button"
          onClick={backToList}
          className="text-sm text-gray-600 hover:underline shrink-0"
        >
          Back to list
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner mode wireframe selector (matching Single / Double Banner style) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banner mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BANNER_MODES.map((opt) => {
            const active = draft.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, mode: opt.value }))}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#ED1C24] ring-1 ring-[#ED1C24] bg-red-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <ModeWireframe mode={opt.value} />
                <div className="text-sm font-medium text-gray-900">{opt.title}</div>
                <div className="text-[11px] text-gray-500">{opt.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode-specific fields */}
      {!isGridMode ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadBox
              label="Banner Image (Desktop)"
              required
              preview={draft.desktopPreview}
              onPick={(f, el) => pickMainFile("desktop", f, el)}
              onClear={() =>
                setDraft((p) => ({
                  ...p,
                  desktopFile: null,
                  desktopImage: "",
                  desktopPreview: "",
                }))
              }
            />
            <ImageUploadBox
              label="Mobile Banner Image"
              preview={draft.mobilePreview}
              onPick={(f, el) => pickMainFile("mobile", f, el)}
              onClear={() =>
                setDraft((p) => ({
                  ...p,
                  mobileFile: null,
                  mobileImage: "",
                  mobilePreview: "",
                }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Banner URL
            </label>
            <input
              type="text"
              value={draft.url}
              onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))}
              placeholder="/category/... or https://..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Large Banner + Optional Overlay Content */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-800">
                1. Large Banner ({isBigRight ? "Right Side" : "Left Side"})
              </div>
              <span className="text-[11px] text-gray-500">
                Shares main top-hero carousel container height
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadBox
                label="Desktop Banner Image"
                required
                preview={draft.desktopPreview}
                onPick={(f, el) => pickMainFile("desktop", f, el)}
                onClear={() =>
                  setDraft((p) => ({
                    ...p,
                    desktopFile: null,
                    desktopImage: "",
                    desktopPreview: "",
                  }))
                }
              />
              <ImageUploadBox
                label="Mobile Banner Image (Optional)"
                preview={draft.mobilePreview}
                onPick={(f, el) => pickMainFile("mobile", f, el)}
                onClear={() =>
                  setDraft((p) => ({
                    ...p,
                    mobileFile: null,
                    mobileImage: "",
                    mobilePreview: "",
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Banner Click URL (Optional)
              </label>
              <input
                type="text"
                value={draft.url}
                onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))}
                placeholder="/category/... or https://..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800">
                  Customizable Overlay Content (Optional)
                </span>
                <span className="text-[11px] text-gray-400">
                  Leave empty to render a clean plain image
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={draft.heading}
                    onChange={(e) => setDraft((p) => ({ ...p, heading: e.target.value }))}
                    placeholder="Optional headline"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={draft.buttonText}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, buttonText: e.target.value }))
                    }
                    placeholder="e.g. Shop Now"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Optional short description"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Button URL
                  </label>
                  <input
                    type="text"
                    value={draft.buttonUrl}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, buttonUrl: e.target.value }))
                    }
                    placeholder="/category/... or https://..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Overlay Alignment
                  </label>
                  <select
                    value={draft.overlayAlign}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, overlayAlign: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs bg-white"
                  >
                    <option value="bottom-left">Bottom Left</option>
                    <option value="center-left">Center Left</option>
                    <option value="bottom-center">Bottom Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.textColor || "#ffffff"}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, textColor: e.target.value }))
                      }
                      className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={draft.textColor || "#ffffff"}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, textColor: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.showGradientOverlay}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        showGradientOverlay: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-[#ED1C24] focus:ring-[#ED1C24]"
                  />
                  <span>Dark gradient scrim</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2 & 3. Two stacked Small Banners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { key: "smallBanner1", title: "2. Small Banner 1 (Top Small)" },
              { key: "smallBanner2", title: "3. Small Banner 2 (Bottom Small)" },
            ].map(({ key, title }) => {
              const slot = draft[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3"
                >
                  <div className="text-sm font-semibold text-gray-800">{title}</div>
                  <ImageUploadBox
                    label="Desktop Image"
                    required
                    preview={slot.desktopPreview}
                    onPick={(f, el) => pickSmallFile(key, "desktop", f, el)}
                    onClear={() =>
                      updateSmallSlot(key, {
                        desktopFile: null,
                        desktopImage: "",
                        desktopPreview: "",
                      })
                    }
                  />
                  <ImageUploadBox
                    label="Mobile Image (Optional)"
                    preview={slot.mobilePreview}
                    onPick={(f, el) => pickSmallFile(key, "mobile", f, el)}
                    onClear={() =>
                      updateSmallSlot(key, {
                        mobileFile: null,
                        mobileImage: "",
                        mobilePreview: "",
                      })
                    }
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Banner URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={slot.url}
                      onChange={(e) => updateSmallSlot(key, { url: e.target.value })}
                      placeholder="/category/... or https://..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common Settings: Region, Schedule / Timer, Active */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Target Region / State
          </label>
          <select
            value={draft.state || "all"}
            onChange={(e) => setDraft((p) => ({ ...p, state: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-gray-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <span>⏰</span> Schedule / Timer (Optional)
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${timerBadge.color}`}>
              {timerBadge.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Show From (Start Date &amp; Time)
              </label>
              <input
                type="datetime-local"
                value={draft.startDate || ""}
                onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Hide After (End Date &amp; Time)
              </label>
              <input
                type="datetime-local"
                value={draft.endDate || ""}
                onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700"
              />
            </div>
          </div>
          {(draft.startDate || draft.endDate) && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, startDate: "", endDate: "" }))}
                className="text-[11px] text-gray-500 hover:text-red-600 underline"
              >
                Clear Schedule (Show Always)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((p) => ({ ...p, isActive: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm text-gray-700">
            {draft.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={backToList}
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

