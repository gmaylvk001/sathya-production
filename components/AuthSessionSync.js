"use client";

import { useEffect, useRef } from "react";
import {
  AUTH_SESSION_KEY,
  AUTH_TOKEN_KEY,
  readStoredSession,
} from "@/lib/clientAuthSession";

/**
 * Keeps auth consistent across tabs.
 * If another tab logs in/out or switches account, reload this tab.
 */
export default function AuthSessionSync() {
  const baselineRef = useRef(null);

  useEffect(() => {
    baselineRef.current = readStoredSession()?.userId || null;

    const onStorage = (event) => {
      if (event.key !== AUTH_SESSION_KEY && event.key !== AUTH_TOKEN_KEY) return;

      const next = readStoredSession();
      // Compare user identity only — ignore sessionId churn from re-establishing cookies
      const nextId = next?.userId || null;
      const prevId = baselineRef.current;

      if (String(nextId || "") === String(prevId || "")) {
        baselineRef.current = nextId;
        return;
      }

      baselineRef.current = nextId;
      // Another tab switched/cleared the account — refresh this tab once
      window.location.reload();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
