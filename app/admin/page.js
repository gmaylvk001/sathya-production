"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLoader from "@/app/admin/components/AdminLoader";

const UNILET_COOKIE = /(?:^|;\s*)session_store=unilet(?:;|$)/;

function setStoreCookie(unilet) {
  document.cookie = unilet
    ? "session_store=unilet; path=/; SameSite=Lax"
    : "session_store=; path=/; max-age=0; SameSite=Lax";
}

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirectByMode = async () => {
      const token = localStorage.getItem("token");
      const cookieOn = UNILET_COOKIE.test(document.cookie);
      let storeView = "sathya";
      let uniletExists = false;

      try {
        const [authRes, existsRes] = await Promise.all([
          token
            ? fetch("/api/auth/check", {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
          fetch("/api/store_owners/unilet-exists"),
        ]);

        if (authRes?.ok) {
          const data = await authRes.json();
          storeView = String(data?.admin_store_view || "sathya").toLowerCase();
        }
        if (existsRes?.ok) {
          const data = await existsRes.json();
          uniletExists = Boolean(data?.exists);
        }
      } catch {
        storeView = "sathya";
      }

      if (cancelled) return;

      const wantUnilet =
        uniletExists &&
        (storeView === "unilet" || (storeView === "all" && cookieOn));

      if (wantUnilet !== cookieOn) {
        setStoreCookie(wantUnilet);
      }

      router.replace(wantUnilet ? "/admin/unilet-dashboard" : "/admin/dashboard");
    };

    redirectByMode();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <AdminLoader label="Opening dashboard..." />;
}
