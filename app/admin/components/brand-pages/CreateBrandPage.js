"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

export default function CreateBrandPage() {
  const router = useRouter();
  const [mode, setMode] = useState("brand");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoadingOptions(true);
      try {
        const [brandsRes, catsRes] = await Promise.all([
          fetch("/api/category-pages/brand-options"),
          fetch(
            `/api/category-pages/category-options?pageType=${PAGE_TYPES.CATEGORY}`
          ),
        ]);
        const brandsData = await brandsRes.json();
        const catsData = await catsRes.json();
        if (!brandsData.success) throw new Error(brandsData.message);
        if (!catsData.success) throw new Error(catsData.message);
        setBrandOptions(brandsData.options || []);
        setCategoryOptions(catsData.options || []);
      } catch (e) {
        setError(e.message);
        setBrandOptions([]);
        setCategoryOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandId) {
      setError("Select a brand.");
      return;
    }
    if (mode === "category_brand" && !categoryId) {
      setError("Select a category.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body =
        mode === "category_brand"
          ? {
              pageType: PAGE_TYPES.CATEGORY_BRAND,
              categoryId,
              brandId,
            }
          : {
              pageType: PAGE_TYPES.BRAND,
              categoryId: brandId,
            };
      const res = await fetch("/api/category-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push(`/admin/brand-pages/${data.page._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    Boolean(brandId) && (mode === "brand" || Boolean(categoryId));

  return (
    <div className="py-4 w-full">
      <Link
        href="/admin/brand-pages"
        className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4"
      >
        <Icon icon="mdi:arrow-left" /> Brand Settings
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Create Brand Overview</h1>
      <p className="text-sm text-gray-500 mb-6">
        Brand uses /brand/slug/overview.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-6 space-y-5 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Page type</label>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                checked={mode === "brand"}
                onChange={() => setMode("brand")}
              />
              Brand only — /brand/lg/overview
            </label>
            {/* <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                checked={mode === "category_brand"}
                onChange={() => setMode("category_brand")}
              />
              Category + brand — /category/brand/tvs/lg/overview
            </label> */}
          </div>
        </div>

        {/* {mode === "category_brand" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Category
            </label>
            {loadingOptions ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">— Select —</option>
                {categoryOptions.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.category_name}
                    {o.category_slug ? ` (${o.category_slug})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )} */}

        <div>
          <label className="block text-sm font-medium mb-2">Select Brand</label>
          {loadingOptions ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="">— Select —</option>
              {brandOptions.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.brand_name}
                  {o.brand_slug ? ` (${o.brand_slug})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/brand-pages"
            className="rounded-lg border px-4 py-2.5 text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Opening…" : "Open Page Builder"}
          </button>
        </div>
      </form>
    </div>
  );
}
