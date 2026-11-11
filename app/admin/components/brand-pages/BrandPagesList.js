"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

export default function BrandPagesList() {
  const router = useRouter();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/category-pages?scope=brand-pages");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPages(data.pages || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this brand overview page and its components?")) return;
    const res = await fetch(`/api/category-pages/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      alert(data.message);
      return;
    }
    fetchPages();
  };

  return (
    <div className="py-4 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex-1 pr-4">
          <h1 className="text-2xl font-semibold text-gray-900">Brand Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create an overview for a brand (/brand/slug/overview).
          </p>
        </div>
        <Link
          href="/admin/brand-pages/create"
          className="inline-flex items-center gap-2 bg-[#ED1C24] hover:bg-[#C4161D] text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
        >
          <Icon icon="mdi:plus" /> Create Page
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ED1C24]" />
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-600 font-medium">No brand pages yet</p>
          <Link
            href="/admin/brand-pages/create"
            className="text-[#ED1C24] text-sm mt-2 inline-block hover:underline"
          >
            Create your first brand overview
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Components</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page._id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {page.pageType === PAGE_TYPES.CATEGORY_BRAND
                        ? `${page.categoryName} · ${page.brandName}`
                        : page.categoryName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {page.pageType === PAGE_TYPES.CATEGORY_BRAND
                        ? `/category/brand/${page.categorySlug}/${page.brandSlug}/overview`
                        : `/brand/${page.categorySlug}/overview`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {page.pageType === PAGE_TYPES.CATEGORY_BRAND
                      ? "Category + Brand"
                      : "Brand"}
                  </td>
                  <td className="px-4 py-3">{page.componentCount ?? 0}</td>
                  <td className="px-4 py-3 capitalize">{page.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/brand-pages/${page._id}`)
                      }
                      className="text-xs font-medium text-[#ED1C24] hover:underline"
                    >
                      Open Builder
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/brand-pages/${page._id}/order`)
                      }
                      className="text-xs font-medium text-gray-700 hover:underline"
                    >
                      Order
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(page._id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
