"use client";

/**
 * Create the Home Settings Top Banner carousel, then open its edit table.
 * If one already exists, open its edit page instead.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoader from "@/app/admin/components/AdminLoader";
import { COMPONENT_TYPES } from "@/lib/categoryPageComponents/registry";

export default function DesignTopBannerCreatePage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function ensureBanner() {
      try {
        const res = await fetch("/api/home-pages");
        const data = await res.json();
        if (!data.success || !data.page?._id) {
          throw new Error(data.message || "Home page not found");
        }

        const existing = (data.page.components || []).find(
          (c) => c.type === COMPONENT_TYPES.TOP_BANNER
        );
        if (existing?.instanceId) {
          router.replace(`/admin/design/top-banner/edit/${existing.instanceId}`);
          return;
        }

        const created = await fetch(`/api/home-pages/${data.page._id}/components`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: COMPONENT_TYPES.TOP_BANNER }),
        });
        const createdData = await created.json();
        if (!createdData.success) {
          throw new Error(createdData.message || "Could not create Top Banner");
        }

        const instanceId = createdData.instance?.instanceId;
        if (instanceId) {
          router.replace(`/admin/design/top-banner/edit/${instanceId}`);
          return;
        }

        throw new Error("Could not open Top Banner");
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    ensureBanner();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return <AdminLoader />;
}
