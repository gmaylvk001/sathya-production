"use client";

import { useEffect, useState } from "react";
import FireworksEffect from "./FireworksEffect";
import SnowEffect from "./SnowEffect";

const EFFECT_MAP = {
  fireworks: FireworksEffect,
  snowfall: SnowEffect,
};

const STORAGE_KEY = "sathya_active_festival_effect";

function getCachedEffect() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || !item.isActive) return null;

    const now = Date.now();
    const start = new Date(item.startDate).getTime();
    const end = new Date(item.endDate).getTime();

    if (now >= start && now <= end && EFFECT_MAP[item.effect]) {
      return item.effect;
    }
  } catch (e) {
    // Ignore cache parse error
  }
  return null;
}

export default function FestivalEffects() {
  // Initialize as null to prevent SSR hydration mismatch
  const [effect, setEffect] = useState(null);

  useEffect(() => {
    // Read cached effect on client mount
    const cached = getCachedEffect();
    if (cached) {
      setEffect(cached);
    }

    let cancelled = false;

    async function loadActiveEffect() {
      try {
        const response = await fetch("/api/festival-effects?active=true", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = await response.json();

        if (cancelled) return;

        if (result.success && result.data?.effect) {
          const activeData = result.data;
          setEffect(activeData.effect);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeData));
          } catch (e) {}
        } else {
          setEffect(null);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {}
        }
      } catch (error) {
        console.error("Failed to load festival effect:", error);
      }
    }

    loadActiveEffect();

    // Listen for admin changes across tabs or window events
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === "sathya_festival_sync") {
        setEffect(getCachedEffect());
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("festivalEffectUpdated", loadActiveEffect);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("festivalEffectUpdated", loadActiveEffect);
    };
  }, []);

  if (!effect) return null;

  const ActiveComponent = EFFECT_MAP[effect];
  if (!ActiveComponent) return null;

  return <ActiveComponent />;
}
