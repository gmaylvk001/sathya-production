"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { buildProductSearchQuery } from "@/lib/categoryPageComponents/productSearchQuery";
import ProductFilterPicker from "./ProductFilterPicker";

function productImageSrc(product) {
  const img = product?.images?.[0];
  if (!img) return "";
  return img.startsWith("http") ? img : `/uploads/products/${img}`;
}

const MIN_PRODUCTS = 6;

/**
 * Product Carousel admin:
 * list existing sets + ADD NEW; form = name + search/add products
 * (dropdown limited to this category page's category).
 */
export default function ProductCarouselConfigForm({
  pageId,
  categoryId,
  categoryName,
  instanceId,
  setLabel,
  existingSets = [],
  onAddNew,
  onEditSet,
  onDeleteSet,
  onBackToList,
  onSaved,
  apiBase = "/api/category-product-carousel",
  searchApiBase = "/api/category-product-carousel/search",
  ownerType = "category",
  brandId,
}) {
  const isListMode = !instanceId;
  const [name, setName] = useState("");
  const [seeAllLink, setSeeAllLink] = useState("");
  const [status, setStatus] = useState("active");
  const [selected, setSelected] = useState([]);
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
          setName(data.data.name || "");
          setSeeAllLink(data.data.seeAllLink || "");
          setStatus(data.data.status || "active");
          setSelected(data.products || []);
        } else {
          setName("");
          setSeeAllLink("");
          setSelected([]);
          setStatus("active");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instanceId]);

  const addProduct = (p) => {
    setSelected((prev) => [...prev, p]);
  };

  const addMultipleProducts = (list) => {
    setSelected((prev) => [...prev, ...list]);
  };

  const removeProduct = (id) => {
    setSelected((prev) => prev.filter((p) => String(p._id) !== String(id)));
  };

  const moveProduct = (index, dir) => {
    setSelected((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
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
    if (!name.trim()) {
      setError("Section name is required.");
      return;
    }
    if (selected.length < MIN_PRODUCTS) {
      setError(`Add minimum ${MIN_PRODUCTS} products.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          pageId,
          name: name.trim(),
          seeAllLink: seeAllLink.trim(),
          status,
          productIds: selected.map((p) => p._id),
        }),
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
              Product Carousel
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Already created sets for{" "}
              <span className="font-medium text-gray-700">
                {categoryName || "this category"}
              </span>
              . Search &amp; add products from this category only.
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
            No Product Carousel sets yet. Click <strong>ADD NEW</strong>.
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
            {setLabel || "New Product Carousel"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Products from{" "}
            <span className="font-medium text-gray-700">
              {categoryName || "this category"}
            </span>{" "}
            only.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Best Selling Smartphones"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            See All link / slug
          </label>
          <input
            type="text"
            value={seeAllLink}
            onChange={(e) => setSeeAllLink(e.target.value)}
            placeholder="/category/mobiles or mobiles/smartphones"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Used by the See All button. Path starting with / or a category slug.
          </p>
        </div>
      </div>

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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Add products
        </label>
        <p className="text-sm font-medium text-[#ED1C24] mb-2">
          Add minimum {MIN_PRODUCTS} products must be added.
        </p>
        <ProductFilterPicker
          selected={selected}
          onAddProduct={addProduct}
          onAddMultipleProducts={addMultipleProducts}
          defaultCategoryId={categoryId}
          ownerType={ownerType}
          brandId={brandId}
          searchApiBase={searchApiBase}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1">
          Selected products ({selected.length} / {MIN_PRODUCTS} minimum)
        </h4>
        {selected.length > 0 && selected.length < MIN_PRODUCTS && (
          <p className="text-sm font-medium text-[#ED1C24] mb-2">
            Add {MIN_PRODUCTS - selected.length} more product
            {MIN_PRODUCTS - selected.length === 1 ? "" : "s"} to save.
          </p>
        )}
        {selected.length === 0 ? (
          <p className="text-xs text-gray-500">No products added yet.</p>
        ) : (
          <ul className="space-y-2">
            {selected.map((p, index) => (
              <li
                key={p._id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60"
              >
                {productImageSrc(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={productImageSrc(p)}
                    alt=""
                    className="h-12 w-12 object-contain bg-white border rounded"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gray-100 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ₹
                    {Math.round(
                      p.special_price > 0 && p.special_price < p.price
                        ? p.special_price
                        : p.price
                    ).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveProduct(index, -1)}
                    className="text-xs text-gray-500 hover:text-gray-800"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProduct(index, 1)}
                    className="text-xs text-gray-500 hover:text-gray-800"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(p._id)}
                  className="text-xs text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
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
          {saving ? "Saving…" : "Save Product Carousel"}
        </button>
      </div>
    </form>
  );
}
