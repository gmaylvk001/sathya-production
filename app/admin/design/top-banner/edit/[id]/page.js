"use client";

/**
 * Edit the existing Home Settings Top Banner carousel.
 * [id] is the home-page component instanceId.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLoader from "@/app/admin/components/AdminLoader";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";
import TopBannerEditor from "../../TopBannerEditor";

export default function DesignTopBannerEditPage() {
  const params = useParams();
  const instanceId = String(params?.id || "");
  const [pageId, setPageId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/home-pages");
        const data = await res.json();
        if (!data.success || !data.page?._id) {
          throw new Error(data.message || "Home page not found");
        }

        const match = (data.page.components || []).find(
          (c) => c.type === COMPONENT_TYPES.TOP_BANNER && c.instanceId === instanceId
        );
        if (!match) {
          throw new Error("Top Banner not found");
        }

        if (!cancelled) setPageId(String(data.page._id));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    if (instanceId) load();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <Link
          href="/admin/design/top-banner"
          className="mt-3 inline-block text-sm font-medium text-[#ED1C24] hover:underline"
        >
          Back to Top Banner
        </Link>
      </div>
    );
  }

  if (!pageId) return <AdminLoader />;

  return <TopBannerEditor pageId={pageId} />;
}
