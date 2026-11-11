"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCart } from '@/context/CartContext';
import { useRegion } from '@/context/RegionContext';
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { MdSecurity, MdLoop, MdVerified, MdCardMembership, MdLocalShipping, MdLock } from "react-icons/md";
import { useWishlist } from '@/context/WishlistContext';
import ProductAddtoCart from "@/components/ProductAddtoCart";
import CartItemRow, { getItemId } from "@/components/cart/CartItemRow";
import { getDiscountInfo } from "@/lib/discountHelper";


const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

const getWarrantyPrice = (item) => {
  if (!item) return 0;
  if (item.extendedWarranty != null && Number(item.extendedWarranty) > 0) {
    return Number(item.extendedWarranty);
  }
  if (item.warrantyData?.price != null && Number(item.warrantyData.price) > 0) {
    return Number(item.warrantyData.price);
  }
  if (item.warrantyData?.amount != null && Number(item.warrantyData.amount) > 0) {
    return Number(item.warrantyData.amount);
  }
  if (typeof item.warranty === "number" && item.warranty > 10) {
    return item.warranty;
  }
  return 0;
};

const getItemWarranty = (item) => {
  if (!item) return null;
  const wd = item.warrantyData;
  const price = getWarrantyPrice(item);
  const year = Number(
    wd?.year ||
    wd?.duration ||
    item.selectedWarranty ||
    (typeof item.warranty === "number" && item.warranty <= 5 ? item.warranty : 0) ||
    0
  );

  // If neither a warranty price nor a valid year was chosen, do not show warranty
  if (price <= 0 && year <= 0) return null;

  const rawTitle = wd?.title || wd?.name;
  const hasValidName =
    rawTitle &&
    typeof rawTitle === "string" &&
    rawTitle.trim() !== "" &&
    rawTitle.toLowerCase() !== "null" &&
    rawTitle.toLowerCase() !== "undefined";

  const title =
    (hasValidName ? rawTitle : "") ||
    (year > 0 ? `${year} Year Extended Warranty` : "Extended Warranty Protection");

  return {
    title,
    duration: wd?.duration || (year > 0 ? `${year} Year` : ""),
    price,
    item_no: wd?.item_no || null,
  };
};

const getItemVariations = (item) => {
  if (!item) return [];
  const entries = [];
  const seenKeys = new Set();

  const addEntry = (rawKey, rawVal) => {
    if (!rawKey || rawVal == null) return;
    const key = String(rawKey).trim();
    if (seenKeys.has(key.toLowerCase())) return;

    let val = "";
    if (typeof rawVal === "object") {
      val = rawVal.label || rawVal.value || rawVal.name || "";
    } else {
      val = String(rawVal).trim();
    }
    if (!val || val.toLowerCase() === "undefined" || val.toLowerCase() === "null") return;

    seenKeys.add(key.toLowerCase());
    entries.push({ key, value: val });
  };

  if (item.variantValues && typeof item.variantValues === "object") {
    for (const [k, v] of Object.entries(item.variantValues)) {
      addEntry(k, v);
    }
  }

  if (item.selectedVariant && typeof item.selectedVariant === "object") {
    for (const [k, v] of Object.entries(item.selectedVariant)) {
      addEntry(k, v);
    }
  }

  if (item.color) {
    addEntry("Color", item.color);
  }

  if (Array.isArray(item.attributes)) {
    item.attributes.forEach((attr) => {
      if (attr && (attr.name || attr.key) && (attr.value || attr.val)) {
        addEntry(attr.name || attr.key, attr.value || attr.val);
      }
    });
  }

  return entries;
};

const features = [
  { icon: "🚗", title: "Free Shipping", description: "Free shipping all over the US" },
  { icon: "🔒", title: "100% Satisfaction", description: "Guaranteed satisfaction with every order" },
  { icon: "💼", title: "Secure Payments", description: "We ensure secure transactions" },
  { icon: "💬", title: "24/7 Support", description: "We're here to help anytime" },
];

const ConfirmModal = ({ show, onClose, onConfirm }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Remove item?</h3>
          <p className="text-gray-500 mb-4">Are you sure you want to delete this item from your cart?</p>
          <div className="flex justify-center space-x-4">
            <button
              className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={onConfirm}
            >
              Yes, Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const SuccessModal = ({ show, message, onClose }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
        >
          <h3 className="text-xl font-semibold text-green-600 mb-2">Success!</h3>
          <p className="text-gray-500 mb-4">{message}</p>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            onClick={onClose}
          >
            OK
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ErrorModal = ({ show, message, onClose }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
        >
          <h3 className="text-xl font-semibold text-red-600 mb-2">Warning!</h3>
          <p className="text-gray-500 mb-4">{message}</p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            onClick={onClose}
          >
            OK
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// NEW: deep-compare helpers (avoid re-renders/flicker)
const normalizeOffersList = (offers = []) =>
  offers
    .filter(o => o && o.code)
    .map(o => ({
      code: String(o.code),
      percentage: Number(o.percentage || 0) || 0,
      fixed_price: Number(o.fixed_price || 0) || 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

const isSameOffers = (a, b) => {
  try {
    const na = normalizeOffersList(a);
    const nb = normalizeOffersList(b);
    return JSON.stringify(na) === JSON.stringify(nb);
  } catch {
    return false;
  }
};

function CompleteYourPurchase({ products, scrollRef, updateCartCount, isLoading }) {
  if (isLoading && (!products || !products.length)) {
    return (
      <div className="mt-4 bg-white border border-gray-200 rounded-xs p-4 sm:p-5 shadow-2xs animate-pulse">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div>
            <div className="h-5 w-48 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 w-64 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden py-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-shrink-0 w-[200px] sm:w-[220px] border border-gray-200 rounded-xs p-3.5 flex flex-col items-center gap-2.5 bg-white">
              <div className="w-28 h-28 bg-gray-100 rounded"></div>
              <div className="h-4 w-36 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-full bg-gray-200 rounded mt-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xs p-4 sm:p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Frequently Bought Together</h2>
          <p className="text-xs text-gray-400 font-normal mt-0.5">Essential add-ons for your selected items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-2xs cursor-pointer"
            aria-label="Previous"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-2xs cursor-pointer"
            aria-label="Next"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Cards */}
      <div
        ref={scrollRef}
        className="flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-2 pt-1 scrollbar-hide snap-x snap-mandatory"
      >
        {products.map((product, pIdx) => {
          const price =
            product.special_price > 0 && product.special_price < product.price
              ? product.special_price
              : product.price;
          const image = product.images?.[0]
            ? product.images[0].startsWith("http")
              ? product.images[0]
              : `/uploads/products/${product.images[0]}`
            : "/uploads/sathyalogo.webp";
          const subtitle =
            product.key_specifications?.[0]?.split(":")?.[1]?.trim() ||
            product.model_number ||
            "";

          const productKey = product._id
            ? String(product._id)
            : (product.item_code || product.slug || `addon-${pIdx}`);

          return (
            <div
              key={productKey}
              className="flex-shrink-0 w-[200px] sm:w-[220px] border border-gray-200 rounded-xs p-3.5 flex flex-col items-center gap-2.5 bg-white hover:shadow-xs transition-shadow snap-start"
            >
              {/* Image */}
              <div className="w-28 h-28 flex items-center justify-center p-1 bg-white relative overflow-hidden">
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/uploads/sathyalogo.webp"; }}
                />
              </div>

              {/* Name */}
              <p className="text-xs sm:text-sm font-medium text-gray-900 text-center line-clamp-2 leading-snug min-h-[36px]">
                {product.name}
              </p>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-[11px] text-gray-400 text-center line-clamp-1">{subtitle}</p>
              )}

              {/* Price */}
              <p className="text-sm sm:text-base font-bold text-gray-900">
                ₹{Number(price).toLocaleString("en-IN")}
              </p>

              {/* Add Button */}
              <div className="w-full mt-auto">
                <ProductAddtoCart
                  productId={product._id}
                  stockQuantity={product.quantity}
                  quantity={1}
                  additionalProducts={[]}
                  extendedWarranty={0}
                  selectedFrequentProducts={[]}
                  selectedRelatedProducts={[]}
                  buttonLabel="Add"
                  buttonClassName="border border-[#d72828] text-[#d72828] hover:bg-red-50 text-xs py-2 w-full rounded-xs font-bold transition-colors cursor-pointer"
                  movement={product.movement}
                  productName={product.name}
                  productSlug={product.slug}
                  onSuccess={() => window.location.reload()}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// NEW: module-level cache and in-flight request deduplication for Frequently Bought Together
const addonsCache = new Map();
const inFlightAddonPromises = new Map();

const fetchAddonsForProduct = async (firstProductId) => {
  if (!firstProductId) return [];
  if (addonsCache.has(firstProductId)) {
    return addonsCache.get(firstProductId);
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`addons_${firstProductId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        addonsCache.set(firstProductId, parsed);
        return parsed;
      }
    } catch {}
  }
  if (inFlightAddonPromises.has(firstProductId)) {
    return inFlightAddonPromises.get(firstProductId);
  }

  const fetchPromise = (async () => {
    try {
      const featRes = await fetch("/api/product/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: firstProductId }),
      });
      const featData = await featRes.json();
      const featDataArr = featData?.products || featData || [];
      addonsCache.set(firstProductId, featDataArr);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`addons_${firstProductId}`, JSON.stringify(featDataArr));
        } catch {}
      }
      return featDataArr;
    } catch (e) {
      console.error("Complete your purchase fetch error:", e);
      return [];
    } finally {
      inFlightAddonPromises.delete(firstProductId);
    }
  })();

  inFlightAddonPromises.set(firstProductId, fetchPromise);
  return fetchPromise;
};

export default function CartComponent() {
  const router = useRouter();
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cartCount, updateCartCount } = useCart();
  const { region, isInitialized } = useRegion();
  const { updateWishlist } = useWishlist();

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingQuantityId, setUpdatingQuantityId] = useState(null);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState(""); // inline success text

  const [completeYourPurchase, setCompleteYourPurchase] = useState([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [priceNotice, setPriceNotice] = useState(null);
  const completeScrollRef = useRef(null);

  // Restore initial cached cartData and completeYourPurchase safely on client mount (prevents hydration mismatch)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cartData");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setCartData(parsed);
          setLoading(false);

          const firstPid = parsed.items[0]?.productId;
          if (firstPid) {
            const cachedAddons = sessionStorage.getItem(`addons_${firstPid}`);
            if (cachedAddons) {
              const addons = JSON.parse(cachedAddons);
              const cartPids = parsed.items.map(i => i.productId?.toString() || i.productId);
              const filtered = (addons || []).filter(p => !cartPids.includes(p._id?.toString()));
              setCompleteYourPurchase(filtered);
            }
          }
        }
      }
    } catch {}
  }, []);

  // Coupon feature toggle state (shared)
  const [couponFeatureEnabled, setCouponFeatureEnabled] = useState(true);
  const [hasActiveOfferProduct, setHasActiveOfferProduct] = useState(false);

  // New: active offer codes now store objects: { code, percentage, fixed_price }
  const [activeOfferCodes, setActiveOfferCodes] = useState([]);
  // NEW: loading state for initial render (no flicker on background refresh)
  const [isOffersLoading, setIsOffersLoading] = useState(true);
  // NEW: track which coupon was just copied to show ✅ temporarily
  const [copiedCode, setCopiedCode] = useState(null);
  // NEW: refs for live updates and cleanup
  const offersAbortRef = useRef(null);
  const offersIntervalRef = useRef(null);
  const offersSSERef = useRef(null);

  // Copy coupon to clipboard and reflect UI
  const handleCopyCoupon = async (code) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch (_) {
      // no-op
    }
    // Update input and focus
    setCouponCode(code);
    setCouponError("");
    setCouponSuccess("");
    const inputEl = document.getElementById("coupon_input");
    if (inputEl) {
      inputEl.focus();
      try {
        const end = code.length;
        inputEl.setSelectionRange(end, end);
      } catch {}
    }
    // Show copied indicator briefly
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // NEW: helper to robustly check coupon validity using optional from/to dates
  const isCouponValid = (coupon) => {
    try {
      // Accept multiple possible field names
      const fromRaw = coupon?.from_date ?? coupon?.fromDate ?? coupon?.valid_from ?? null;
      const toRaw = coupon?.to_date ?? coupon?.toDate ?? coupon?.valid_to ?? null;

      // If neither date is provided, coupon is valid by date constraints
      if (!fromRaw && !toRaw) return true;

      // Helper to parse various inputs into a valid Date or null
      const parseDate = (raw) => {
        if (raw === null || raw === undefined || raw === "") return null;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      };

      const from = parseDate(fromRaw);
      const to = parseDate(toRaw);

      // If both parsed dates are invalid, treat as no date constraints
      if (!from && !to) return true;

      // Compute UTC start-of-day (00:00 UTC) for robust date-only comparisons
      const utcStartOfDay = (d) =>
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

      const now = new Date();
      const todayUTC = utcStartOfDay(now);

      if (from) {
        const fromUTC = utcStartOfDay(from);
        // today must be same or after from date
        if (todayUTC < fromUTC) return false;
      }

      if (to) {
        const toUTC = utcStartOfDay(to);
        // today must be same or before to date
        if (todayUTC > toUTC) return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  // NEW: shared fetcher for active offer codes (used by SSE triggers, polling, focus/visibility)
  const fetchActiveCodes = useCallback(async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setIsOffersLoading(true);
      // Abort previous in-flight fetch
      if (offersAbortRef.current) {
        try { offersAbortRef.current.abort(); } catch {}
      }
      const ac = new AbortController();
      offersAbortRef.current = ac;

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const resp = await fetch("/api/offers/offer-products?listActiveCodes=1", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: ac.signal,
        cache: "no-store",
      });

      const json = await resp.json().catch(() => null);
      const offers = Array.isArray(json?.offers)
        ? json.offers.map(o => ({
            // preserve date fields for client-side validity checks
            code: o.code || o.offer_code || o.offerCode || "",
            percentage: Number(o.percentage || 0) || 0,
            fixed_price: Number(o.fixed_price || 0) || 0,
            from_date: o.from_date ?? o.fromDate ?? o.valid_from ?? null,
            to_date: o.to_date ?? o.toDate ?? o.valid_to ?? null,
          })).filter(o => o.code)
        : Array.isArray(json?.codes)
          ? json.codes.map(c => ({ code: c, percentage: 0, fixed_price: 0, from_date: null, to_date: null }))
          : [];

      // Update state only if changed to avoid flicker
      if (!isSameOffers(activeOfferCodes, offers)) {
        setActiveOfferCodes(offers);
      }
    } catch {
      // keep current offers on error to avoid flicker
    } finally {
      setIsOffersLoading(false);
    }
  }, [activeOfferCodes]);

  // Sync helpers and storage listener
  const isSameCart = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };
  const saveCartState = (cart) => {
    try {
      localStorage.setItem('cartData', JSON.stringify(cart));
      if (typeof cart?.totalItems === 'number') {
        localStorage.setItem('cartCount', String(cart.totalItems));
      }
    } catch {}
  };
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'cartData') {
        const next = e.newValue ? JSON.parse(e.newValue) : null;
        // Only update state; do not write back to localStorage here to avoid loops
        if (!isSameCart(next, cartData)) {
          setCartData(next);
          updateCartCount(next?.totalItems ?? 0);
        }
      }
      if (e.key === 'appliedCoupon') {
        const nextCoupon = e.newValue ? JSON.parse(e.newValue) : null;
        setAppliedCoupon(nextCoupon);
      }
      // Listen to coupon feature toggle
      if (e.key === 'couponFeatureEnabled') {
        try {
          const next = e.newValue ? JSON.parse(e.newValue) : true;
          setCouponFeatureEnabled(next);
        } catch {
          setCouponFeatureEnabled(true);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cartData, updateCartCount]);

  // Initialize coupon feature toggle and subscribe to BroadcastChannel
  useEffect(() => {
    try {
      const saved = localStorage.getItem('couponFeatureEnabled');
      setCouponFeatureEnabled(saved === null ? true : JSON.parse(saved));
    } catch {
      setCouponFeatureEnabled(true);
    }

    let bc;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('couponFeature');
      bc.onmessage = (ev) => setCouponFeatureEnabled(Boolean(ev.data));
    }
    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Fetch and set hasActiveOfferProduct from API (fallback to false on errors)
  const fetchOfferProductsActive = async (signal) => {
    try {
      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const resp = await fetch("/api/offers/offer-products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json) {
        setHasActiveOfferProduct(false);
        return;
      }
      const bool =
        typeof json.hasActiveOfferProduct === "boolean"
          ? json.hasActiveOfferProduct
          : (Array.isArray(json?.data) ? json.data.length > 0 : false);
      setHasActiveOfferProduct(Boolean(bool));
    } catch (e) {
      if (e?.name !== "AbortError") setHasActiveOfferProduct(false);
    }
  };

  // Re-check on mount and when cart items length changes
  useEffect(() => {
    const controller = new AbortController();
    fetchOfferProductsActive(controller.signal);
    return () => controller.abort();
  }, [cartData?.items?.length]);

  // Re-check on window focus
  useEffect(() => {
    const onFocus = () => fetchOfferProductsActive();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const fetchCartData = useCallback(async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem('token') : null;
      let response = null;

      const guestCartId = typeof window !== "undefined" ? (localStorage.getItem("guestCartId") || uuidv4()) : null;
      if (guestCartId && typeof window !== "undefined") {
        localStorage.setItem("guestCartId", guestCartId);
      }

      const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(guestCartId ? { 'guestCartId': guestCartId } : {}),
      };

      response = await fetch('/api/cart', {
        headers,
        method: "GET",
        cache: "no-store",
      });

      // Safely read response JSON stream exactly once
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errMessage = data?.error || data?.message || '';
        // If auth failure / token expired
        if (
          response.status === 401 ||
          response.status === 403 ||
          errMessage === "Token has expired" ||
          errMessage === "Invalid token" ||
          errMessage === "Authorization token required" ||
          (typeof errMessage === 'string' && (
            errMessage.toLowerCase().includes("token") ||
            errMessage.toLowerCase().includes("jwt") ||
            errMessage.toLowerCase().includes("unauthorized")
          ))
        ) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            window.location.reload();
          }
          return;
        }

        // If cart is not found (404), fallback to empty cart state gracefully
        if (response.status === 404) {
          const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
          setCartData(emptyCart);
          saveCartState(emptyCart);
          return;
        }

        throw new Error(errMessage || `Failed to fetch cart (${response.status})`);
      }

      if (!data || !data.cart) {
        const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
        setCartData(emptyCart);
        saveCartState(emptyCart);
        return;
      }

      const rawItems = data?.cart?.items || [];
      const itemsWithDiscount = rawItems.map(item => ({
        ...item,
        discount: 0
      }));

      // Persist and set state
      const nextCart = { ...data.cart, items: itemsWithDiscount };
      setCartData(nextCart);
      saveCartState(nextCart);

      // If price changes occurred, invalidate stale checkout data and notify user
      if (data?.cart?.priceChanges && data.cart.priceChanges.length > 0) {
        try {
          localStorage.removeItem('checkoutData');
        } catch {}
        setPriceNotice(data.cart.priceChanges);
      }

      // Apply saved coupon if present and persist
      const savedCoupon = typeof window !== "undefined" ? localStorage.getItem('appliedCoupon') : null;
      if (savedCoupon) {
        try {
          const coupon = JSON.parse(savedCoupon);
          setAppliedCoupon(coupon);
          const discountedItems = applyDiscountToItems(coupon, nextCart.items);
          const discountedCart = { ...nextCart, items: discountedItems };
          setCartData(discountedCart);
          saveCartState(discountedCart);
        } catch {}
      }
    } catch (err) {
      if (!opts.silent) setError(err.message);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, []);

  // Load cart after the header pincode is known, and again when it changes.
  useEffect(() => {
    if (!isInitialized) return;
    fetchCartData({ silent: Boolean(cartData?.items?.length) });
  }, [fetchCartData, isInitialized, region]);

  // Window focus & tab visibility change listener to auto-refresh latest prices
  useEffect(() => {
    const handleFocus = () => fetchCartData({ silent: true });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCartData({ silent: true });
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchCartData]);

  useEffect(() => {
    let isMounted = true;

    const loadAddons = async () => {
      // Find firstProductId from state or fallback to localStorage immediately
      let firstProductId = cartData?.items?.[0]?.productId;
      if (!firstProductId && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("cartData");
          if (saved) {
            const parsed = JSON.parse(saved);
            firstProductId = parsed?.items?.[0]?.productId;
          }
        } catch {}
      }

      if (!firstProductId) {
        if (isMounted) {
          setCompleteYourPurchase([]);
          setAddonsLoading(false);
        }
        return;
      }

      const cartProductIds = (cartData?.items || []).map(i => i.productId?.toString() || i.productId);

      // Check synchronous memory cache first (0ms latency)
      if (addonsCache.has(firstProductId)) {
        const featDataArr = addonsCache.get(firstProductId);
        const filtered = (featDataArr || []).filter(
          p => !cartProductIds.includes(p._id?.toString())
        );
        if (isMounted) {
          setCompleteYourPurchase(filtered);
          setAddonsLoading(false);
        }
        return;
      }

      if (!completeYourPurchase.length && isMounted) {
        setAddonsLoading(true);
      }

      // Fetch addons (or reuse in-flight promise if already requested)
      const featDataArr = await fetchAddonsForProduct(firstProductId);
      if (!isMounted) return;

      const filtered = (featDataArr || []).filter(
        p => !cartProductIds.includes(p._id?.toString())
      );
      setCompleteYourPurchase(filtered);
      setAddonsLoading(false);
    };

    loadAddons();

    return () => {
      isMounted = false;
    };
  }, [cartData?.items]);


  const applyDiscountToItems = (coupon, items) => {
    if (!coupon || !items) return items;

    // Determine eligible items: if offer_product provided, restrict to those; else all items
    const eligibleItems = Array.isArray(coupon.offer_product) && coupon.offer_product.length
      ? items.filter(i => coupon.offer_product.includes(i.productId))
      : items;

    if (!eligibleItems.length) {
      // No eligible items; clear discounts
      return items.map(i => ({ ...i, discount: 0, coupondetails: [] }));
    }

    const lineTotal = (i) => (Number(i.price) || 0) * (Number(i.quantity) || 0);
    const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + lineTotal(i), 0);

    // Compute cart-level discount according to rules
    let totalDiscount = 0;
    if (coupon.offer_type === "percentage" && Number(coupon.percentage) > 0) {
      totalDiscount = eligibleSubtotal * (Number(coupon.percentage) / 100);
    } else if (coupon.offer_type === "fixed_price" && Number(coupon.fixed_price) > 0) {
      totalDiscount = Number(coupon.fixed_price);
    }

    // Cap discount so it never exceeds the eligible subtotal
    totalDiscount = Math.min(totalDiscount, eligibleSubtotal);
    totalDiscount = Number(totalDiscount.toFixed(2));

    // Distribute proportionally across eligible items
    const isEligible = (pid) => eligibleItems.some(e => e.productId === pid);
    let distributed = 0;
    const distributedItems = items.map((item, idx, arr) => {
      if (!isEligible(item.productId) || eligibleSubtotal === 0 || totalDiscount === 0) {
        return { ...item, discount: 0, coupondetails: [] };
      }
      const base = lineTotal(item);
      // Proportional share
      let share = (base / eligibleSubtotal) * totalDiscount;
      let discount = Number(share.toFixed(2));
      distributed += discount;
      return {
        ...item,
        discount,
        coupondetails: discount > 0 ? [coupon] : []
      };
    });

    // Fix rounding drift on the last eligible item to match totalDiscount exactly
    const eligibleIndexes = distributedItems
      .map((it, idx) => (isEligible(it.productId) ? idx : -1))
      .filter(idx => idx !== -1);
    const drift = Number((totalDiscount - distributed).toFixed(2));
    if (eligibleIndexes.length && Math.abs(drift) >= 0.01) {
      const lastIdx = eligibleIndexes[eligibleIndexes.length - 1];
      distributedItems[lastIdx] = {
        ...distributedItems[lastIdx],
        discount: Number((distributedItems[lastIdx].discount + drift).toFixed(2))
      };
    }

    return distributedItems;
  };

  // Normalize offer object to client coupon shape (decide type from non-zero values)
  const normalizeOfferToCoupon = (offer) => {
    const code =
      offer.offer_code || offer.code || offer.couponCode || offer.offerCode || "";

    const status =
      (offer.status ||
       offer.fest_offer_status || // include fest_offer_status
       offer.offer_status ||
       offer.state ||
       "").toLowerCase();

    const typeRaw =
      (offer.offer_type || offer.type || offer.discount_type || "").toLowerCase();

    const percentage =
      Number(offer.percentage ?? offer.percent ?? (typeRaw.includes("percent") ? offer.discountValue : 0) ?? 0) || 0;

    const fixed =
      Number(offer.fixed_price ?? offer.amount ?? (!typeRaw.includes("percent") ? offer.discountValue : 0) ?? 0) || 0;

    const products =
      offer.offer_product ||
      offer.products ||
      offer.productIds ||
      offer.product_ids ||
      [];

    // Decide type from values
    const offer_type = percentage > 0 ? "percentage" : (fixed > 0 ? "fixed_price" : "");

    return {
      offer_code: code,
      offer_type,
      percentage: percentage > 0 ? percentage : 0,
      fixed_price: fixed > 0 ? fixed : 0,
      offer_product: Array.isArray(products) ? products : [],
      status
    };
  };


  const handleQuantityChange = async (productId, newQuantity, availableStock = null) => {
    if (newQuantity < 1) return;
    if (availableStock != null && newQuantity > availableStock) {
      setErrorMessage("Requested quantity exceeds available stock.");
      setShowErrorModal(true);
      throw new Error("Requested quantity exceeds available stock.");
    }
    setUpdatingQuantityId(productId);
    try {
      let response = '';
      const token = typeof window !== "undefined" ? localStorage.getItem('token') : null;
      const payload = { productId, quantity: newQuantity };

      if (token) {
        response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        const guestCartId = typeof window !== "undefined" ? (localStorage.getItem("guestCartId") || uuidv4()) : null;
        response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(guestCartId && { 'guestCartId': guestCartId })
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update quantity');
      }

      let updatedCart = {};
      try {
        updatedCart = await response.json();
      } catch {
        return;
      }

      if (!updatedCart || !updatedCart.cart) return;

      // Merge existing details strictly using unique getItemId
      const itemsMerged = updatedCart.cart.items.map(item => {
        const existingItem = cartData?.items?.find(i => getItemId(i) === getItemId(item));
        const stock = Number(
          item.available_stock ??
          existingItem?.available_stock ??
          item.original_quantity ??
          existingItem?.original_quantity ??
          10
        );
        return {
          ...existingItem,
          ...item,
          available_stock: stock,
          original_quantity: stock,
          discount: 0
        };
      });

      // Reapply coupon if exists
      let finalItems = itemsMerged;
      if (appliedCoupon) {
        finalItems = applyDiscountToItems(appliedCoupon, itemsMerged);
      }
      const finalCart = { ...updatedCart.cart, items: finalItems };
      setCartData(finalCart);
      updateCartCount(finalCart.totalItems);
      saveCartState(finalCart);
    } catch (err) {
      console.error('Update quantity error:', err);
      setErrorMessage(err.message || "Failed to update quantity");
      setShowErrorModal(true);
      throw err;
    } finally {
      setUpdatingQuantityId(null);
    }
  };

  const updateQuantity = handleQuantityChange;


  const confirmRemoveItem = (productId) => {
    setProductToDelete(productId);
    setShowConfirmModal(true);
  };

  const removeItem = async () => {
    try {
      let response = '';
      const token = typeof window !== "undefined" ? localStorage.getItem('token') : null;
      const guestCartId = typeof window !== "undefined" ? (localStorage.getItem("guestCartId") || uuidv4()) : null;

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(guestCartId && { 'guestCartId': guestCartId }),
      };

      const selectedItem = cartData?.items?.find((i) => {
        const pId = typeof i.productId === "object" ? i.productId?._id?.toString() : i.productId?.toString();
        return (
          (pId && pId === productToDelete) ||
          (i.comboId && i.comboId?.toString() === productToDelete) ||
          (i._id && i._id?.toString() === productToDelete) ||
          (i.item_code && i.item_code === productToDelete) ||
          (i.name && i.name === productToDelete)
        );
      });

      response = await fetch('/api/cart', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          productId: productToDelete,
          comboId: selectedItem?.comboId ? String(selectedItem.comboId) : undefined,
          name: selectedItem?.name || undefined,
          guestCartId: guestCartId || undefined,
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = data?.error || 'Failed to remove item';
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      const updatedCart = data;

      // Merge existing details safely
      const itemsMerged = (updatedCart?.cart?.items || []).map(item => {
        const existingItem = cartData?.items?.find(i => {
          if (item.productId && i.productId) return String(i.productId) === String(item.productId);
          if (item.comboId && i.comboId) return String(i.comboId) === String(item.comboId);
          if (item.name && i.name) return i.name.toLowerCase() === item.name.toLowerCase();
          return false;
        });
        return {
          ...item,
          discount: existingItem ? existingItem.discount : 0
        };
      });

      // Reapply coupon if exists
      let finalItems = itemsMerged;
      if (appliedCoupon) {
        finalItems = applyDiscountToItems(appliedCoupon, itemsMerged);
      }

let nextCartObj = { ...updatedCart.cart, items: finalItems };

      // If product-specific coupon no longer applicable, clear it and discounts
      if (appliedCoupon && appliedCoupon.offer_product && appliedCoupon.offer_product.includes(productToDelete)) {
        setAppliedCoupon(null);
        localStorage.removeItem('appliedCoupon');
        nextCartObj = {
          ...nextCartObj,
          items: nextCartObj.items.map(item => ({ ...item, discount: 0 }))
        };
      }

      // Re-fetch cart fresh from API to avoid stale data
      const token3 = typeof window !== "undefined" ? localStorage.getItem('token') : null;
      const guestId3 = typeof window !== "undefined" ? localStorage.getItem("guestCartId") : null;
      const freshHeaders = token3
        ? { Authorization: `Bearer ${token3}` }
        : (guestId3 ? { guestCartId: guestId3 } : {});
      const freshRes = await fetch('/api/cart', {
        headers: freshHeaders,
        method: 'GET',
        cache: 'no-store',
      });
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        const freshItems = freshData.cart.items.map(item => ({ ...item, discount: 0 }));
        let freshFinal = freshItems;
        if (appliedCoupon) {
          freshFinal = applyDiscountToItems(appliedCoupon, freshItems);
        }
        nextCartObj = { ...freshData.cart, items: freshFinal };
      }

      setCartData(nextCartObj);
      updateCartCount(nextCartObj.totalItems);
      saveCartState(nextCartObj);
      setSuccessMessage("Item removed from cart");
      setShowSuccessModal(true);
      // setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('Remove item error:', err);
      setError(err.message);
    } finally {
      setShowConfirmModal(false);
      setProductToDelete(null);
    }
  };
const validateCoupon = async () => {
  if (!couponFeatureEnabled) {
    setCouponError("Coupons are currently disabled");
    setCouponSuccess("");
    return;
  }

  const code = couponCode.trim();
  if (!code) {
    setCouponError("Please enter a coupon code");
    setCouponSuccess("");
    return;
  }

  setIsValidatingCoupon(true);
  setCouponError("");
  setCouponSuccess("");


  let dbCouponValid = false;

  try {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams({ code });

    const resp = await fetch(`/api/offers/offer-products?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await resp.json();

    if (resp.ok && data?.coupon) {
      const normalized = normalizeOfferToCoupon(data.coupon);

      // Active check
      const isActive = (normalized.status || "").toLowerCase() === "active";
      // Discount value check
      const hasDiscount = (normalized.percentage ?? 0) > 0 || (normalized.fixed_price ?? 0) > 0;
      // Cart product check
      const cartProductIds = cartData?.items?.map((i) => i.productId) || [];
      const isApplicable =
        !Array.isArray(normalized.offer_product) ||
        normalized.offer_product.length === 0 ||
        normalized.offer_product.some((id) => cartProductIds.includes(id));

      if (isActive && hasDiscount && isApplicable) {
        // ✅ DB coupon valid — existing flow exactly same
        const itemsWithDiscount = applyDiscountToItems(normalized, cartData.items);
        const newCart = { ...cartData, items: itemsWithDiscount };

        setAppliedCoupon(normalized);
        localStorage.setItem("appliedCoupon", JSON.stringify(normalized));
        setCartData(newCart);
        saveCartState(newCart);

        setCouponSuccess(`${normalized.offer_code} is applied`);
        setCouponError("");
        dbCouponValid = true;
      }
    }
  } catch (_) {

  }

  if (dbCouponValid) {
    setIsValidatingCoupon(false);
    return;
  }

  setCouponError("The coupon code entered is not valid.");
  setCouponSuccess("");
  setIsValidatingCoupon(false);
};


  const removeCoupon = () => {
    const newCart = {
      ...cartData,
      items: cartData.items.map((item) => ({ ...item, discount: 0 })),
    };
    setCartData(newCart);
    saveCartState(newCart);

    setAppliedCoupon(null);
    localStorage.removeItem("appliedCoupon");
    setCouponSuccess("");
    setSuccessMessage("Coupon removed successfully");
    setCouponCode("");
    setShowSuccessModal(true);
  };

 const moveToWishlist = async (productId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please login to add items to wishlist');
      setShowErrorModal(true);
      return;
    }

    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });

    if (!res.ok) throw new Error('Failed to add to wishlist');
    const wishlistData = await res.json();
updateWishlist(wishlistData.items, wishlistData.count);

    // wishlist success → directly remove from cart (no confirm modal)
    const token2 = localStorage.getItem('token');
    const response = await fetch('/api/cart', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token2}`
      },
      body: JSON.stringify({ productId })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Failed to remove from cart');

    const updatedCart = data;
    const itemsMerged = updatedCart.cart.items.map(item => {
      const existingItem = cartData.items.find(i => i.productId === item.productId);
      return { ...item, discount: existingItem ? existingItem.discount : 0 };
    });

    let finalItems = itemsMerged;
    if (appliedCoupon) {
      finalItems = applyDiscountToItems(appliedCoupon, itemsMerged);
    }

    const nextCart = { ...updatedCart.cart, items: finalItems };
    setCartData(nextCart);
    updateCartCount(nextCart.totalItems);
    saveCartState(nextCart);

    setSuccessMessage("Item moved to wishlist successfully");
    setShowSuccessModal(true);

  } catch (err) {
    console.error('Move to wishlist error:', err);
    setErrorMessage('Failed to move to wishlist. Try again.');
    setShowErrorModal(true);
  }
};
const checkDelivery = (pincode) => {
  const pinStr = (pincode || "").toString().trim();
  const pin = parseInt(pinStr, 10);
  if (!pinStr || pinStr.length !== 6 || isNaN(pin)) {
    return { available: false, message: "Please enter a valid 6-digit pincode" };
  }
  // South Indian Serviceable Pincodes (TN: 60-64, KL: 67-69, KA: 56-59, AP/TG: 50-53)
  const prefix2 = parseInt(pinStr.substring(0, 2), 10);
  const isSouthIndia =
    (prefix2 >= 60 && prefix2 <= 64) || // Tamil Nadu
    (prefix2 >= 67 && prefix2 <= 69) || // Kerala
    (prefix2 >= 56 && prefix2 <= 59) || // Karnataka
    (prefix2 >= 50 && prefix2 <= 53);   // Andhra Pradesh & Telangana

  if (isSouthIndia) {
    return { available: true, message: "✓ Delivery available to this location" };
  }
  return { available: false, message: "✗ Delivery not available for this pincode" };
};
const calculateMRP = () => {
  if (!cartData) return 0;
  return cartData.items.reduce((sum, item) => {
    return sum + ((item.actual_price ?? item.price ?? 0) * item.quantity);
  }, 0);
};

const calculateItemDiscount = () => {
  if (!cartData) return 0;
  return cartData.items.reduce((sum, item) => {
    const mrp = (item.actual_price ?? item.price ?? 0) * item.quantity;
    const selling = (item.price > 0 ? item.price : item.actual_price) * item.quantity;
    return sum + (mrp - selling);
  }, 0);
};

const calculateSubtotal = () => {
  if (!cartData) return 0;
  return cartData.items.reduce((sum, item) => {
    const itemPrice = item.price > 0 ? item.price : item.actual_price;
    return sum + (itemPrice * item.quantity) + getWarrantyPrice(item);
  }, 0);
};

const calculateTotalWarranty = () => {
  if (!cartData || !cartData.items) return 0;
  return cartData.items.reduce((sum, item) => sum + getWarrantyPrice(item), 0);
};

const calculateTotalExchange = () => {
  if (!cartData || !cartData.items) return 0;
  return cartData.items.reduce((sum, item) => {
    return sum + (Number(item.exchangeOffer?.price || 0) * (item.quantity || 1));
  }, 0);
};

  const calculateDiscount = () => {
    if (!appliedCoupon || !cartData) return 0;

    return cartData.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const exchange = calculateTotalExchange();
    return Math.max(0, subtotal - discount - exchange);
  };

  const calculateTotalMRP = () => calculateMRP();
  const calculateTotalDiscounts = () => calculateItemDiscount() + calculateDiscount();
  const calculateFinalTotal = () => calculateTotal();

  const proceedToCheckout = () => {

  if (!cartData) return;
  console.log("DEBUG appliedCoupon at checkout click:", appliedCoupon);

  // Calculate totals

  const subtotal = calculateSubtotal();

  const discount = calculateDiscount();

  const total = calculateTotal();

  // Save cart and coupon data to localStorage for checkout page

  localStorage.setItem('checkoutData', JSON.stringify({

    cart: {

      ...cartData,

      items: cartData.items.map(item => ({

        ...item,

        // Ensure all relevant fields are included

        productId: item.productId,

        name: item.name,

        price: item.price,

        quantity: item.quantity,

        warranty: item.warranty || 0,

        extendedWarranty: item.extendedWarranty || 0,

        discount: item.discount || 0,

        image: item.image,
        warrantyData: item.warrantyData || null,
        variantValues: item.variantValues || null,
        selectedVariant: item.selectedVariant || null,
        color: item.color || null,
        exchangeOffer: item.exchangeOffer || null,

      }))

    },

    coupon: appliedCoupon,

    discount,

    subtotal,

    total,

  }));

  router.push('/checkout');

};


  useEffect(() => {
    // Fetch active offer codes from DB (fest_offer_status2 and fest_offer_status are "active")
    const fetchActiveCodes = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const resp = await fetch("/api/offers/offer-products?listActiveCodes=1", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await resp.json().catch(() => null);
        // Prefer detailed offers; fallback to codes-only
        const offers = Array.isArray(json?.offers)
          ? json.offers.map(o => ({
              code: o.code || o.offer_code || o.offerCode || "",
              percentage: Number(o.percentage || 0) || 0,
              fixed_price: Number(o.fixed_price || 0) || 0,
              from_date: o.from_date ?? o.fromDate ?? o.valid_from ?? null,
              to_date: o.to_date ?? o.toDate ?? o.valid_to ?? null,
            })).filter(o => o.code)
          : Array.isArray(json?.codes)
            ? json.codes.map(c => ({ code: c, percentage: 0, fixed_price: 0, from_date: null, to_date: null }))
            : [];
        // console.log(offers);
        setActiveOfferCodes(offers);
      } catch {
        setActiveOfferCodes([]);
      }
    };
    fetchActiveCodes();
  }, []);

  // REPLACE old "fetch active codes" effect with live updates (SSE + polling + focus/visibility + BroadcastChannel)
  useEffect(() => {
    // initial fetch
    fetchActiveCodes({ silent: false });

    // SSE subscription (if backend supports SSE at this path)
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        const es = new EventSource("/api/offers/offer-products/stream", { withCredentials: false });
        offersSSERef.current = es;

        es.onmessage = (ev) => {
          // Try to parse payload; if it contains offers/codes, use them; else trigger a re-fetch
          try {
            const data = JSON.parse(ev.data);
            if (Array.isArray(data?.offers) || Array.isArray(data?.codes)) {
              const offers = Array.isArray(data?.offers)
                ? data.offers.map(o => ({
                    code: o.code || o.offer_code || o.offerCode || "",
                    percentage: Number(o.percentage || 0) || 0,
                    fixed_price: Number(o.fixed_price || 0) || 0,
                    from_date: o.from_date ?? o.fromDate ?? o.valid_from ?? null,
                    to_date: o.to_date ?? o.toDate ?? o.valid_to ?? null,
                  })).filter(o => o.code)
                : data.codes.map(c => ({ code: c, percentage: 0, fixed_price: 0, from_date: null, to_date: null }));
              if (!isSameOffers(activeOfferCodes, offers)) {
                setActiveOfferCodes(offers);
              }
            } else if (data?.type === "offersUpdated") {
              // generic update signal
              fetchActiveCodes({ silent: true });
            } else {
              // unknown payload -> refresh
              fetchActiveCodes({ silent: true });
            }
          } catch {
            // non-JSON payload -> refresh
            fetchActiveCodes({ silent: true });
          }
        };

        es.onerror = () => {
          // On SSE error, close and rely on polling
          try { es.close(); } catch {}
          if (offersSSERef.current === es) offersSSERef.current = null;
        };
      } catch {
        // ignore SSE failures
      }
    }

    // Polling (paused when tab hidden)
    const startPolling = () => {
      if (offersIntervalRef.current) return;
      offersIntervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchActiveCodes({ silent: true });
        }
      }, 15000); // 15s
    };
    const stopPolling = () => {
      if (offersIntervalRef.current) {
        clearInterval(offersIntervalRef.current);
        offersIntervalRef.current = null;
      }
    };
    startPolling();

    // Refetch on visibility/focus
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchActiveCodes({ silent: true });
        startPolling();
      } else {
        stopPolling();
      }
    };
    const onFocus = () => fetchActiveCodes({ silent: true });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    // BroadcastChannel fallback (if admin notifies via channel)
    let bc;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("offersUpdates");
      bc.onmessage = () => fetchActiveCodes({ silent: true });
    }

    return () => {
      // cleanup
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      stopPolling();
      if (offersSSERef.current) {
        try { offersSSERef.current.close(); } catch {}
        offersSSERef.current = null;
      }
      if (offersAbortRef.current) {
        try { offersAbortRef.current.abort(); } catch {}
        offersAbortRef.current = null;
      }
      if (bc) bc.close();
    };
  }, [fetchActiveCodes]);

  // Derived lists/flags used for rendering
  const validActiveOfferCodes = Array.isArray(activeOfferCodes) ? activeOfferCodes.filter(isCouponValid) : [];
  const expiredActiveOfferCodes = Array.isArray(activeOfferCodes) ? activeOfferCodes.filter((c) => !isCouponValid(c)) : [];
  const hasAnyValidActiveOffer = validActiveOfferCodes.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
          <p className="mt-4 text-gray-700 font-semibold text-sm">Loading your cart...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-red-50 rounded-lg max-w-md mx-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="min-h-[75vh] w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50/30">
        <div className="w-full max-w-2xl mx-auto p-8 sm:p-12 lg:p-14 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-50/60 via-white to-white rounded-[28px] border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
          {/* Sleek Minimalist Cart Visual with Glow & Float Animation */}
          <div className="relative mb-6 group">
            <div className="absolute inset-0 rounded-full bg-red-400/20 blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-50 to-red-100/60 border border-red-100 shadow-inner transform transition-transform duration-500 group-hover:scale-105 animate-[bounce_3s_infinite]">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#d72828] drop-shadow-xs"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
              </svg>
            </div>
          </div>

          {/* Eyebrow & Typography */}
          <span className="text-xs font-extrabold text-[#d72828] uppercase tracking-widest mb-2 block">
            YOUR CART IS EMPTY
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Your cart is empty
          </h2>

          <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-md mb-8">
            Looks like you haven&apos;t added anything to your cart yet. Explore our products to get started.
          </p>

          {/* Continue Shopping Button with Sathya Brand Red & Rounded-Full */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#d72828] to-[#ea3838] hover:from-[#c02020] hover:to-[#d72828] text-white text-sm sm:text-base font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
          >
            <span>Continue Shopping</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
return (
  <div className="bg-[#f1f3f6] min-h-screen py-4 sm:py-6 text-gray-900 font-sans">
    {/* Modals */}
    <ConfirmModal
      show={showConfirmModal}
      onClose={() => {
        setShowConfirmModal(false);
        setProductToDelete(null);
      }}
      onConfirm={removeItem}
    />
    <SuccessModal
      show={showSuccessModal}
      message={successMessage}
      onClose={() => setShowSuccessModal(false)}
    />
    <ErrorModal
      show={showErrorModal}
      message={errorMessage}
      onClose={() => setShowErrorModal(false)}
    />

    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Main Grid: Left Cart List + Right Price Details */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* LEFT COLUMN: Cart items & Coupons */}
        <div className="flex flex-col gap-4">
          {/* Cart Item Cards Header */}
          <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-gray-200/80 shadow-2xs">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>Shopping Cart</span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {cartData?.totalItems ?? cartData?.items?.length ?? 0} {(cartData?.totalItems ?? cartData?.items?.length ?? 0) === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-xs sm:text-sm font-semibold text-[#d72828] hover:text-[#b91c1c] transition-colors flex items-center gap-1"
            >
              <span>Add more items</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Price Change Notification Banner */}
          {priceNotice && priceNotice.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs sm:text-sm font-semibold">
                    Product prices in your cart have been refreshed to the latest catalog prices.
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {priceNotice.map(p => `${p.name}: ₹${Number(p.oldPrice).toLocaleString('en-IN')} → ₹${Number(p.newPrice).toLocaleString('en-IN')}`).join(', ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceNotice(null)}
                className="text-amber-500 hover:text-amber-700 text-xs font-bold p-1 cursor-pointer"
                aria-label="Dismiss price notice"
              >
                ✕
              </button>
            </div>
          )}

          {/* Cart Item Cards List */}
          <div className="bg-white rounded-xl border border-gray-200/80 divide-y divide-gray-100 shadow-2xs overflow-hidden">
            {cartData.items.map((item) => {
              const uniqueKey = item.id || item.cart_item_id || getItemId(item);
              return (
                <CartItemRow
                  key={uniqueKey}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onMoveToWishlist={moveToWishlist}
                  onRemoveItem={confirmRemoveItem}
                  onProceedToCheckout={proceedToCheckout}
                  isItemUpdating={updatingQuantityId === uniqueKey || updatingQuantityId === getItemId(item)}
                />
              );
            })}
          </div>

          {/* Active Offers & Coupons Banner (Hidden/Commented Out) */}
          {/*
          {couponFeatureEnabled && validActiveOfferCodes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#d72828]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                Available Offers & Coupons
              </h3>
              <div className="flex flex-wrap gap-2">
                {validActiveOfferCodes.map((off) => (
                  <button
                    key={off.code}
                    onClick={() => handleCopyCoupon(off.code)}
                    className="inline-flex items-center gap-1.5 bg-red-50/70 border border-red-200 hover:bg-red-100/60 text-[#d72828] text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <span>{off.code}</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      {off.percentage > 0 ? `(${off.percentage}% OFF)` : off.fixed_price > 0 ? `(₹${off.fixed_price} OFF)` : ''}
                    </span>
                    {copiedCode === off.code ? <span className="text-emerald-600">✓</span> : <span className="text-xs text-red-400">📋</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          */}
        </div>

        {/* RIGHT COLUMN: Price Details Card */}
        <div className="flex flex-col gap-4 sticky top-4">
          {/* Coupon Input Box (Hidden/Commented Out) */}
          {/*
          {couponFeatureEnabled && (
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                Apply Promo Code
              </h3>
              <div className="flex gap-2">
                <input
                  id="coupon_input"
                  type="text"
                  placeholder="Enter Coupon Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-50 border border-gray-300/80 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-900 focus:outline-none focus:border-[#d72828]"
                />
                {appliedCoupon ? (
                  <button
                    onClick={removeCoupon}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={validateCoupon}
                    disabled={isValidatingCoupon}
                    className="bg-[#d72828] hover:bg-[#b91c1c] text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isValidatingCoupon ? 'Validating...' : 'Apply'}
                  </button>
                )}
              </div>
              {couponError && <p className="text-red-600 text-xs font-medium mt-2">{couponError}</p>}
              {couponSuccess && <p className="text-emerald-600 text-xs font-medium mt-2">{couponSuccess}</p>}
            </div>
          )}
          */}

          {/* Price Details Card */}
          <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs">
            <h2 className="text-gray-500 font-bold text-xs sm:text-sm border-b border-gray-200/80 pb-3.5 uppercase tracking-wider">
              Order Price Details
            </h2>

            <div className="flex flex-col gap-3.5 py-4 text-xs sm:text-sm text-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total MRP (incl. of all taxes)</span>
                <span className="font-semibold text-gray-900">
                  ₹{Number(calculateTotalMRP()).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery Charges</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">FREE</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bag Savings & Discounts</span>
                <span className="font-semibold text-emerald-600">
                  -₹{Number(calculateTotalDiscounts()).toLocaleString("en-IN")}
                </span>
              </div>

              {calculateTotalWarranty() > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-medium">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                    </svg>
                    Extended Warranty Protection
                  </span>
                  <span className="font-semibold text-gray-900">
                    +₹{Number(calculateTotalWarranty()).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {calculateTotalExchange() > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Exchange Value</span>
                  <span className="font-semibold text-emerald-600">
                    −₹{Number(calculateTotalExchange()).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-gray-200 pt-3.5 flex justify-between items-center text-base font-extrabold text-gray-900">
                <span>Total Amount Payable</span>
                <span className="text-lg font-black text-[#d72828]">₹{Number(calculateFinalTotal()).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Green Savings Callout Banner */}
            {calculateTotalDiscounts() > 0 && (
              <div className="bg-emerald-50 text-emerald-800 font-semibold text-xs sm:text-sm p-3 rounded-lg border border-emerald-200/80 text-center mb-4 flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>You will save ₹{Number(calculateTotalDiscounts()).toLocaleString("en-IN")} on this order</span>
              </div>
            )}

            {/* Sticky/Prominent Place Order CTA Button */}
            <button
              onClick={proceedToCheckout}
              className="w-full bg-[#d72828] hover:bg-[#b91c1c] text-white font-extrabold py-3.5 rounded-lg uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 text-sm text-center block cursor-pointer active:scale-[0.99]"
            >
              Proceed to Checkout →
            </button>

            {/* Security Guarantee */}
            <div className="border-t border-gray-100 pt-4 mt-4 flex items-center gap-3 text-gray-500 text-xs leading-tight">
              <MdSecurity className="text-3xl text-gray-400 flex-shrink-0" />
              <span>Safe and 100% secure payments. Guaranteed authentic products & easy returns.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Your Purchase */}
      <CompleteYourPurchase
        products={completeYourPurchase}
        scrollRef={completeScrollRef}
        updateCartCount={updateCartCount}
        isLoading={addonsLoading}
        onAddSuccess={() => window.location.reload()}
      />
    </div>
  </div>
);
}
