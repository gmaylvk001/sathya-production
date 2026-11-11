"use client";

/**
 * Design → Top Banner list.
 * Shows only the Home Settings Top Banner carousel.
 * Other home-page components stay on /admin/homesettings.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AdminLoader from "@/app/admin/components/AdminLoader";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";

export default function DesignTopBannerPage() {
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/home-pages");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load home page");
      setPage(data.page);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const topBanner = (page?.components || []).find(
    (c) => c.type === COMPONENT_TYPES.TOP_BANNER
  );

  const removeBanner = async () => {
    if (!page?._id || !topBanner) return;
    if (
      !window.confirm(
        'Delete "Top Banner"? Its saved configuration will also be removed. This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/home-pages/${page._id}/components?instanceId=${encodeURIComponent(topBanner.instanceId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed");
      setPage(data.page);
      setMessage("Top Banner deleted.");
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AdminLoader />;

  if (error || !page) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Not found"}</p>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border p-5 shadow-sm min-h-[320px]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold">Top Banner</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select the existing banner to edit it, or Add New.
            </p>
          </div>
          {!topBanner && (
            <button
              type="button"
              onClick={() => router.push("/admin/design/top-banner/create")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4161D]"
            >
              <Icon icon="mdi:plus" /> Add New
            </button>
          )}
        </div>

        {topBanner ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium">Top Banner</div>
              <div className="text-xs text-gray-500 mt-0.5">
                One banner carousel is configured for this page.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(`/admin/design/top-banner/edit/${topBanner.instanceId}`)
                }
                className="text-sm font-semibold text-[#ED1C24] hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={removeBanner}
                disabled={deleting}
                className="text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <Icon icon="mdi:image-area" className="mx-auto mb-2 text-3xl text-gray-400" />
            <p className="text-sm text-gray-600">No Top Banner has been added.</p>
            <p className="mt-1 text-xs text-gray-400">
              Click Add New when you are ready to create it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
