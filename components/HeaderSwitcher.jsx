"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Header = dynamic(() => import("@/components/Headernew"), {
  ssr: true,
});

export default function HeaderSwitcher() {
  const [headerStyle, setHeaderStyle] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("sathya_navbar_settings_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.headerStyle) {
            return parsed.headerStyle;
          }
        }
      } catch { }
    }
    return "classic";
  });

  // Read latest settings from server & sync with cache
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fetch latest setting from server
    async function fetchSettings() {
      try {
        const res = await fetch("/api/navbar-settings", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const serverStyle = json?.data?.headerStyle || "classic";
          setHeaderStyle(serverStyle);
          try {
            const currentCache = localStorage.getItem("sathya_navbar_settings_v1");
            const merged = currentCache ? { ...JSON.parse(currentCache), ...json.data } : json.data;
            localStorage.setItem("sathya_navbar_settings_v1", JSON.stringify(merged));
          } catch { }
        }
      } catch (err) {
        console.warn("Failed to fetch navbar settings:", err);
      }
    }

    fetchSettings();

    // Listen for live update events dispatched from the admin panel
    const onSettingsUpdated = () => {
      try {
        const updated = localStorage.getItem("sathya_navbar_settings_v1");
        if (updated) {
          const parsed = JSON.parse(updated);
          if (parsed?.headerStyle) {
            setHeaderStyle(parsed.headerStyle);
          }
        }
      } catch { }
    };

    window.addEventListener("sathya_navbar_settings_updated", onSettingsUpdated);
    return () => {
      window.removeEventListener("sathya_navbar_settings_updated", onSettingsUpdated);
    };
  }, []);

  return <Header headerStyle={headerStyle} />;
}
