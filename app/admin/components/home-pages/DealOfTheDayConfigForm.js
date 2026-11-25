"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

function toLocalInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function productImageSrc(product) {
  const img = product?.image || product?.images?.[0];
  if (!img) return "";
  return String(img).startsWith("http") ? img : `/uploads/products/${img}`;
}

function formatMoney(n) {
  if (n == null || n === "") return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

const emptyForm = {
  productId: "",
  startAt: "",
  endAt: "",
  status: "active",
  eyebrow: "DEAL OF THE DAY",
  badgeLabel: "Spotlight 24H",
  bannerSubtitle:
    "Curated manufacturer price reduction direct from international brand warehouse.",
  tagline: "",
  scarcityLabel: "High Demand",
  scarcityQtyOverride: "",
  showScarcity: true,
  highlightSpecs: [
    { label: "Display", value: "" },
    { label: "Sound", value: "" },
    { label: "Warranty", value: "" },
  ],
  deliveryHint:
    "Check Instant Postal Delivery — Enter PIN code for delivery by 9 PM Today",
  emiHint: "",
  primaryCtaLabel: "Buy Now with Express Delivery",
  secondaryCtaLabel: "Add to Bag",
  dealPrice: "",
  mrpPrice: "",
};

/**
 * Deal of the Day — Home Page Builder config.
 * List existing sets + ADD NEW; form = product + timing + design copy.
 */
export default function DealOfTheDayConfigForm({
  pageId,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/home-deal-of-the-day",
}) {
  const isListMode = !instanceId;
  const [form, setForm] = useState(emptyForm);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
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
        const res = await fetch(`${apiBase}?instanceId=${instanceId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          setForm({
            productId: d.productId ? String(d.productId) : "",
            startAt: toLocalInputValue(d.startAt),
            endAt: toLocalInputValue(d.endAt),
            status: d.status || "active",
            eyebrow: d.eyebrow || "DEAL OF THE DAY",
            badgeLabel: d.badgeLabel || "Spotlight 24H",
            bannerSubtitle: d.bannerSubtitle || "",
            tagline: d.tagline || "",
            scarcityLabel: d.scarcityLabel || "High Demand",
            scarcityQtyOverride:
              d.scarcityQtyOverride == null ? "" : String(d.scarcityQtyOverride),
            showScarcity: d.showScarcity !== false,
            highlightSpecs:
              Array.isArray(d.highlightSpecs) && d.highlightSpecs.length
                ? d.highlightSpecs
                : emptyForm.highlightSpecs,
            deliveryHint: d.deliveryHint || "",
            emiHint: d.emiHint || "",
            primaryCtaLabel:
              d.primaryCtaLabel || "Buy Now with Express Delivery",
            secondaryCtaLabel: d.secondaryCtaLabel || "Add to Bag",
            dealPrice: d.dealPrice == null ? "" : String(d.dealPrice),
            mrpPrice: d.mrpPrice == null ? "" : String(d.mrpPrice),
          });
          setSelectedProduct(data.product || null);
        } else {
          setForm(emptyForm);
          setSelectedProduct(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId, apiBase]);

  useEffect(() => {
    if (!searchQ || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/product/search?q=${encodeURIComponent(searchQ.trim())}`
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const pickProduct = (product) => {
    setSelectedProduct(product);
    setForm((prev) => ({
      ...prev,
      productId: String(product._id),
      mrpPrice:
        prev.mrpPrice || (product.price != null ? String(product.price) : ""),
      dealPrice:
        prev.dealPrice ||
        (product.special_price > 0
          ? String(product.special_price)
          : product.price != null
            ? String(product.price)
            : ""),
    }));
    setSearchQ("");
    setSearchResults([]);
  };

  const updateSpec = (index, field, value) => {
    setForm((prev) => {
      const specs = [...(prev.highlightSpecs || [])];
      while (specs.length < 3) specs.push({ label: "", value: "" });
      specs[index] = { ...specs[index], [field]: value };
      return { ...prev, highlightSpecs: specs };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pageId || !instanceId) return;
    if (!form.productId) {
      setError("Select a product");
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError("Start and end time are required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          pageId,
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          scarcityQtyOverride:
            form.scarcityQtyOverride === ""
              ? null
              : Number(form.scarcityQtyOverride),
          dealPrice: form.dealPrice === "" ? null : Number(form.dealPrice),
          mrpPrice: form.mrpPrice === "" ? null : Number(form.mrpPrice),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSet = async (setInstanceId, label) => {
    if (
      !window.confirm(
        `Delete "${label || "this deal"}"? This cannot be undone.`
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

  if (isListMode) {
    return (
      <div>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold">Deal of the Day</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a set to edit, or Add New to schedule another deal.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D]"
          >
            <Icon icon="mdi:plus" /> Add New
          </button>
        </div>

        {existingSets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <Icon
              icon="mdi:timer-flash-outline"
              className="mx-auto mb-2 text-3xl text-gray-400"
            />
            <p className="text-sm text-gray-600">No Deal of the Day yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Click Add New, pick a product, set timing, then save.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {existingSets.map((c, idx) => (
              <li
                key={c.instanceId}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {c.label || c.title || `Deal of the Day #${idx + 1}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Home page component set
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSet?.(c.instanceId)}
                    className="text-sm font-semibold text-[#ED1C24] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteSet(
                        c.instanceId,
                        c.label || c.title || "Deal of the Day"
                      )
                    }
                    disabled={deletingId === c.instanceId}
                    className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === c.instanceId ? "Deleting…" : "Delete"}
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
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#ED1C24] mb-2"
          >
            <Icon icon="mdi:arrow-left" /> Back to list
          </button>
          <h2 className="text-lg font-semibold">
            {setLabel || "Deal of the Day"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Product, schedule, and design for this deal set.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product *
        </label>
        {selectedProduct ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="w-14 h-14 rounded bg-white border flex items-center justify-center overflow-hidden">
              {productImageSrc(selectedProduct) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImageSrc(selectedProduct)}
                  alt=""
                  className="object-contain max-h-full"
                />
              ) : (
                <Icon icon="mdi:image-off" className="text-gray-400 text-xl" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">
                {selectedProduct.name}
              </div>
              <div className="text-xs text-gray-500">
                {selectedProduct.item_code || "—"} ·{" "}
                {formatMoney(
                  selectedProduct.dealPrice ??
                    (selectedProduct.special_price > 0
                      ? selectedProduct.special_price
                      : selectedProduct.price)
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setForm((p) => ({ ...p, productId: "" }));
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by name or item code…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                Searching…
              </span>
            )}
            {searchResults.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                {searchResults.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => pickProduct(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 border-b last:border-0"
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.item_code} ·{" "}
                        {formatMoney(
                          p.special_price > 0 ? p.special_price : p.price
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start *
          </label>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End *
          </label>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deal price override
          </label>
          <input
            type="number"
            value={form.dealPrice}
            onChange={(e) => setForm((p) => ({ ...p, dealPrice: e.target.value }))}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            MRP override
          </label>
          <input
            type="number"
            value={form.mrpPrice}
            onChange={(e) => setForm((p) => ({ ...p, mrpPrice: e.target.value }))}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Design copy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.eyebrow}
            onChange={(e) => setForm((p) => ({ ...p, eyebrow: e.target.value }))}
            placeholder="Eyebrow"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.badgeLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, badgeLabel: e.target.value }))
            }
            placeholder="Badge"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.bannerSubtitle}
          onChange={(e) =>
            setForm((p) => ({ ...p, bannerSubtitle: e.target.value }))
          }
          rows={2}
          placeholder="Banner subtitle"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.tagline}
          onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
          placeholder="Tagline under title"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="space-y-2">
          {(form.highlightSpecs || []).slice(0, 3).map((spec, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2">
              <input
                value={spec.label}
                onChange={(e) => updateSpec(idx, "label", e.target.value)}
                placeholder="Spec label"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={spec.value}
                onChange={(e) => updateSpec(idx, "value", e.target.value)}
                placeholder="Spec value"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, primaryCtaLabel: e.target.value }))
            }
            placeholder="Primary CTA"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, secondaryCtaLabel: e.target.value }))
            }
            placeholder="Secondary CTA"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showScarcity}
            onChange={(e) =>
              setForm((p) => ({ ...p, showScarcity: e.target.checked }))
            }
          />
          Show scarcity
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ED1C24] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#c9181f] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Deal of the Day"}
        </button>
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
