"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  CATEGORY_PAGE_IMAGE_ACCEPT,
  consumeAllowedCategoryPageImage,
} from "@/lib/categoryPageComponents/registry";

export const ICON_COLOR_PRESETS = [
  {
    value: "light_red",
    label: "Light Red",
    circleClass: "bg-red-50 text-[#d72828] border border-red-100",
  },
  {
    value: "yellow",
    label: "Bright Yellow",
    circleClass: "bg-[#facc15] text-black shadow-2xs",
  },
  {
    value: "dark_red",
    label: "Dark Crimson",
    circleClass: "bg-[#991b1b] text-white shadow-2xs",
  },
  {
    value: "dark",
    label: "Slate / Dark",
    circleClass: "bg-[#18181b] text-white shadow-2xs",
  },
  {
    value: "green",
    label: "Emerald Green",
    circleClass: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  },
  {
    value: "blue",
    label: "Royal Blue",
    circleClass: "bg-blue-50 text-blue-600 border border-blue-100",
  },
];

export function getIconColorClass(key = "light_red") {
  const match = ICON_COLOR_PRESETS.find((c) => c.value === key);
  return match ? match.circleClass : "bg-red-50 text-[#d72828] border border-red-100";
}

export const POPULAR_ICONS = [
  { value: "mdi:store-clock-outline", label: "Store Clock / 60-Min Pickup" },
  { value: "mdi:cash-multiple", label: "Cash on Delivery / Doorstep" },
  { value: "mdi:tag-check-outline", label: "Price Match / Lowest Price" },
  { value: "mdi:store-marker-outline", label: "Physical Superstores" },
  { value: "mdi:shield-check-outline", label: "Brand Warranty / Genuine" },
  { value: "mdi:truck-fast-outline", label: "Express Delivery & Setup" },
  { value: "mdi:credit-card-outline", label: "Easy EMI / No-Cost EMI" },
  { value: "mdi:headset", label: "Customer Support / Assistance" },
  { value: "mdi:swap-horizontal-bold", label: "Exchange Old Appliances" },
  { value: "mdi:package-variant-closed-check", label: "Tamper-Proof Packaging" },
  { value: "mdi:certificate-outline", label: "Certified Technicians" },
];

export const DEFAULT_WHY_BUY_ITEMS = [
  {
    icon: "mdi:store-clock-outline",
    iconType: "iconify",
    iconColor: "light_red",
    title: "60–Min Express Store Pickup",
    description:
      "Order online and collect your packaged device from any of our 140+ stores across Tamil Nadu & South India in 1 hour.",
    tagText: "ZERO SHIPPING CHARGE ALWAYS",
    tagColor: "red",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:cash-multiple",
    iconType: "iconify",
    iconColor: "yellow",
    title: "Pay at Doorstep / COD",
    description:
      "Inspect the tamper-proof packaging at your home prior to paying via Cash, UPI QR, or Debit/Credit Card swipe on delivery.",
    tagText: "CARD–ON–DELIVERY MACHINE AVAILABLE",
    tagColor: "dark",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:tag-check-outline",
    iconType: "iconify",
    iconColor: "dark_red",
    title: "Lowest Price Guarantee",
    description:
      "Find any active lower price from authorized organized electronics retailers, and Sathya refunds the exact difference within 24 hours.",
    tagText: "HASSLE–FREE PRICE MATCH PROMISE",
    tagColor: "red",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:store-marker-outline",
    iconType: "iconify",
    iconColor: "light_red",
    title: "140+ Physical Superstores",
    description:
      "Experience live demos, compare models side-by-side, and get personalized advice from our expert instore product specialists.",
    tagText: "TRUSTED FOR OVER 70 YEARS",
    tagColor: "dark",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:shield-check-outline",
    iconType: "iconify",
    iconColor: "green",
    title: "100% Genuine & Brand Warranty",
    description:
      "Direct authorized partnership with top global brands guarantees brand-new sealed products with official brand service support.",
    tagText: "DIRECT BRAND AUTHORIZED DEALER",
    tagColor: "green",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:truck-fast-outline",
    iconType: "iconify",
    iconColor: "yellow",
    title: "Next-Day Delivery & Installation",
    description:
      "Safe doorstep delivery with specialized vehicle handling and expert unboxing & wall-mount installation by certified engineers.",
    tagText: "VERIFIED SATHYA TECHNICIANS",
    tagColor: "red",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:credit-card-outline",
    iconType: "iconify",
    iconColor: "blue",
    title: "Easy No-Cost EMI & Exchange",
    description:
      "Upgrade seamlessly with zero down payment schemes, instant paperless finance, and best valuation for your old appliances.",
    tagText: "FLEXIBLE PAYMENT PLANS",
    tagColor: "dark",
    link: "",
    isActive: true,
  },
  {
    icon: "mdi:headset",
    iconType: "iconify",
    iconColor: "light_red",
    title: "Dedicated After-Sales Support",
    description:
      "Round-the-clock priority assistance, warranty claim guidance, and dedicated store managers ready to assist you anytime.",
    tagText: "CUSTOMER FIRST COMMITTED",
    tagColor: "red",
    link: "",
    isActive: true,
  },
];

const emptyItem = () => ({
  icon: "mdi:storefront-outline",
  iconType: "iconify",
  iconColor: "light_red",
  iconFile: null,
  iconPreview: "",
  title: "",
  description: "",
  tagText: "",
  tagColor: "red",
  link: "",
  isActive: true,
});

export default function WhyBuyReasonsConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-why-buy-reasons",
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("Why Buy From Sathya?");
  const [kicker, setKicker] = useState("THE OMNICHANNEL ADVANTAGE");
  const [subtitle, setSubtitle] = useState(
    "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores."
  );
  const [status, setStatus] = useState("active");
  const [items, setItems] = useState(DEFAULT_WHY_BUY_ITEMS);
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
          setName(data.data.name || "Why Buy From Sathya?");
          setKicker(data.data.kicker || "THE OMNICHANNEL ADVANTAGE");
          setSubtitle(
            data.data.subtitle ||
              "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores."
          );
          setStatus(data.data.status || "active");
          const rows = data.data.items || [];
          setItems(
            rows.length
              ? rows.map((it) => ({
                icon: it.icon || "mdi:storefront-outline",
                iconType: it.iconType || "iconify",
                iconColor: it.iconColor || "light_red",
                iconFile: null,
                iconPreview: it.iconType === "image" ? it.icon : "",
                title: it.title || "",
                description: it.description || "",
                tagText: it.tagText || "",
                tagColor: it.tagColor || "red",
                link: it.link || "",
                isActive: it.isActive !== false,
              }))
              : DEFAULT_WHY_BUY_ITEMS
          );
        } else {
          setName("Why Buy From Sathya?");
          setKicker("THE OMNICHANNEL ADVANTAGE");
          setSubtitle(
            "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores."
          );
          setItems(DEFAULT_WHY_BUY_ITEMS);
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
      if (!items[i].title.trim()) {
        setError(`Card #${i + 1}: Title is required.`);
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
      fd.append("subtitle", subtitle.trim());
      fd.append("status", status);
      fd.append(
        "itemsMeta",
        JSON.stringify(
          items.map((it, i) => ({
            icon: it.icon,
            iconType: it.iconType || "iconify",
            iconColor: it.iconColor || "light_red",
            title: it.title.trim(),
            description: it.description.trim(),
            tagText: it.tagText.trim(),
            tagColor: it.tagColor || "red",
            link: it.link.trim(),
            isActive: it.isActive !== false,
            order: i,
          }))
        )
      );
      items.forEach((it, i) => {
        if (it.iconFile) fd.append(`iconFile_${i}`, it.iconFile);
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

  const displayTitle = setLabel || "Why Buy From Sathya";

  if (isListMode) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
                <Icon icon="mdi:shield-star-outline" className="text-xl" />
              </span>
              Why Buy From Sathya / Omnichannel Advantage
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Highlight store advantages (6–8 cards), express store pickup, COD, lowest price guarantee, and 140+ superstores.
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
                <Icon icon="mdi:shield-star-outline" className="text-2xl" />
              </div>
              <p className="text-gray-700 font-semibold">No Why Buy / Omnichannel Advantage sets added yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;Add New Set&quot; above to create this section with 6 to 8 feature cards.
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
                      {s.title || s.label || `Why Buy From Sathya #${idx + 1}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Section Title: <span className="text-[#ED1C24] font-semibold">{s.title || "Why Buy From Sathya?"}</span>
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
        <p className="text-sm font-medium">Loading Why Buy From Sathya configuration...</p>
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
                <Icon icon="mdi:shield-star-outline" className="text-lg" />
              </span>
              <h2 className="text-lg font-bold text-gray-900">{displayTitle}</h2>
              <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? "card" : "cards"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Omnichannel advantage section with 6 to 8 feature cards, circular icons, descriptions, and highlight tags.
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
              placeholder="e.g. Why Buy From Sathya?"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">Main heading shown in large bold text</p>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Top Kicker Subtitle
            </label>
            <input
              type="text"
              value={kicker}
              onChange={(e) => setKicker(e.target.value)}
              placeholder="e.g. THE OMNICHANNEL ADVANTAGE"
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

          <div className="md:col-span-12">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Subtitle Description
            </label>
            <textarea
              rows={2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">Centrally aligned descriptive text under the main heading</p>
          </div>
        </div>
      </div>

      {/* Cards List Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Icon icon="mdi:view-grid-plus-outline" className="text-base text-gray-500" />
              Feature Cards ({items.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              You can configure 6 to 8 cards with circular icons, descriptions, and highlight tags.
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
                  {item.tagText && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-[#d72828] uppercase">
                      {item.tagText}
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
                    disabled={items.length <= 1}
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
                {/* Left: Circular Icon Preview & Selector */}
                <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-36 text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${getIconColorClass(
                      item.iconColor
                    )}`}
                  >
                    {item.iconType === "image" && (item.iconPreview || item.icon) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.iconPreview || item.icon}
                        alt="icon"
                        className="w-9 h-9 object-contain"
                      />
                    ) : (
                      <Icon
                        icon={item.icon || "mdi:storefront-outline"}
                        className="text-2xl"
                      />
                    )}
                  </div>

                  {/* Icon Color Picker */}
                  <div className="w-full">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Color
                    </label>
                    <select
                      value={item.iconColor || "light_red"}
                      onChange={(e) => updateItem(idx, { iconColor: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#ED1C24] focus:outline-none bg-white font-medium"
                    >
                      {ICON_COLOR_PRESETS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upload custom icon / image */}
                  <label className="text-[11px] text-[#ED1C24] font-medium hover:underline cursor-pointer mt-1">
                    Upload Icon
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
                          iconFile: validFile,
                          iconPreview: preview,
                          iconType: "image",
                        });
                      }}
                    />
                  </label>
                </div>

                {/* Right: Form Grid */}
                <div className="flex-1 w-full space-y-3.5">
                  {/* Row 1: Title & Icon Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-7">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Card Title <span className="text-[#ED1C24]">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="e.g. 60–Min Express Store Pickup"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition font-medium"
                        required
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Bold headline of this advantage card
                      </p>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Choose Icon
                      </label>
                      <select
                        value={item.icon || "mdi:storefront-outline"}
                        onChange={(e) =>
                          updateItem(idx, { icon: e.target.value, iconType: "iconify" })
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition bg-white"
                      >
                        {POPULAR_ICONS.map((ic) => (
                          <option key={ic.value} value={ic.value}>
                            {ic.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Select from library or upload custom
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Card Description
                    </label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder="e.g. Order online and collect your packaged device from any of our 140+ stores across Tamil Nadu & South India in 1 hour."
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition leading-relaxed"
                    />
                  </div>

                  {/* Row 3: Footer Tag Text, Tag Color, Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1 border-t border-gray-100">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Footer Highlight Tag
                      </label>
                      <input
                        type="text"
                        value={item.tagText}
                        onChange={(e) => updateItem(idx, { tagText: e.target.value })}
                        placeholder="e.g. ZERO SHIPPING CHARGE ALWAYS"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs uppercase tracking-wider focus:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24]/10 focus:outline-none transition font-bold"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Uppercase emphasis text at bottom
                      </p>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tag Color
                      </label>
                      <select
                        value={item.tagColor || "red"}
                        onChange={(e) => updateItem(idx, { tagColor: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#ED1C24] focus:outline-none transition bg-white font-medium"
                      >
                        <option value="red">Red (Primary)</option>
                        <option value="dark">Dark / Black</option>
                        <option value="green">Emerald Green</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Optional Link
                      </label>
                      <input
                        type="text"
                        value={item.link}
                        onChange={(e) => updateItem(idx, { link: e.target.value })}
                        placeholder="e.g. /stores or #stores"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#ED1C24] focus:outline-none transition"
                      />
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
          Add Another Feature Card (Up to 6–8 or more)
        </button>
      </div>
    </form>
  );
}
