"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  PAGE_TYPES,
  PAGE_TYPE_LABELS,
} from "@/lib/categoryPageComponents/registry";

const OPTIONS = [
  PAGE_TYPES.CATEGORY,
  PAGE_TYPES.SUB_CATEGORY,
  PAGE_TYPES.CHILD_CATEGORY,
];

export default function CreateCategoryPage() {
  const router = useRouter();
  const [pageType, setPageType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageType) {
      setOptions([]);
      setCategoryId("");
      return;
    }
    const load = async () => {
      setLoadingOptions(true);
      setCategoryId("");
      try {
        const res = await fetch(
          `/api/category-pages/category-options?pageType=${pageType}`
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setOptions(data.options || []);
      } catch (e) {
        setError(e.message);
        setOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, [pageType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pageType || !categoryId) {
      setError("Select page type and category.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/category-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType, categoryId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push(`/admin/category-pages/${data.page._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-4 w-full">
      <Link
        href="/admin/category-pages"
        className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4"
      >
        <Icon icon="mdi:arrow-left" /> Category Settings
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Create Page</h1>
      <p className="text-sm text-gray-500 mb-6">
        Select Category / Sub Category / Child Category, then open the builder.
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
          <label className="block text-sm font-medium mb-2">Page Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPageType(type)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium text-left ${
                  pageType === type
                    ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                    : "border-gray-200"
                }`}
              >
                {PAGE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {pageType && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Select {PAGE_TYPE_LABELS[pageType]}
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
                {options.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.parent_name
                      ? `${o.parent_name} › ${o.category_name}`
                      : o.category_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/category-pages"
            className="rounded-lg border px-4 py-2.5 text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !pageType || !categoryId}
            className="rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Opening…" : "Open Page Builder"}
          </button>
        </div>
      </form>
    </div>
  );
}
