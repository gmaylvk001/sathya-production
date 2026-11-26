"use client";

import { useEffect, useRef } from "react";
import {
  AUTH_SESSION_KEY,
  AUTH_TOKEN_KEY,
  readStoredSession,
} from "@/lib/clientAuthSession";

/**
 * Keeps auth consistent across tabs — without forcing an immediate reload.
 *
 * When another tab logs in/out or switches account, mark this tab as pending.
 * Reload only after the user interacts here (click / key / touch), so background
 * tabs stay idle until the shopper actually uses them.
 */
export default function AuthSessionSync() {
  const baselineRef = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    baselineRef.current = readStoredSession()?.userId || null;

    const sessionChanged = () => {
      const nextId = readStoredSession()?.userId || null;
      const prevId = baselineRef.current;
      return String(nextId || "") !== String(prevId || "");
    };

    const onStorage = (event) => {
      if (event.key !== AUTH_SESSION_KEY && event.key !== AUTH_TOKEN_KEY) return;
      if (!sessionChanged()) return;
      pendingRef.current = true;
    };

    const applyIfPending = () => {
      if (!pendingRef.current) return;
      if (!sessionChanged()) {
        pendingRef.current = false;
        return;
      }
      pendingRef.current = false;
      baselineRef.current = readStoredSession()?.userId || null;
      window.location.reload();
    };

    window.addEventListener("storage", onStorage);
    // Capture phase so we catch the first real user action in this tab
    window.addEventListener("pointerdown", applyIfPending, true);
    window.addEventListener("keydown", applyIfPending, true);
    window.addEventListener("touchstart", applyIfPending, true);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pointerdown", applyIfPending, true);
      window.removeEventListener("keydown", applyIfPending, true);
      window.removeEventListener("touchstart", applyIfPending, true);
    };
  }, []);

  return null;
}
