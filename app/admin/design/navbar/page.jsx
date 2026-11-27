"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  FiSave,
  FiRotateCcw,
  FiCornerUpLeft,
  FiLayout,
  FiFileText,
  FiDroplet,
  FiEye,
  FiClock,
} from "react-icons/fi";
import { DEFAULT_HEADER_SETTINGS, mergeHeaderSettings } from "@/lib/headerSettings";
import LivePreview from "@/components/admin/header-builder/LivePreview";
import DesignTab from "@/components/admin/header-builder/DesignTab";
import ContentTab from "@/components/admin/header-builder/ContentTab";
import ColorsTab from "@/components/admin/header-builder/ColorsTab";
import VisibilityTab from "@/components/admin/header-builder/VisibilityTab";

const TABS = [
  { id: "design", label: "Design", Icon: FiLayout },
  { id: "content", label: "Content", Icon: FiFileText },
  { id: "colors", label: "Colors", Icon: FiDroplet },
  { id: "visibility", label: "Visibility", Icon: FiEye },
];

export default function HeaderBuilderPage() {
  const [draft, setDraft] = useState(DEFAULT_HEADER_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState(DEFAULT_HEADER_SETTINGS);
  const [versions, setVersions] = useState([]);
  const [activeTab, setActiveTab] = useState("design");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const syncStorefrontCache = useCallback((config) => {
    try {
      localStorage.setItem("sathya_header_settings_v2", JSON.stringify(config));
      window.dispatchEvent(new Event("sathya_header_settings_updated"));
    } catch { }
  }, []);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/header-settings/versions", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setVersions(json.data);
      }
    } catch { }
  }, [getAuthHeaders]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/header-settings?fresh=1", { cache: "no-store" });
      const json = await res.json();
      if (json.data) {
        const merged = mergeHeaderSettings(json.data);
        setDraft(merged);
        setSavedSnapshot(merged);
      }
    } catch {
      toast.error("Failed to load header settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchVersions();
  }, [fetchSettings, fetchVersions]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSnapshot),
    [draft, savedSnapshot]
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/header-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const merged = mergeHeaderSettings(json.data);
        setDraft(merged);
        setSavedSnapshot(merged);
        syncStorefrontCache(merged);
        await fetchVersions();
        toast.success("Header settings saved!");
      } else {
        toast.error(json.message || "Failed to save settings");
      }
    } catch {
      toast.error("Error saving header settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all header settings back to defaults? Your previous version will be kept in Version History.")) {
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/header-settings/reset", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const merged = mergeHeaderSettings(json.data);
        setDraft(merged);
        setSavedSnapshot(merged);
        syncStorefrontCache(merged);
        await fetchVersions();
        toast.success("Header reset to defaults");
      } else {
        toast.error(json.message || "Failed to reset");
      }
    } catch {
      toast.error("Error resetting header settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId = null) => {
    try {
      setRestoring(true);
      const res = await fetch("/api/header-settings/versions/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(versionId ? { versionId } : {}),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const merged = mergeHeaderSettings(json.data);
        setDraft(merged);
        setSavedSnapshot(merged);
        syncStorefrontCache(merged);
        await fetchVersions();
        toast.success("Restored previous header version!");
      } else {
        toast.error(json.message || "No saved version to restore");
      }
    } catch {
      toast.error("Error restoring version");
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="text-sm font-semibold text-gray-500 animate-pulse">
          Loading Header Builder...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-14">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-extrabold text-gray-900">Header Builder</h1>
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Saved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Customize storefront header design, content, colors, and element visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleRestoreVersion(null)}
            disabled={restoring || versions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            <FiCornerUpLeft size={14} />
            Undo last save
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            <FiRotateCcw size={14} />
            Reset defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FiSave size={14} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {/* Sticky Live Preview at Top */}
      <LivePreview settings={draft} />

      {/* Main Content Area: Left Tabs/Form + Right Version History */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: 4-Tab Builder */}
        <div className="xl:col-span-9 space-y-5">
          {/* 4 Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${active
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div>
            {activeTab === "design" && (
              <DesignTab
                design={draft.design}
                onSelectDesign={(design) => setDraft({ ...draft, design })}
              />
            )}
            {activeTab === "content" && (
              <ContentTab
                settings={draft}
                onChange={setDraft}
                getAuthHeaders={getAuthHeaders}
              />
            )}
            {activeTab === "colors" && (
              <ColorsTab settings={draft} onChange={setDraft} />
            )}
            {activeTab === "visibility" && (
              <VisibilityTab settings={draft} onChange={setDraft} />
            )}
          </div>
        </div>

        {/* Right: Version History Side Card (Last 5 Versions) */}
        <div className="xl:col-span-3">
          <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 sticky top-[190px]">
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900">Version History</h3>
            </div>
            <p className="text-[11px] text-gray-500">
              Last 5 saved snapshots. Click Restore to roll back anytime.
            </p>

            {versions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                No previous saves yet.
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v, idx) => (
                  <div
                    key={v._id || idx}
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">
                        {v.note || "Saved version"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {v.createdAt
                          ? new Date(v.createdAt).toLocaleString()
                          : "Recent"}{" "}
                        • {v.settings?.design === "classic" ? "Classic" : "Modern"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(v._id)}
                      disabled={restoring}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 text-[11px] font-semibold text-gray-700 hover:text-red-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
