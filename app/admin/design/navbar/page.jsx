"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";

const SOLID_PRESETS = [
  { name: "Sathya Red (Default)", color: "#ED1C24" },
  { name: "Dark Charcoal", color: "#161616" },
  { name: "Night Black", color: "#121212" },
  { name: "Dark Crimson", color: "#B91C1C" },
  { name: "Royal Navy", color: "#1E3A8A" },
  { name: "Slate Navy", color: "#0F172A" },
  { name: "Emerald Green", color: "#047857" },
  { name: "Purple Royalty", color: "#6B21A8" },
  { name: "Warm Orange", color: "#EA580C" },
];

const GRADIENT_PRESETS = [
  {
    name: "Blue to Pink (Radial)",
    start: "#3F5EFB",
    end: "#FC466B",
    direction: "radial",
  },
  {
    name: "Red Sunset (Brand)",
    start: "#ED1C24",
    end: "#8B0000",
    direction: "to right",
  },
  {
    name: "Dark Charcoal To Black",
    start: "#242424",
    end: "#121212",
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
  { label: "Radial (Center Out)", value: "radial" },
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
  headerStyle: "classic",
  flashSaleBadge: "FLASH SALE",
  flashSaleText: "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
  storeCountText: "180+ Stores in South India",
  helplineText: "+91 88805 98985",
  zeroDownpaymentText: "ZERO DOWNPAYMENT AVAILABLE",
  isActive: true,
};

export default function NavbarSettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("design"); // "design" | "colors"

  // Sync tab with URL query parameter on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "colors" || tabParam === "design") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

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
          headerStyle: json.data.headerStyle || "classic",
          flashSaleBadge: json.data.flashSaleBadge || "FLASH SALE",
          flashSaleText:
            json.data.flashSaleText ||
            "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
          storeCountText:
            json.data.storeCountText || "180+ Stores in South India",
          helplineText: json.data.helplineText || "+91 88805 98985",
          zeroDownpaymentText:
            json.data.zeroDownpaymentText || "ZERO DOWNPAYMENT AVAILABLE",
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
        toast.success("Settings saved successfully and updated live!");
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
    if (confirm("Reset settings to original Sathya defaults?")) {
      setForm(DEFAULT_SETTINGS);
    }
  };

  // Compute CSS background for live preview
  const previewBackground =
    form.bgType === "gradient"
      ? (form.gradientDirection === "radial"
        ? `radial-gradient(circle, ${form.gradientStart} 0%, ${form.gradientEnd} 100%)`
        : `linear-gradient(${form.gradientDirection}, ${form.gradientStart}, ${form.gradientEnd})`)
      : form.bgColor;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="line-md:loading-loop" className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* ─── MAIN TITLE & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
              <Icon icon="mdi:page-layout-header" className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Header &amp; Navbar Settings
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Customize storefront header layout architecture, announcement text, and navbar colors.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs hover:shadow active:scale-95"
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

      {/* ─── MODERN SEGMENTED TABS (SPLIT INTO HEADER DESIGN & COLOR SETTINGS) ─── */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col sm:flex-row gap-1.5">
        {/* TAB 1 BUTTON: HEADER DESIGN */}
        <button
          type="button"
          onClick={() => switchTab("design")}
          className={`flex-1 flex items-center justify-between sm:justify-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "design"
            ? "bg-red-600 text-white shadow-xs"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              icon="mdi:view-dashboard-outline"
              className={`w-5 h-5 ${activeTab === "design" ? "text-white" : "text-gray-400"}`}
            />
            <span>Header Design &amp; Layout</span>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${activeTab === "design"
              ? "bg-white/20 text-white"
              : "bg-red-50 text-red-600 border border-red-200/60"
              }`}
          >
            {form.headerStyle === "modern" ? "Modern Retail" : "Classic Red"}
          </span>
        </button>

        {/* TAB 2 BUTTON: NAVBAR COLORS */}
        <button
          type="button"
          onClick={() => switchTab("colors")}
          className={`flex-1 flex items-center justify-between sm:justify-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "colors"
            ? "bg-red-600 text-white shadow-xs"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              icon="mdi:palette-swatch-outline"
              className={`w-5 h-5 ${activeTab === "colors" ? "text-white" : "text-gray-400"}`}
            />
            <span>Navbar Colors &amp; Styling</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-2xs"
              style={{
                background:
                  form.bgType === "gradient"
                    ? `linear-gradient(to right, ${form.gradientStart}, ${form.gradientEnd})`
                    : form.bgColor,
              }}
            />
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${activeTab === "colors"
                ? "bg-white/20 text-white"
                : "bg-gray-100 text-gray-600"
                }`}
            >
              {form.bgType === "gradient" ? "Gradient" : form.bgColor}
            </span>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1 CONTENT: HEADER DESIGN & LAYOUT (தலைப்பு வடிவமைப்பு)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "design" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon icon="mdi:page-layout-header" className="text-red-600 w-5 h-5" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Select Storefront Header Layout (தலைப்பு வடிவமைப்பு)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Choose between the Classic Sathya Red Header or the Modern Retail 3-Tier Header.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                Active: {form.headerStyle === "modern" ? "Option 2: Modern Retail" : "Option 1: Classic Red"}
              </span>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OPTION 1: CLASSIC SATHYA RED */}
                <div
                  onClick={() => setForm({ ...form, headerStyle: "classic" })}
                  className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${form.headerStyle === "classic"
                    ? "border-red-600 bg-red-50/20 ring-2 ring-red-500/20 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full">
                            Option 1
                          </span>
                          <span className="text-xs font-semibold text-gray-500">Traditional</span>
                        </div>
                        <h3 className="text-base font-black text-gray-900 mt-1">
                          Classic Sathya Red Header
                        </h3>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${form.headerStyle === "classic"
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-gray-300 bg-white"
                          }`}
                      >
                        {form.headerStyle === "classic" && (
                          <Icon icon="mdi:check" className="w-4 h-4 stroke-[3]" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      The iconic Sathya brand header with a pure white top row, full search, active offer countdown timer, and a bold red category bar with yellow accent line.
                    </p>

                    {/* Visual Mockup */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs mb-4">
                      {/* Top Bar Mockup */}
                      <div className="bg-white px-3 py-2 border-b flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-1.5 font-bold text-red-600">
                          <div className="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center text-[8px] font-black">
                            S
                          </div>
                          <span>SATHYA</span>
                        </div>
                        <div className="h-5 bg-gray-100 rounded-full px-2.5 flex items-center text-[9px] text-gray-400 w-36">
                          Search QLED, Mobiles...
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <span>Wishlist</span>
                          <span>Cart (2)</span>
                          <span className="text-red-600 font-bold">Login</span>
                        </div>
                      </div>
                      {/* Red Navbar Mockup */}
                      <div className="bg-[#ED1C24] border-t-2 border-[#FFF200] text-white px-3 py-1.5 text-[9px] font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:menu" className="w-3 h-3" /> Menu
                          </span>
                          <span className="opacity-90">Televisions</span>
                          <span className="opacity-90">Appliances</span>
                          <span className="opacity-90">Mobiles</span>
                        </div>
                        <span className="text-[8.5px] bg-white/20 px-1.5 py-0.5 rounded text-yellow-200">
                          Mega Dropdown
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Preserves all original Sathya brand elements</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Integrated deal countdown timer &amp; region selector</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Full multi-column hover mega-dropdown</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Theme: White Top + Brand Red Navbar</span>
                    <span
                      className={`font-bold ${form.headerStyle === "classic" ? "text-red-600" : "text-gray-400"
                        }`}
                    >
                      {form.headerStyle === "classic" ? "✓ Currently Active" : "Click to Select"}
                    </span>
                  </div>
                </div>

                {/* OPTION 2: MODERN RETAIL DARK & WHITE */}
                <div
                  onClick={() => setForm({ ...form, headerStyle: "modern" })}
                  className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${form.headerStyle === "modern"
                    ? "border-red-600 bg-red-50/20 ring-2 ring-red-500/20 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            Option 2
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">Recommended</span>
                        </div>
                        <h3 className="text-base font-black text-gray-900 mt-1">
                          Modern Retail Dark &amp; White Header
                        </h3>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${form.headerStyle === "modern"
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-gray-300 bg-white"
                          }`}
                      >
                        {form.headerStyle === "modern" && (
                          <Icon icon="mdi:check" className="w-4 h-4 stroke-[3]" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      A sleek, high-conversion 3-tier header inspired by modern omnichannel electronics superstores: Dark announcement bar, white middle bar with modern search and avatar, plus a dark charcoal category navbar with full mega dropdown!
                    </p>

                    {/* Visual Mockup */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs mb-4">
                      {/* Tier 1: Dark Flash Sale Bar */}
                      <div className="bg-[#121212] text-white px-3 py-1 text-[9px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-amber-400">⚡</span>
                          <span className="bg-red-600 text-white px-1 py-0.2 rounded font-bold text-[8px]">
                            FLASH SALE
                          </span>
                          <span className="text-gray-300 truncate">Up to 55% Off TVs &amp; ACs</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-[8.5px] shrink-0">
                          <span className="bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 text-black font-extrabold px-1.5 py-0.2 rounded-full text-[7.5px]">🔥 Deals</span>
                          <span>180+ Stores</span>
                          <span className="text-amber-300 font-bold">+91 88805 98985</span>
                          <span className="text-white font-semibold">Sign In</span>
                        </div>
                      </div>
                      {/* Tier 2: White Main Bar */}
                      <div className="bg-white px-3 py-2 border-b flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="font-black text-red-600 text-xs px-1.5 py-0.5 rounded bg-red-50 border border-red-200">SATHYA</span>
                        </div>
                        <div className="h-5 bg-gray-100 rounded-lg px-2 flex items-center text-[8.5px] text-gray-500 border border-gray-200 w-36 justify-between">
                          <span>All Category ▾</span>
                          <span className="text-gray-400">Search for &ldquo;...&rdquo;</span>
                          <span className="w-3.5 h-3.5 bg-red-600 text-white rounded flex items-center justify-center text-[7px]">
                            🔍
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[9px] text-gray-700 font-semibold">
                          <span>Store</span>
                          <span>Wishlist</span>
                          <span>Cart (2)</span>
                        </div>
                      </div>
                      {/* Tier 3: Dark Charcoal Category Navbar */}
                      <div className="bg-[#161616] text-white px-2 py-1 text-[9px] font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[8.5px] flex items-center gap-0.5">
                            <Icon icon="mdi:menu" className="w-2.5 h-2.5" /> All Categories ▾
                          </span>
                          <span className="text-gray-200">Televisions</span>
                          <span className="text-gray-200">Appliances</span>
                          <span className="text-gray-200">ACs</span>
                        </div>
                        <span className="text-amber-400 font-extrabold text-[8px]">
                          ⚡ ZERO DOWNPAYMENT
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>⚡ Top Flash Sale announcement bar with Stores &amp; 24/7 Helpline</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Deliver to Pincode pill right next to logo with location modal</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dark Category Navbar (`#161616`) with Full Hover Mega Dropdown</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Theme: Dark Top + White Main + Dark Nav</span>
                    <span
                      className={`font-bold ${form.headerStyle === "modern" ? "text-red-600" : "text-gray-400"
                        }`}
                    >
                      {form.headerStyle === "modern" ? "✓ Currently Active" : "Click to Select"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── MODERN HEADER TEXT SETTINGS CARD ─── */}
              {form.headerStyle === "modern" && (
                <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/60 rounded-2xl border border-gray-200 space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                        <Icon icon="mdi:format-text" className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Modern Header Announcement &amp; Badge Text Settings
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          flashSaleBadge: "FLASH SALE",
                          flashSaleText:
                            "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
                          storeCountText: "180+ Stores in South India",
                          helplineText: "+91 88805 98985",
                          zeroDownpaymentText: "ZERO DOWNPAYMENT AVAILABLE",
                        }))
                      }
                      className="text-xs font-semibold text-red-600 hover:text-red-700 underline cursor-pointer"
                    >
                      Restore Sample Text
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Flash Sale Badge */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Flash Sale Badge
                      </label>
                      <input
                        type="text"
                        value={form.flashSaleBadge || ""}
                        onChange={(e) =>
                          setForm({ ...form, flashSaleBadge: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none font-semibold text-red-600"
                        placeholder="FLASH SALE"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1">Small badge on top left</p>
                    </div>

                    {/* Stores Count Text */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Stores Count Label
                      </label>
                      <input
                        type="text"
                        value={form.storeCountText || ""}
                        onChange={(e) =>
                          setForm({ ...form, storeCountText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                        placeholder="180+ Stores in South India"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1">Links to store locator</p>
                    </div>

                    {/* 24/7 Helpline */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        24/7 Helpline Number
                      </label>
                      <input
                        type="text"
                        value={form.helplineText || ""}
                        onChange={(e) =>
                          setForm({ ...form, helplineText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none font-bold text-amber-600"
                        placeholder="+91 88805 98985"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1">Direct click-to-call number</p>
                    </div>

                    {/* Flash Sale Announcement Text */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Top Flash Sale Announcement Text
                      </label>
                      <input
                        type="text"
                        value={form.flashSaleText || ""}
                        onChange={(e) =>
                          setForm({ ...form, flashSaleText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none font-medium"
                        placeholder="Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1">
                        Shown across the top bar next to the Flash Sale badge
                      </p>
                    </div>

                    {/* Right Deal Highlight */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Category Bar Right Deal Badge
                      </label>
                      <input
                        type="text"
                        value={form.zeroDownpaymentText || ""}
                        onChange={(e) =>
                          setForm({ ...form, zeroDownpaymentText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none font-bold text-amber-500"
                        placeholder="ZERO DOWNPAYMENT AVAILABLE"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1">
                        Shown on the far right of the category navbar
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2 CONTENT: NAVBAR COLORS & STYLING (வண்ண அமைப்புகள்)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "colors" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Real-Time Live Preview */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:eye-outline" className="text-gray-600 w-5 h-5" />
                <h2 className="text-sm font-bold text-gray-800">
                  Real-Time Category Navbar Preview
                </h2>
              </div>
              <span className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 font-semibold shadow-2xs">
                Live simulation
              </span>
            </div>

            <div className="p-6 bg-gray-100 flex flex-col items-center justify-center">
              <div className="w-full max-w-5xl shadow-md rounded-xl overflow-hidden bg-white">
                {/* Simulated top bar */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-b text-xs text-gray-400">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm tracking-wide">
                    <span>SATHYA</span>
                  </div>
                  <div className="flex-1 max-w-md mx-4 h-7 bg-gray-100 rounded-lg border border-gray-200 px-3 flex items-center text-gray-400 text-xs">
                    Search QLED TVs, 5G Mobiles...
                  </div>
                  <div className="flex gap-4 text-gray-600 font-medium">
                    <span>Wishlist</span>
                    <span>Cart (2)</span>
                  </div>
                </div>

                {/* Custom Navbar Preview with Dynamic Styles */}
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
                      <span>All Categories</span>
                    </div>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">TV &amp; Audio</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Refrigerators</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Washing Machines</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Air Conditioners</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Smartphones</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Kitchen Appliances</span>
                    <span className="cursor-pointer hover:opacity-80 transition-opacity">Deal Zone</span>
                  </div>
                </div>

                {/* Fake content area */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 h-24 flex items-center justify-center text-gray-400 text-xs">
                  [ Storefront Page Content / Banner Area ]
                </div>
              </div>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Background Configuration Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-5">
              <div className="border-b pb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Icon icon="mdi:format-paint" className="text-red-600 w-5 h-5" />
                  Navbar Background
                </h2>
              </div>

              {/* Type Toggle: Solid vs Gradient */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Background Color Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, bgType: "solid" }))}
                    className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${form.bgType === "solid"
                      ? "border-red-600 bg-red-50 text-red-700 shadow-xs ring-1 ring-red-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-400 shrink-0"
                      style={{ background: form.bgColor }}
                    />
                    Single Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, bgType: "gradient" }))}
                    className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${form.bgType === "gradient"
                      ? "border-red-600 bg-red-50 text-red-700 shadow-xs ring-1 ring-red-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-400 shrink-0"
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
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Select Single Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.bgColor}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, bgColor: e.target.value }))
                        }
                        className="w-12 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                      />
                      <input
                        type="text"
                        value={form.bgColor}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, bgColor: e.target.value }))
                        }
                        placeholder="#ED1C24"
                        className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Solid Presets */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Popular Color Presets:
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${form.bgColor.toLowerCase() === preset.color.toLowerCase()
                            ? "border-red-600 ring-2 ring-red-500/20 font-bold bg-red-50/50 text-red-700"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                            }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-2xs"
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
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Start Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.gradientStart}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, gradientStart: e.target.value }))
                          }
                          className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
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
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        End Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.gradientEnd}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, gradientEnd: e.target.value }))
                          }
                          className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
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
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Gradient Direction
                    </label>
                    <select
                      value={form.gradientDirection}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gradientDirection: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
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
                      Popular Gradient Presets:
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
                          className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left text-xs transition-all"
                        >
                          <span
                            className="w-6 h-6 rounded-lg shadow-2xs flex-shrink-0"
                            style={{
                              background:
                                preset.direction === "radial"
                                  ? `radial-gradient(circle, ${preset.start} 0%, ${preset.end} 100%)`
                                  : `linear-gradient(${preset.direction}, ${preset.start}, ${preset.end})`,
                            }}
                          />
                          <span className="font-semibold text-gray-700 truncate">
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
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Icon icon="mdi:format-text" className="text-red-600 w-5 h-5" />
                  Text &amp; Accent Line Colors
                </h2>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Navbar Text Color
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Sets the color of category links, menu button, and text items.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, textColor: e.target.value }))
                    }
                    className="w-12 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                  />
                  <input
                    type="text"
                    value={form.textColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, textColor: e.target.value }))
                    }
                    placeholder="#FFFFFF"
                    className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-2.5">
                  {["#FFFFFF", "#000000", "#111827", "#FFF200", "#F3F4F6"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, textColor: c }))}
                      className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 flex items-center gap-1.5 hover:bg-gray-50 font-medium"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ background: c }}
                      />
                      {c === "#FFFFFF"
                        ? "Pure White"
                        : c === "#000000" || c === "#111827"
                          ? "Deep Black"
                          : c === "#FFF200"
                            ? "Sathya Yellow"
                            : c}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Top Border Line Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Top Accent Stripe Line
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Accent stripe along the top edge of the navbar (Default: Sathya Yellow #FFF200).
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Border Line Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.topBorderColor}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, topBorderColor: e.target.value }))
                        }
                        className="w-12 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 bg-white shadow-2xs"
                      />
                      <input
                        type="text"
                        value={form.topBorderColor}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, topBorderColor: e.target.value }))
                        }
                        placeholder="#FFF200"
                        className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      {["#FFF200", "#ED1C24", "#FFFFFF", "#3B82F6", "#10B981"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, topBorderColor: c }))}
                          className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 flex items-center gap-1.5 hover:bg-gray-50 font-medium"
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
      )}
    </div>
  );
}
