"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";

const SOLID_PRESETS = [
  { name: "Sathya Red (Default)", color: "#ED1C24" },
  { name: "Dark Crimson", color: "#B91C1C" },
  { name: "Royal Blue", color: "#1D4ED8" },
  { name: "Navy Blue", color: "#0F172A" },
  { name: "Emerald Green", color: "#047857" },
  { name: "Purple Royalty", color: "#6B21A8" },
  { name: "Deep Charcoal", color: "#1F2937" },
  { name: "Warm Orange", color: "#EA580C" },
];

const GRADIENT_PRESETS = [
  {
    name: "Red Sunset (Brand)",
    start: "#ED1C24",
    end: "#8B0000",
    direction: "to right",
  },
  {
    name: "Crimson Blaze",
    start: "#DC2626",
    end: "#F97316",
    direction: "to right",
  },
  {
    name: "Royal Purple",
    start: "#4C1D95",
    end: "#831843",
    direction: "to right",
  },
  {
    name: "Oceanic Blue",
    start: "#1E3A8A",
    end: "#0D9488",
    direction: "to right",
  },
  {
    name: "Emerald Glow",
    start: "#064E3B",
    end: "#059669",
    direction: "to right",
  },
  {
    name: "Midnight Luxury",
    start: "#111827",
    end: "#374151",
    direction: "to right",
  },
  {
    name: "Diagonal Sunset",
    start: "#C026D3",
    end: "#EA580C",
    direction: "135deg",
  },
  {
    name: "Golden Red",
    start: "#B91C1C",
    end: "#D97706",
    direction: "to right",
  },
];

const DIRECTIONS = [
  { label: "Left to Right (Horizontal)", value: "to right" },
  { label: "Right to Left", value: "to left" },
  { label: "Top to Bottom (Vertical)", value: "to bottom" },
  { label: "Bottom to Top", value: "to top" },
  { label: "Diagonal (Top-Left to Bottom-Right, 135°)", value: "135deg" },
  { label: "Diagonal (Bottom-Left to Top-Right, 45°)", value: "45deg" },
];

const DEFAULT_SETTINGS = {
  bgType: "solid",
  bgColor: "#ED1C24",
  gradientStart: "#ED1C24",
  gradientEnd: "#8B0000",
  gradientDirection: "to right",
  textColor: "#FFFFFF",
  topBorderColor: "#FFF200",
  showTopBorder: true,
  isActive: true,
};

export default function NavbarSettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/navbar-settings", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setForm({
          bgType: json.data.bgType || "solid",
          bgColor: json.data.bgColor || "#ED1C24",
          gradientStart: json.data.gradientStart || "#ED1C24",
          gradientEnd: json.data.gradientEnd || "#8B0000",
          gradientDirection: json.data.gradientDirection || "to right",
          textColor: json.data.textColor || "#FFFFFF",
          topBorderColor: json.data.topBorderColor || "#FFF200",
          showTopBorder: json.data.showTopBorder !== false,
          isActive: json.data.isActive !== false,
        });
      }
    } catch (err) {
      toast.error("Failed to fetch navbar settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/navbar-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        try {
          localStorage.setItem("sathya_navbar_settings_v1", JSON.stringify(form));
          window.dispatchEvent(new Event("sathya_navbar_settings_updated"));
        } catch { }
        toast.success("Navbar settings saved successfully!");
      } else {
        toast.error(json.message || "Failed to save settings");
      }
    } catch (err) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset navbar settings to original Sathya defaults?")) {
      setForm(DEFAULT_SETTINGS);
    }
  };

  // Compute CSS background for live preview
  const previewBackground =
    form.bgType === "gradient"
      ? `linear-gradient(${form.gradientDirection}, ${form.gradientStart}, ${form.gradientEnd})`
      : form.bgColor;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="line-md:loading-loop" className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading navbar settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icon icon="mdi:palette-swatch-outline" className="text-red-600 w-7 h-7" />
            Navbar Styling & Color Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize the storefront category navigation bar with solid or gradient colors, custom text color, and accent line.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow"
          >
            {saving ? (
              <>
                <Icon icon="line-md:loading-loop" className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save-outline" className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Live Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:eye-outline" className="text-gray-600 w-5 h-5" />
            <h2 className="text-sm font-semibold text-gray-800">Live Preview</h2>
          </div>
          <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border">
            Real-time simulation
          </span>
        </div>

        <div className="p-6 bg-gray-100 flex flex-col items-center justify-center">
          <div className="w-full max-w-5xl shadow-md rounded-md overflow-hidden bg-white">
            {/* Fake top bar */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-b text-xs text-gray-400">
              <span className="font-bold text-red-600 text-sm tracking-wide">SATHYA</span>
              <div className="flex-1 max-w-md mx-4 h-7 bg-gray-100 rounded-md border border-gray-200 px-3 flex items-center text-gray-400">
                Search products...
              </div>
              <div className="flex gap-4 text-gray-600">
                <span>Wishlist</span>
                <span>Cart (0)</span>
              </div>
            </div>

            {/* Custom Navbar Preview */}
            <div
              className="relative w-full min-h-[52px] px-6 flex items-center justify-center transition-all duration-300"
              style={{
                background: previewBackground,
                borderTop: form.showTopBorder ? `4px solid ${form.topBorderColor}` : "none",
                color: form.textColor,
              }}
            >
              <div className="flex items-center gap-6 overflow-x-auto text-sm font-bold whitespace-nowrap py-3">
                <div className="flex items-center gap-2 pr-4 border-r border-white/30 cursor-pointer">
                  <Icon icon="mdi:menu" className="w-5 h-5" />
                  <span>Menu</span>
                </div>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">TV & Audio</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Appliances</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Mobiles & Wearables</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Kitchen Appliances</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Utility Appliances</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Loyalty</span>
                <span className="cursor-pointer hover:opacity-80 transition-opacity">Blogs</span>
              </div>
            </div>

            {/* Fake banner below navbar */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 h-28 flex items-center justify-center text-gray-400 text-xs">
              [ Storefront Page Content / Banner Area ]
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Background Configuration Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="border-b pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:format-paint" className="text-red-600 w-5 h-5" />
              Navbar Background
            </h2>
          </div>

          {/* Type Toggle: Solid vs Gradient */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Background Color Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, bgType: "solid" }))}
                className={`py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-all ${
                  form.bgType === "solid"
                    ? "border-red-600 bg-red-50 text-red-700 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-gray-400"
                  style={{ background: form.bgColor }}
                />
                Single Color
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, bgType: "gradient" }))}
                className={`py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-all ${
                  form.bgType === "gradient"
                    ? "border-red-600 bg-red-50 text-red-700 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-gray-400"
                  style={{
                    background: `linear-gradient(to right, ${form.gradientStart}, ${form.gradientEnd})`,
                  }}
                />
                Gradient Color
              </button>
            </div>
          </div>

          {/* SOLID COLOR CONTROLS */}
          {form.bgType === "solid" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Single Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bgColor: e.target.value }))
                    }
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={form.bgColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bgColor: e.target.value }))
                    }
                    placeholder="#ED1C24"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Solid Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Popular Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOLID_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, bgColor: preset.color }))
                      }
                      title={preset.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-all ${
                        form.bgColor.toLowerCase() === preset.color.toLowerCase()
                          ? "border-red-600 ring-1 ring-red-600 font-bold"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ background: preset.color }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GRADIENT CONTROLS */}
          {form.bgType === "gradient" && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Start Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.gradientStart}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gradientStart: e.target.value }))
                      }
                      className="w-10 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={form.gradientStart}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gradientStart: e.target.value }))
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    End Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.gradientEnd}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gradientEnd: e.target.value }))
                      }
                      className="w-10 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={form.gradientEnd}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gradientEnd: e.target.value }))
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Direction */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Gradient Direction
                </label>
                <select
                  value={form.gradientDirection}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, gradientDirection: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {DIRECTIONS.map((dir) => (
                    <option key={dir.value} value={dir.value}>
                      {dir.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gradient Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Gradient Presets:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          gradientStart: preset.start,
                          gradientEnd: preset.end,
                          gradientDirection: preset.direction,
                        }))
                      }
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left text-xs transition-all"
                    >
                      <span
                        className="w-6 h-6 rounded-md shadow-xs flex-shrink-0"
                        style={{
                          background: `linear-gradient(${preset.direction}, ${preset.start}, ${preset.end})`,
                        }}
                      />
                      <span className="font-medium text-gray-700 truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Text & Accent Line Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:format-text" className="text-red-600 w-5 h-5" />
              Text & Accent Line Colors
            </h2>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Navbar Text Color
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Sets the color of category links, menu button, and custom links in the bar.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.textColor}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, textColor: e.target.value }))
                }
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={form.textColor}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, textColor: e.target.value }))
                }
                placeholder="#FFFFFF"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {["#FFFFFF", "#000000", "#111827", "#FFF200", "#F3F4F6"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, textColor: c }))}
                  className="px-2 py-1 rounded text-xs border border-gray-200 flex items-center gap-1 hover:bg-gray-50"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ background: c }}
                  />
                  {c === "#FFFFFF" ? "White" : c === "#000000" || c === "#111827" ? "Black" : c === "#FFF200" ? "Yellow" : c}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Top Border Line Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Top Accent Border Line
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  The thin accent stripe along the top edge of the navbar (Default: Yellow #FFF200).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showTopBorder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, showTopBorder: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {form.showTopBorder && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Border Line Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.topBorderColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, topBorderColor: e.target.value }))
                    }
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={form.topBorderColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, topBorderColor: e.target.value }))
                    }
                    placeholder="#FFF200"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {["#FFF200", "#ED1C24", "#FFFFFF", "#3B82F6", "#10B981"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, topBorderColor: c }))}
                      className="px-2 py-1 rounded text-xs border border-gray-200 flex items-center gap-1 hover:bg-gray-50"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ background: c }}
                      />
                      {c === "#FFF200" ? "Sathya Yellow" : c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
