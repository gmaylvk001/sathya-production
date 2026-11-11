"use client";

import { useEffect } from "react";

export default function VisitorTracker() {
  useEffect(() => {
    try {
      fetch("/api/visitorlog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: typeof window !== "undefined" ? window.location.pathname : "",
          referer: typeof document !== "undefined" ? document.referrer : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      }).catch(() => {});
    } catch {}
  }, []);

  return null;
}