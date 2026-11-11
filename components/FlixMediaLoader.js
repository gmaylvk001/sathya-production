"use client";

import { useEffect } from "react";

/**
 * FlixMedia Standard JS INpage/MiniSite (React CreateElement style).
 * Dist ID and language match Sathya store Flix configuration:
 * - Dist ID: 15917
 * - Language: in
 * - MPN: primary match (dynamic)
 * - EAN: secondary match (optional)
 * - Brand: dynamic
 * Containers in <body>: #flix-inpage , #flix-minisite
 * Old Flix scripts removed before each load.
 */

const FLIX_DISTRIBUTOR_ID = "15917";
const FLIX_LANGUAGE = "in";
const FLIX_LOADER_SRC = "//media.flixfacts.com/js/loader.js";

function extractFlixMpn(p = {}) {
  const explicit = (p.model_number || p.mpn || p.MPN || p.modelNumber || "")
    .toString()
    .trim();
  if (
    explicit &&
    explicit.toLowerCase() !== "null" &&
    explicit.toLowerCase() !== "undefined"
  ) {
    return explicit;
  }

  const name = (p.name || "").toString();
  const paren = name.match(/\(([A-Z0-9][A-Z0-9-]{4,})/i);
  if (paren?.[1]) return paren[1].toUpperCase();

  const slug = (p.slug || "").toString();
  const slugTail = slug.match(/([0-9]{2}[a-z]{2}[0-9]{4}[a-z]{0,4})$/i);
  if (slugTail?.[1]) return slugTail[1].toUpperCase();

  return (p.item_code || p.sku || "").toString().trim();
}

function extractFlixEan(p = {}) {
  const ean = p.ean || p.EAN || p.barcode || p.bar_code || p.gtin || p.GTIN || "";
  return ean ? String(ean).trim() : "";
}

function removeOldFlixScripts() {
  document
    .querySelectorAll(
      'script[src*="media.flixfacts.com/js/loader.js"], script[src*="media.flixcar.com"], script[data-flix-distributor], script[data-flix="true"]'
    )
    .forEach((s) => s.remove());
}

function resetFlix() {
  try {
    if (
      typeof window.flixJsCallbacks === "object" &&
      typeof window.flixJsCallbacks.reset === "function"
    ) {
      window.flixJsCallbacks.reset();
    }
  } catch {
    // ignore
  }
}

function containersReady() {
  return (
    document.querySelectorAll("#flix-inpage").length === 1 &&
    document.querySelectorAll("#flix-minisite").length === 1
  );
}

export default function FlixMediaLoader({
  product,
  brandName,
  enabled = true,
  onInpage,
  onNoshow,
  onMinisite,
}) {
  useEffect(() => {
    if (!enabled || !product || typeof window === "undefined") return;

    const product_brand = (brandName || "").trim().replace(/\s+/g, " ");
    const product_mpn = extractFlixMpn(product).replace(/\s+/g, "");
    const product_ean = extractFlixEan(product).replace(/\s+/g, "");

    if (!product_mpn && !product_ean) {
      console.warn("[Flix] skip — need MPN or EAN", {
        brand: product_brand,
        mpn: product_mpn,
        ean: product_ean,
      });
      onNoshow?.();
      return;
    }

    let cancelled = false;
    let tries = 0;
    let timer;

    const run = () => {
      if (cancelled) return;
      tries += 1;

      if (!containersReady()) {
        if (tries < 40) {
          timer = setTimeout(run, 150);
        } else {
          console.warn(
            "[Flix] skip — need exactly one #flix-inpage and one #flix-minisite (React guide: no duplicates)"
          );
          onNoshow?.();
        }
        return;
      }

      resetFlix();
      removeOldFlixScripts();

      const inpage = document.getElementById("flix-inpage");
      const minisite = document.getElementById("flix-minisite");
      try {
        if (inpage) inpage.replaceChildren();
        if (minisite) minisite.replaceChildren();
      } catch {
        // Flix may have already moved/removed nodes; skip to avoid removeChild crash
      }

      const headID = document.getElementsByTagName("head")[0];
      if (!headID) return;

      const flixScript = document.createElement("script");
      flixScript.type = "text/javascript";
      flixScript.async = true;
      flixScript.setAttribute("data-flix-distributor", FLIX_DISTRIBUTOR_ID);
      flixScript.setAttribute("data-flix-language", FLIX_LANGUAGE);
      flixScript.setAttribute("data-flix-brand", product_brand);
      flixScript.setAttribute("data-flix-ean", product_ean);
      flixScript.setAttribute("data-flix-mpn", product_mpn);
      flixScript.setAttribute("data-flix-inpage", "flix-inpage");
      flixScript.setAttribute("data-flix-button", "flix-minisite");
      flixScript.setAttribute("data-flix-button-image", "");
      flixScript.setAttribute("data-flix-fallback-language", "");
      flixScript.setAttribute("data-flix-price", "");

      headID.appendChild(flixScript);

      flixScript.onload = function () {
        if (cancelled) return;
        console.log("[Flix] Standard JS loader ready", {
          distributor: FLIX_DISTRIBUTOR_ID,
          language: FLIX_LANGUAGE,
          brand: product_brand || "(empty)",
          mpn: product_mpn || "(empty)",
          ean: product_ean || "(empty)",
        });
        if (
          typeof window.flixJsCallbacks === "object" &&
          typeof window.flixJsCallbacks.setLoadCallback === "function"
        ) {
          window.flixJsCallbacks.setLoadCallback(function () {
            console.log("[Flix] INpage content available");
            onInpage?.();
          }, "inpage");
          window.flixJsCallbacks.setLoadCallback(function () {
            console.log("[Flix] MiniSite content available");
            onMinisite?.();
          }, "minisite");
          window.flixJsCallbacks.setLoadCallback(function () {
            console.warn(
              "[Flix] noshow — no INpage/MiniSite for Dist 15917 + these MPN/EAN. Ask Flix to confirm syndication for this SKU."
            );
            onNoshow?.();
          }, "noshow");
        }
      };

      flixScript.onerror = function (error) {
        console.error("[Flix] failed to load loader.js", error);
        onNoshow?.();
      };

      flixScript.src = FLIX_LOADER_SRC;
    };

    timer = setTimeout(run, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    enabled,
    product?._id,
    brandName,
    product?.model_number,
    product?.item_code,
    product?.slug,
    product?.ean,
    onInpage,
    onNoshow,
    onMinisite,
  ]);

  return null;
}
