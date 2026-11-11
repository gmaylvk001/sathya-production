"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { PAGE_TYPE_LABELS } from "@/lib/categoryPageComponents/registry";

export default function CategoryPagesList() {
  const router = useRouter();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/category-pages");
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
    if (!confirm("Delete this category page layout and its Top Banner config?"))
      return;
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Category Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose a category, add components from screenshots, then order how they
            display.
          </p>
        </div>
        <Link
          href="/admin/category-pages/create"
          className="inline-flex items-center gap-2 bg-[#ED1C24] hover:bg-[#C4161D] text-white px-4 py-2.5 rounded-lg text-sm font-medium"
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
          <p className="text-gray-600 font-medium">No category pages yet</p>
          <Link
            href="/admin/category-pages/create"
            className="text-[#ED1C24] text-sm mt-2 inline-block hover:underline"
          >
            Create your first page
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Page Type</th>
                <th className="px-4 py-3">Components</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page._id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{page.categoryName}</div>
                    <div className="text-xs text-gray-400">{page.categorySlug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {PAGE_TYPE_LABELS[page.pageType] || page.pageType}
                  </td>
                  <td className="px-4 py-3">{page.componentCount ?? 0}</td>
                  <td className="px-4 py-3 capitalize">{page.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/category-pages/${page._id}`)
                      }
                      className="text-xs font-medium text-[#ED1C24] hover:underline"
                    >
                      Open Builder
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/category-pages/${page._id}/order`)
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
