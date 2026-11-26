"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import { useCart } from "@/context/CartContext";
import { normalizeProduct } from "@/lib/normalizeProduct";
import { isMovementAllowed } from "@/lib/addCartConfig";
import { ga4AddToCart } from "@/utils/nextjs-event-tracking";

const MAX_RECOMMENDATIONS = 12;
const MAX_CATEGORY_BUCKETS = 3;
const ADDED_FEEDBACK_MS = 850;

// Module-level cache for product metadata (category, brand, related_products)
const productMetaCache = new Map();

function getAssetFallbackBase() {
  return (
    process.env.NEXT_PUBLIC_ASSET_FALLBACK_URL ||
    "https://estore.bharathelectronics.in"
  ).replace(/\/+$/, "");
}

function extractCartProductId(item) {
  if (!item) return "";
  const raw =
    typeof item.productId === "object" && item.productId !== null
      ? item.productId._id || item.productId.id
      : item.productId;
  return raw ? String(raw).trim() : "";
}

function buildCartExcludeSets(cartItems = []) {
  const ids = new Set();
  const codes = new Set();
  const slugs = new Set();

  for (const item of cartItems) {
    const pid = extractCartProductId(item);
    if (pid) ids.add(pid);
    if (item?.comboId) ids.add(String(item.comboId).trim());
    if (item?.item_code) codes.add(String(item.item_code).trim().toLowerCase());
    if (item?.slug) slugs.add(String(item.slug).trim().toLowerCase());
  }

  return { ids, codes, slugs };
}

function isProductInCart(product, excludeSets) {
  const id = product?._id ? String(product._id).trim() : "";
  if (id && excludeSets.ids.has(id)) return true;

  const code = product?.item_code
    ? String(product.item_code).trim().toLowerCase()
    : "";
  if (code && excludeSets.codes.has(code)) return true;

  const slug = product?.slug ? String(product.slug).trim().toLowerCase() : "";
  if (slug && excludeSets.slugs.has(slug)) return true;

  return false;
}

function isProductEligible(product) {
  if (!product || !product._id) return false;
  if (String(product.status || "Active").trim().toLowerCase() !== "active") {
    return false;
  }
  if (String(product.product_type || "").trim().toLowerCase() === "gift") {
    return false;
  }
  const stockStatus = String(product.stock_status || "").trim().toLowerCase();
  if (stockStatus === "out of stock" || stockStatus === "outofstock") {
    return false;
  }
  const qty = Number(product.quantity ?? product.stock ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) return false;
  if (qty < 10 && !isMovementAllowed(product.movement)) return false;
  return true;
}

function interleaveBuckets(buckets, limit) {
  const merged = [];
  const seenIds = new Set();
  const maxLen = buckets.reduce((max, arr) => Math.max(max, arr.length), 0);

  for (let idx = 0; idx < maxLen; idx += 1) {
    for (const bucket of buckets) {
      const candidate = bucket[idx];
      if (!candidate || !candidate._id) continue;
      const id = String(candidate._id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      merged.push(candidate);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
}

function RecommendationSkeletonCard() {
  return (
    <div className="flex-[0_0_calc((100%-10px)/2)] sm:flex-[0_0_calc((100%-28px)/3)] xl:flex-[0_0_calc((100%-42px)/4)] snap-start min-w-0 rounded-xl border border-gray-200/80 bg-white p-2.5 sm:p-3 flex flex-col animate-pulse">
      <div className="h-28 sm:h-32 w-full rounded-lg bg-gray-100 mb-2.5" />
      <div className="h-3.5 w-full bg-gray-200/80 rounded mb-1.5" />
      <div className="h-3.5 w-3/4 bg-gray-200/80 rounded mb-3" />
      <div className="h-4 w-20 bg-gray-200/80 rounded mb-3" />
      <div className="h-8 w-full bg-gray-200/70 rounded-lg mt-auto" />
    </div>
  );
}

function RecommendationCard({
  rawProduct,
  isAdding,
  isAdded,
  onAddToCart,
}) {
  const product = useMemo(() => normalizeProduct(rawProduct), [rawProduct]);
  const [imgSrc, setImgSrc] = useState(
    product?.imgSrc || "/uploads/products/placeholder.jpg"
  );
  const [retryFailed, setRetryFailed] = useState(false);

  useEffect(() => {
    setImgSrc(product?.imgSrc || "/uploads/products/placeholder.jpg");
    setRetryFailed(false);
  }, [product?.imgSrc]);

  if (!product) return null;

  const productUrl = `/product/${product.slug}`;

  const handleImgError = () => {
    if (
      !retryFailed &&
      imgSrc &&
      imgSrc.startsWith("/uploads/products/") &&
      !imgSrc.includes("placeholder")
    ) {
      const filename = imgSrc.replace("/uploads/products/", "");
      setRetryFailed(true);
      setImgSrc(`${getAssetFallbackBase()}/uploads/products/${filename}`);
    } else {
      setRetryFailed(true);
      setImgSrc("/uploads/products/placeholder.jpg");
    }
  };

  return (
    <div className="group flex-[0_0_calc((100%-10px)/2)] sm:flex-[0_0_calc((100%-28px)/3)] xl:flex-[0_0_calc((100%-42px)/4)] snap-start min-w-0 rounded-xl border border-gray-200/90 hover:border-[#d72828]/50 bg-white p-2.5 sm:p-3 flex flex-col transition-all hover:shadow-sm">
      <Link
        href={productUrl}
        className="relative h-28 sm:h-32 w-full rounded-lg bg-gray-50/70 flex items-center justify-center p-2 mb-2 overflow-hidden"
      >
        {product.hasDiscount && product.discountPercent > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {product.discountPercent}% OFF
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={product.name || "Recommended product"}
          loading="lazy"
          onError={handleImgError}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <Link href={productUrl} className="block">
        <h3
          title={product.name}
          className="text-xs sm:text-[13px] font-semibold text-gray-900 group-hover:text-[#d72828] transition-colors leading-snug line-clamp-2 min-h-[2.25rem]"
        >
          {product.name}
        </h3>
      </Link>

      <div className="mt-1.5 mb-2.5 flex items-baseline flex-wrap gap-1.5">
        <span className="text-sm sm:text-[15px] font-bold text-gray-900">
          ₹{Number(product.currentPrice || 0).toLocaleString("en-IN")}
        </span>
        {product.hasDiscount && product.originalPrice > product.currentPrice && (
          <span className="text-[11px] text-gray-400 line-through">
            ₹{Number(product.originalPrice).toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddToCart(product)}
        disabled={isAdding || isAdded}
        className={`mt-auto w-full rounded-lg border py-2 px-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:cursor-default ${
          isAdded
            ? "bg-emerald-600 border-emerald-600 text-white"
            : isAdding
              ? "bg-red-50 border-[#d72828]/60 text-[#d72828] opacity-75"
              : "bg-white border-[#d72828] text-[#d72828] hover:bg-[#d72828] hover:text-white"
        }`}
      >
        {isAdded ? "Added ✓" : isAdding ? "Adding..." : "+ Add to Cart"}
      </button>
    </div>
  );
}

export default function CartRecommendations({
  cartItems = [],
  region = "tamilnadu",
  pincode = "",
  userLocation = null,
  onAddedToCart,
  onError,
}) {
  const { updateCartCount } = useCart();
  const [rawRecommendations, setRawRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [recentlyAddedIds, setRecentlyAddedIds] = useState({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef(null);
  const addedTimersRef = useRef({});
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const timers = addedTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const excludeSets = useMemo(() => buildCartExcludeSets(cartItems), [cartItems]);

  // Order newest-added cart items first so latest additions drive top picks
  const orderedCartProductIds = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (let i = cartItems.length - 1; i >= 0; i -= 1) {
      const pid = extractCartProductId(cartItems[i]);
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      list.push(pid);
    }
    return list;
  }, [cartItems]);

  const cartIdsKey = orderedCartProductIds.join(",");

  useEffect(() => {
    const targetIds = cartIdsKey ? cartIdsKey.split(",") : [];
    if (!targetIds.length) {
      setRawRecommendations([]);
      setLoading(false);
      hasLoadedOnceRef.current = false;
      return undefined;
    }

    const excludeIdSet = new Set(targetIds);
    let cancelled = false;
    const effectiveRegion = region || "tamilnadu";

    const loadRecommendations = async () => {
      // Only show skeleton before first load so remove/add sync doesn't flicker
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }

      try {
        // 1. Ensure metadata (category, brand, related_products) for cart items
        const uncachedIds = targetIds.filter((id) => !productMetaCache.has(id));
        if (uncachedIds.length > 0) {
          const metaRes = await fetch(
            `/api/product/by-ids?ids=${encodeURIComponent(uncachedIds.join(","))}`
          );
          if (metaRes.ok) {
            const metaJson = await metaRes.json().catch(() => null);
            const docs = Array.isArray(metaJson?.products) ? metaJson.products : [];
            docs.forEach((doc) => {
              if (doc?._id) productMetaCache.set(String(doc._id), doc);
            });
          }
        }
        if (cancelled) return;

        // 2. Extract priority category/brand pairs + explicit related_products IDs
        const categoryTargets = [];
        const seenCategories = new Set();
        const explicitRelatedIds = [];
        const seenRelatedIds = new Set();

        for (const pid of targetIds) {
          const doc = productMetaCache.get(pid);
          if (!doc) continue;

          if (Array.isArray(doc.related_products)) {
            for (const rel of doc.related_products) {
              const relId =
                typeof rel === "object" && rel !== null
                  ? String(rel._id || rel.id || "")
                  : String(rel || "");
              if (
                relId &&
                !excludeIdSet.has(relId) &&
                !seenRelatedIds.has(relId)
              ) {
                seenRelatedIds.add(relId);
                explicitRelatedIds.push(relId);
              }
            }
          }

          const categoryId = String(doc.category || doc.sub_category || "").trim();
          const brandId =
            typeof doc.brand === "object" && doc.brand !== null
              ? String(doc.brand._id || doc.brand.id || "")
              : String(doc.brand || "").trim();

          if (
            categoryId &&
            !seenCategories.has(categoryId) &&
            categoryTargets.length < MAX_CATEGORY_BUCKETS
          ) {
            seenCategories.add(categoryId);
            categoryTargets.push({ categoryId, brandId });
          }
        }

        if (!categoryTargets.length && !explicitRelatedIds.length) {
          if (!cancelled) {
            setRawRecommendations([]);
            hasLoadedOnceRef.current = true;
            setLoading(false);
          }
          return;
        }

        const primaryExcludeId = targetIds[0] || "";
        const perBucketLimit = String(
          Math.min(20, (categoryTargets.length === 1 ? 12 : 8) + targetIds.length)
        );

        // 3. Query existing /api/product/related per category (mixing if multiple)
        const requests =
          categoryTargets.length > 0
            ? categoryTargets.map((target, idx) => {
                const params = new URLSearchParams({
                  limit: perBucketLimit,
                  category: target.categoryId,
                  region: effectiveRegion,
                });
                if (target.brandId) params.set("brand", target.brandId);
                if (primaryExcludeId) params.set("exclude", primaryExcludeId);
                if (idx === 0 && explicitRelatedIds.length > 0) {
                  params.set("ids", explicitRelatedIds.slice(0, 12).join(","));
                }
                return fetch(`/api/product/related?${params.toString()}`)
                  .then((res) => (res.ok ? res.json() : null))
                  .then((json) => (Array.isArray(json?.products) ? json.products : []))
                  .catch(() => []);
              })
            : [
                (() => {
                  const params = new URLSearchParams({
                    limit: perBucketLimit,
                    ids: explicitRelatedIds.slice(0, 12).join(","),
                    region: effectiveRegion,
                  });
                  if (primaryExcludeId) params.set("exclude", primaryExcludeId);
                  return fetch(`/api/product/related?${params.toString()}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((json) => (Array.isArray(json?.products) ? json.products : []))
                    .catch(() => []);
                })(),
              ];

        const buckets = await Promise.all(requests);
        if (cancelled) return;

        const combined = interleaveBuckets(buckets, MAX_RECOMMENDATIONS + 4);
        setRawRecommendations(combined);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        console.error("Cart recommendations load error:", err);
        if (!cancelled && !hasLoadedOnceRef.current) {
          setRawRecommendations([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [cartIdsKey, region]);

  // Strict reactive filtering: active, in-stock, and never duplicate cart items
  const visibleRecommendations = useMemo(() => {
    return rawRecommendations
      .filter((product) => {
        if (!isProductEligible(product)) return false;
        const pid = String(product._id);
        if (recentlyAddedIds[pid]) return true;
        return !isProductInCart(product, excludeSets);
      })
      .slice(0, MAX_RECOMMENDATIONS);
  }, [rawRecommendations, excludeSets, recentlyAddedIds]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [visibleRecommendations, loading, updateScrollState]);

  const scrollByStep = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({ left: direction * step, behavior: "smooth" });
    setTimeout(updateScrollState, 320);
  };

  const handleAddRecommendation = async (product) => {
    const pid = product?._id ? String(product._id) : "";
    if (!pid || addingId) return;

    const qty = Number(product.quantity ?? 0);
    const isOpenBox =
      (product.movement === "FOCUS" || product.movement === "EOL") && qty < 10;
    if (isOpenBox) {
      window.location.href = `/product/${product.slug}`;
      return;
    }

    setAddingId(pid);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      let guestCartId =
        typeof window !== "undefined"
          ? localStorage.getItem("guestCartId")
          : null;
      if (!token && !guestCartId && typeof window !== "undefined") {
        guestCartId = uuidv4();
        localStorage.setItem("guestCartId", guestCartId);
      }

      const effectivePincode = pincode || userLocation?.pincode || "";
      const effectiveUserState =
        userLocation?.stateName ||
        userLocation?.state ||
        (region === "karnataka" ? "Karnataka" : "Tamil Nadu");
      const effectiveRegion =
        region ||
        userLocation?.region ||
        (effectiveUserState === "Karnataka" ? "karnataka" : "tamilnadu");

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(guestCartId ? { guestCartId } : {}),
        },
        body: JSON.stringify({
          productId: pid,
          original_prod_quantity: qty,
          quantity: 1,
          guestCartId: guestCartId || undefined,
          pincode: effectivePincode,
          userState: effectiveUserState,
          region: effectiveRegion,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 409
            ? "Stock limit exceeded!"
            : data?.error || "Failed to add product to cart";
        onError?.(msg);
        return;
      }

      if (data?.guestCartId && typeof window !== "undefined") {
        localStorage.setItem("guestCartId", data.guestCartId);
      }
      if (data?.cart?.totalItems != null) {
        updateCartCount(data.cart.totalItems);
      }

      // Brief "Added ✓" feedback before sync removes the item from recommendations
      setRecentlyAddedIds((prev) => ({ ...prev, [pid]: true }));
      if (addedTimersRef.current[pid]) {
        clearTimeout(addedTimersRef.current[pid]);
      }
      addedTimersRef.current[pid] = setTimeout(() => {
        setRecentlyAddedIds((prev) => {
          const next = { ...prev };
          delete next[pid];
          return next;
        });
        delete addedTimersRef.current[pid];
      }, ADDED_FEEDBACK_MS);

      try {
        ga4AddToCart({
          product: {
            id: pid,
            name: product.name,
            price: Number(product.currentPrice || 0),
            qty: 1,
          },
        });
      } catch {
        // ignore tracking failures
      }

      await onAddedToCart?.();
    } catch (err) {
      console.error("Add recommendation to cart error:", err);
      onError?.("Failed to add product to cart. Please try again.");
    } finally {
      setAddingId("");
    }
  };

  if (!cartItems.length) return null;
  if (!loading && visibleRecommendations.length === 0) return null;

  return (
    <section
      aria-label="Recommended for You"
      className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs w-full min-w-0"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3.5">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Recommended for You
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete your purchase with these picks
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous recommendations"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            disabled={!canScrollRight}
            aria-label="Next recommendations"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex flex-nowrap gap-2.5 sm:gap-3.5 overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth pb-1"
      >
        {loading && visibleRecommendations.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <RecommendationSkeletonCard key={idx} />
            ))
          : visibleRecommendations.map((product) => {
              const pid = String(product._id);
              return (
                <RecommendationCard
                  key={pid}
                  rawProduct={product}
                  isAdding={addingId === pid}
                  isAdded={Boolean(recentlyAddedIds[pid])}
                  onAddToCart={handleAddRecommendation}
                />
              );
            })}
      </div>
    </section>
  );
}
