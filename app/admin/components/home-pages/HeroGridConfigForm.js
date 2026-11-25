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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const toIsoStringOrNull = (val) => {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const getBannerTimerStatus = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return {
      label: "Always Active",
      color: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && !isNaN(start.getTime()) && now < start) {
    return {
      label: `Upcoming (Starts ${start.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      color: "bg-amber-50 text-amber-800 border-amber-300 font-medium",
    };
  }
  if (end && !isNaN(end.getTime()) && now > end) {
    return {
      label: `Expired (${end.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })} ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      color: "bg-red-50 text-red-700 border-red-300 font-medium",
    };
  }
  if (end && !isNaN(end.getTime())) {
    return {
      label: `Live (Ends ${end.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })} ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    };
  }
  return {
    label: "Live (No expiry)",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
  };
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

const emptyLargeSlot = () => ({
  ...emptySmallSlot(),
  heading: "",
  description: "",
  buttonText: "",
  buttonUrl: "",
  overlayAlign: "bottom-left",
  textColor: "#ffffff",
  showGradientOverlay: true,
});

function LayoutBadge({ variant }) {
  const isBigRight = variant === "big-right";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
      <div
        className={`grid h-8 w-16 grid-rows-2 gap-0.5 ${
          isBigRight ? "grid-cols-[1fr_1.9fr]" : "grid-cols-[1.9fr_1fr]"
        }`}
      >
        <div
          className={`rounded-[2px] bg-[#ED1C24]/80 row-span-2 ${
            isBigRight ? "col-start-2 row-start-1" : "col-start-1 row-start-1"
          }`}
        />
        <div
          className={`rounded-[2px] bg-gray-300 ${
            isBigRight ? "col-start-1 row-start-1" : "col-start-2 row-start-1"
          }`}
        />
        <div
          className={`rounded-[2px] bg-gray-300 ${
            isBigRight ? "col-start-1 row-start-2" : "col-start-2 row-start-2"
          }`}
        />
      </div>
      <span className="text-[11px] font-medium text-gray-700">
        {isBigRight ? "2 Small Left + Big Right" : "Big Left + 2 Small Right"}
      </span>
    </div>
  );
}

function ImageUploadSlot({
  label,
  required = false,
  preview,
  onPick,
  onClear,
  aspectHint,
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required ? "*" : ""}
      </label>
      <input
        type="file"
        accept={CATEGORY_PAGE_IMAGE_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          const { file: allowed, error } = consumeAllowedCategoryPageImage(
            file,
            e.target
          );
          if (error) {
            onPick(null, error);
            return;
          }
          if (allowed) {
            onPick(allowed, "");
          }
        }}
        className="w-full text-xs text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2.5 file:py-1 file:text-xs file:font-medium hover:file:bg-gray-50"
      />
      <p className="mt-1 text-[11px] text-gray-400">
        {aspectHint ? `${aspectHint} · ` : ""}
        {CATEGORY_PAGE_IMAGE_ACCEPT_HINT}
      </p>
      {preview && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-24 w-full object-cover rounded border bg-gray-100"
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
 * Shared Admin Config Form for 3-banner Hero Grid layouts
 * (`variant`: "big-left" | "big-right").
 * Reuses existing `/api/home-pages/[id]/components` & webp/avif upload flow.
 */
export default function HeroGridConfigForm({
  pageId,
  instanceId,
  variant = "big-left",
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  backLabel = "Back to Top Banner",
}) {
  const isListMode = !instanceId;
  const headingLabel =
    variant === "big-right" ? "Hero Grid - Big Right" : "Hero Grid - Big Left";

  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stateRegion, setStateRegion] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [largeBanner, setLargeBanner] = useState(emptyLargeSlot);
  const [smallBanner1, setSmallBanner1] = useState(emptySmallSlot);
  const [smallBanner2, setSmallBanner2] = useState(emptySmallSlot);
  const [loading, setLoading] = useState(!isListMode);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!instanceId || !pageId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/home-pages/${pageId}/components?instanceId=${encodeURIComponent(
            instanceId
          )}`
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load");
        if (cancelled) return;

        const comp = data.component;
        const hg = comp?.heroGrid || {};
        const lb = hg.largeBanner || {};
        const sb1 = hg.smallBanner1 || {};
        const sb2 = hg.smallBanner2 || {};

        setTitle(comp?.title || "");
        setIsActive(comp?.isActive !== false && hg.isActive !== false);
        setStateRegion(hg.state || "all");
        setStartDate(hg.startDate ? formatDateTimeForInput(hg.startDate) : "");
        setEndDate(hg.endDate ? formatDateTimeForInput(hg.endDate) : "");

        setLargeBanner({
          desktopImage: lb.desktopImage || "",
          mobileImage: lb.mobileImage || "",
          desktopFile: null,
          mobileFile: null,
          desktopPreview: lb.desktopImage || "",
          mobilePreview: lb.mobileImage || "",
          url: lb.url || "",
          heading: lb.heading || "",
          description: lb.description || "",
          buttonText: lb.buttonText || "",
          buttonUrl: lb.buttonUrl || "",
          overlayAlign: lb.overlayAlign || "bottom-left",
          textColor: lb.textColor || "#ffffff",
          showGradientOverlay: lb.showGradientOverlay !== false,
        });

        setSmallBanner1({
          desktopImage: sb1.desktopImage || "",
          mobileImage: sb1.mobileImage || "",
          desktopFile: null,
          mobileFile: null,
          desktopPreview: sb1.desktopImage || "",
          mobilePreview: sb1.mobileImage || "",
          url: sb1.url || "",
        });

        setSmallBanner2({
          desktopImage: sb2.desktopImage || "",
          mobileImage: sb2.mobileImage || "",
          desktopFile: null,
          mobileFile: null,
          desktopPreview: sb2.desktopImage || "",
          mobilePreview: sb2.mobileImage || "",
          url: sb2.url || "",
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pageId, instanceId]);

  const handleDeleteSet = async (setInstanceId, label) => {
    if (
      !window.confirm(
        `Delete "${label || "this hero grid"}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(setInstanceId);
    setError("");
    try {
      const res = await fetch(
        `/api/home-pages/${pageId}/components?instanceId=${encodeURIComponent(
          setInstanceId
        )}`,
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

  const handleSlotImagePick = (setter, field) => (file, pickError) => {
    if (pickError) {
      setError(pickError);
      return;
    }
    if (!file) return;
    setError("");
    const fileKey = field === "mobile" ? "mobileFile" : "desktopFile";
    const previewKey = field === "mobile" ? "mobilePreview" : "desktopPreview";
    setter((prev) => ({
      ...prev,
      [fileKey]: file,
      [previewKey]: URL.createObjectURL(file),
    }));
  };

  const handleSlotImageClear = (setter, field) => () => {
    if (field === "mobile") {
      setter((prev) => ({
        ...prev,
        mobileFile: null,
        mobileImage: "",
        mobilePreview: "",
      }));
    } else {
      setter((prev) => ({
        ...prev,
        desktopFile: null,
        desktopImage: "",
        desktopPreview: "",
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pageId || !instanceId) return;
    setError("");

    if (!largeBanner.desktopFile && !largeBanner.desktopImage) {
      setError("Large Banner: Desktop image is required.");
      return;
    }
    if (!smallBanner1.desktopFile && !smallBanner1.desktopImage) {
      setError("Small Banner 1 (Top Small Slot): Desktop image is required.");
      return;
    }
    if (!smallBanner2.desktopFile && !smallBanner2.desktopImage) {
      setError("Small Banner 2 (Bottom Small Slot): Desktop image is required.");
      return;
    }

    const parsedStart = startDate ? new Date(startDate) : null;
    const parsedEnd = endDate ? new Date(endDate) : null;
    if (
      parsedStart &&
      parsedEnd &&
      !isNaN(parsedStart.getTime()) &&
      !isNaN(parsedEnd.getTime()) &&
      parsedEnd < parsedStart
    ) {
      setError("Hide After (End Date & Time) cannot be earlier than Show From (Start Date & Time).");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("instanceId", instanceId);
      fd.append("title", title.trim() || largeBanner.heading.trim());
      fd.append(
        "heroGridMeta",
        JSON.stringify({
          variant,
          title: title.trim() || largeBanner.heading.trim(),
          state: stateRegion || "all",
          isActive,
          startDate: toIsoStringOrNull(startDate),
          endDate: toIsoStringOrNull(endDate),
          largeBanner: {
            desktopImage: largeBanner.desktopImage || "",
            mobileImage: largeBanner.mobileImage || "",
            url: largeBanner.url || "",
            heading: largeBanner.heading || "",
            description: largeBanner.description || "",
            buttonText: largeBanner.buttonText || "",
            buttonUrl: largeBanner.buttonUrl || "",
            overlayAlign: largeBanner.overlayAlign || "bottom-left",
            textColor: largeBanner.textColor || "#ffffff",
            showGradientOverlay: largeBanner.showGradientOverlay !== false,
          },
          smallBanner1: {
            desktopImage: smallBanner1.desktopImage || "",
            mobileImage: smallBanner1.mobileImage || "",
            url: smallBanner1.url || "",
          },
          smallBanner2: {
            desktopImage: smallBanner2.desktopImage || "",
            mobileImage: smallBanner2.mobileImage || "",
            url: smallBanner2.url || "",
          },
        })
      );

      if (largeBanner.desktopFile) fd.append("largeDesktopFile", largeBanner.desktopFile);
      if (largeBanner.mobileFile) fd.append("largeMobileFile", largeBanner.mobileFile);
      if (smallBanner1.desktopFile) fd.append("small1DesktopFile", smallBanner1.desktopFile);
      if (smallBanner1.mobileFile) fd.append("small1MobileFile", smallBanner1.mobileFile);
      if (smallBanner2.desktopFile) fd.append("small2DesktopFile", smallBanner2.desktopFile);
      if (smallBanner2.mobileFile) fd.append("small2MobileFile", smallBanner2.mobileFile);

      const res = await fetch(`/api/home-pages/${pageId}/components`, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");

      onSaved?.(data.instance);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isListMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {headingLabel}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Existing 3-banner hero grid sets. Click Add New to create another block.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LayoutBadge variant={variant} />
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#C4161D]"
            >
              <Icon icon="mdi:plus" className="text-lg" />
              Add New
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {existingSets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <Icon
              icon="mdi:view-dashboard-outline"
              className="mx-auto mb-2 text-3xl text-gray-400"
            />
            <p className="text-sm text-gray-600">
              No {headingLabel} sets added yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click Add New to configure your Large Hero Banner + 2 Small Banners.
            </p>
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
                    {set.label || set.title || headingLabel}
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
                        set.label || set.title || headingLabel
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
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  const timerBadge = getBannerTimerStatus(startDate, endDate);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-1"
            >
              <Icon icon="mdi:arrow-left" /> {backLabel}
            </button>
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            {setLabel || headingLabel}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Fits inside the storefront Top Banner container space (max 420px desktop height).
          </p>
        </div>
        <LayoutBadge variant={variant} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Common Active Toggle + Optional Label */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#ED1C24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm font-medium">
            {isActive ? "Active (Visible on Storefront)" : "Inactive (Hidden)"}
          </span>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Admin Label (Optional — shown in Order list)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Festive Hero Grid"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* A) LARGE BANNER (MAIN SLOT) */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/50">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              1. Large Hero Banner (Main Slot —{" "}
              {variant === "big-right" ? "Right ~66%" : "Left ~66%"})
            </h4>
            <p className="text-[11px] text-gray-500">
              Recommended ~960×420px aspect ratio. Overlay text & button are completely optional.
            </p>
          </div>
          <span className="rounded bg-[#ED1C24]/10 text-[#ED1C24] px-2 py-0.5 text-[11px] font-semibold">
            Main Slot
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadSlot
            label="Desktop Banner Image"
            required
            preview={largeBanner.desktopPreview}
            onPick={handleSlotImagePick(setLargeBanner, "desktop")}
            onClear={handleSlotImageClear(setLargeBanner, "desktop")}
          />
          <ImageUploadSlot
            label="Mobile Banner Image (Optional)"
            preview={largeBanner.mobilePreview}
            onPick={handleSlotImagePick(setLargeBanner, "mobile")}
            onClear={handleSlotImageClear(setLargeBanner, "mobile")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Banner Click URL (Optional)
          </label>
          <input
            type="text"
            value={largeBanner.url}
            onChange={(e) =>
              setLargeBanner((prev) => ({ ...prev, url: e.target.value }))
            }
            placeholder="/category/... or https://..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* Customizable Overlay Content (Optional) */}
        <div className="rounded-lg border border-gray-200 bg-white p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-800">
              Customizable Overlay Content (Optional)
            </span>
            <span className="text-[11px] text-gray-400">
              Leave blank to show plain banner image without any overlay box
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Heading
              </label>
              <input
                type="text"
                value={largeBanner.heading}
                onChange={(e) =>
                  setLargeBanner((prev) => ({ ...prev, heading: e.target.value }))
                }
                placeholder="e.g. The Great Living Room Upgrade."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={largeBanner.buttonText}
                onChange={(e) =>
                  setLargeBanner((prev) => ({
                    ...prev,
                    buttonText: e.target.value,
                  }))
                }
                placeholder="e.g. Shop Now"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={largeBanner.description}
                onChange={(e) =>
                  setLargeBanner((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Short offer subtitle or highlight text..."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Button URL
              </label>
              <input
                type="text"
                value={largeBanner.buttonUrl}
                onChange={(e) =>
                  setLargeBanner((prev) => ({
                    ...prev,
                    buttonUrl: e.target.value,
                  }))
                }
                placeholder="/category/... or https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 items-center">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Overlay Alignment
              </label>
              <select
                value={largeBanner.overlayAlign}
                onChange={(e) =>
                  setLargeBanner((prev) => ({
                    ...prev,
                    overlayAlign: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="bottom-left">Bottom Left (Default)</option>
                <option value="center-left">Center Left</option>
                <option value="bottom-center">Bottom Center</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={largeBanner.textColor || "#ffffff"}
                  onChange={(e) =>
                    setLargeBanner((prev) => ({
                      ...prev,
                      textColor: e.target.value,
                    }))
                  }
                  className="h-8 w-10 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLargeBanner((prev) => ({ ...prev, textColor: "#ffffff" }))
                  }
                  className="text-[11px] rounded border px-2 py-1 hover:bg-gray-50"
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLargeBanner((prev) => ({ ...prev, textColor: "#111827" }))
                  }
                  className="text-[11px] rounded border px-2 py-1 hover:bg-gray-50"
                >
                  Dark
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 sm:pt-4">
              <input
                id={`grad-${instanceId}`}
                type="checkbox"
                checked={largeBanner.showGradientOverlay !== false}
                onChange={(e) =>
                  setLargeBanner((prev) => ({
                    ...prev,
                    showGradientOverlay: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[#ED1C24] rounded"
              />
              <label
                htmlFor={`grad-${instanceId}`}
                className="text-xs font-medium text-gray-700 cursor-pointer"
              >
                Dark Gradient Overlay
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* B) SMALL BANNERS (TOP SMALL + BOTTOM SMALL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              2. Small Banner 1 (Top Small)
            </h4>
            <span className="text-[11px] text-gray-500">Top half</span>
          </div>
          <ImageUploadSlot
            label="Desktop Image"
            required
            preview={smallBanner1.desktopPreview}
            onPick={handleSlotImagePick(setSmallBanner1, "desktop")}
            onClear={handleSlotImageClear(setSmallBanner1, "desktop")}
          />
          <ImageUploadSlot
            label="Mobile Image (Optional)"
            preview={smallBanner1.mobilePreview}
            onPick={handleSlotImagePick(setSmallBanner1, "mobile")}
            onClear={handleSlotImageClear(setSmallBanner1, "mobile")}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Banner Click URL (Optional)
            </label>
            <input
              type="text"
              value={smallBanner1.url}
              onChange={(e) =>
                setSmallBanner1((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="/category/... or https://..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              3. Small Banner 2 (Bottom Small)
            </h4>
            <span className="text-[11px] text-gray-500">Bottom half</span>
          </div>
          <ImageUploadSlot
            label="Desktop Image"
            required
            preview={smallBanner2.desktopPreview}
            onPick={handleSlotImagePick(setSmallBanner2, "desktop")}
            onClear={handleSlotImageClear(setSmallBanner2, "desktop")}
          />
          <ImageUploadSlot
            label="Mobile Image (Optional)"
            preview={smallBanner2.mobilePreview}
            onPick={handleSlotImagePick(setSmallBanner2, "mobile")}
            onClear={handleSlotImageClear(setSmallBanner2, "mobile")}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Banner Click URL (Optional)
            </label>
            <input
              type="text"
              value={smallBanner2.url}
              onChange={(e) =>
                setSmallBanner2((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="/category/... or https://..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* C) TARGET REGION & SCHEDULE TIMER (REUSED CONTROLS) */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/50">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Target Region / State
          </label>
          <select
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            className="w-full sm:w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Regions (Default)</option>
            <option value="karnataka">Karnataka (Unilet)</option>
            <option value="tamilnadu">Tamil Nadu</option>
            <option value="andhra">Andhra Pradesh</option>
            <option value="kerala">Kerala</option>
            <option value="telangana">Telangana</option>
          </select>
        </div>

        <div className="pt-3 border-t border-gray-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <span>⏰</span> Schedule / Timer (Optional)
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${timerBadge.color}`}
            >
              {timerBadge.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Show From (Start Date & Time)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Hide After (End Date & Time)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
              />
            </div>
          </div>
          {(startDate || endDate) && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[11px] text-gray-500 hover:text-red-600 underline"
              >
                Clear Schedule (Show Always)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${headingLabel}`}
        </button>
      </div>
    </form>
  );
}

