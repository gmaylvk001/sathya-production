"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";
import { useCart } from "@/context/CartContext";
import { useModal } from "@/context/ModalContext";
import { useHeaderdetails } from "@/context/HeaderContext";
import { trackAddToCart, ga4AddToCart } from "@/utils/nextjs-event-tracking";
import ProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";

function formatPrice(n) {
  return new Intl.NumberFormat("en-IN").format(n);
}

async function parseJsonSafely(res) {
  if (!res || !res.ok) return null;
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function addProductToCart({
  productId,
  quantity = 1,
  updateCartCount,
  apiUrl,
}) {
  const token = localStorage.getItem("token");
  let isLoggedIn = false;
  let userData = null;
  let guestCartId = null;

  if (token) {
    const authRes = await fetch("/api/auth/check", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const authData = (await parseJsonSafely(authRes)) || {};
    isLoggedIn = authData.loggedIn;
    userData = authData.user;
  }

  if (!isLoggedIn) {
    guestCartId = localStorage.getItem("guestCartId") || uuidv4();
    localStorage.setItem("guestCartId", guestCartId);
  }

  const proRes = await fetch(`/api/product/get/${productId}`);
  if (!proRes.ok) throw new Error(`Product fetch failed: ${proRes.status}`);
  const productData = (await parseJsonSafely(proRes)) || {};
  const original_prod_quantity = productData?.data?.quantity || 1;

  const cartRes = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isLoggedIn && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      productId,
      original_prod_quantity,
      quantity,
      ...(guestCartId && { guestCartId }),
    }),
  });

  if (cartRes.status === 409) {
    toast.error("Stock limit exceeded!");
    return null;
  }
  if (!cartRes.ok) throw new Error("Failed to add to cart");

  const responseData = await cartRes.json();
  updateCartCount(responseData?.cart?.totalItems != null ? responseData.cart.totalItems : 1);

  const resolvedName = productData?.data?.name || responseData?.cart?.items?.[0]?.name || "Product";
  const resolvedPrice =
    productData?.data?.special_price > 0
      ? productData?.data?.special_price
      : productData?.data?.price || responseData?.cart?.items?.[0]?.price || 0;
  const resolvedSlug = productData?.data?.slug || productId;
  const resolvedQty = quantity || responseData?.cart?.items?.[0]?.quantity || 1;
  const resolvedImage = responseData?.cart?.items?.[0]?.image
    ? `${apiUrl || ""}/uploads/products/${responseData.cart.items[0].image}`
    : `${apiUrl || ""}/uploads/sathya-header-logo.webp`;

  try {
    ga4AddToCart({
      product: {
        id: productId,
        name: resolvedName,
        price: resolvedPrice,
        qty: resolvedQty,
      },
    });
  } catch (err) {
    console.warn("GA4 tracking error:", err);
  }

  if (isLoggedIn && (userData || typeof window !== "undefined")) {
    try {
      const currentStoredUser =
        userData ||
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("userData") || localStorage.getItem("user") || "null")
          : null);

      trackAddToCart({
        user: {
          name: currentStoredUser?.name,
          mobile: currentStoredUser?.mobile || currentStoredUser?.phone,
          email: currentStoredUser?.email,
        },
        product: {
          id: productId,
          link: `${apiUrl || ""}/product/${resolvedSlug}`,
          name: responseData?.cart?.items?.[0]?.name || resolvedName,
          price: responseData?.cart?.items?.[0]?.price != null ? responseData.cart.items[0].price : resolvedPrice,
          image: resolvedImage,
          qty: resolvedQty,
          currency: "INR",
        },
      });
    } catch (err) {
      console.warn("trackAddToCart error:", err);
    }
  }

  return responseData;
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function WishlistBanner() {
  return (
    <div className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8 mb-6">
      <div
        className="relative bg-white rounded-2xl shadow-xs overflow-hidden border border-gray-100/90"
        style={{ minHeight: "clamp(100px, 20vw, 290px)" }}
      >
        <Image
          src="/wishlist/wishlistBanner1.png"
          alt="wishlist banner"
          fill
          style={{ objectFit: "cover", objectPosition: "right center" }}
          priority
        />
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function WishlistToolbar({ selectedIds, onClear, onMoveToCart }) {
  const someSelected = selectedIds.length > 0;
  if (!someSelected) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3.5 bg-white rounded-2xl p-4 shadow-xs border border-gray-100/90 mb-6 transition-all">
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 w-full sm:w-auto">
        <button
          onClick={onClear}
          className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:text-[#d72828] hover:bg-red-50/60 hover:border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Clear Selected
        </button>
        <button
          onClick={onMoveToCart}
          className="flex items-center justify-center gap-2 bg-[#d72828] hover:bg-[#c02020] text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
          </svg>
          Move Selected to Cart
        </button>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function WishlistProductCard({
  item,
  selected,
  onSelect,
  onRemove,
  onAddToCart,
  brandMap,
}) {
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const brandData = brandMap?.[item.brand] || null;
  const brandName = brandData?.brand_name || item.brand || "";

  const handleCartClick = async () => {
    if (item.stockStatus !== "In Stock") return;
    setAddingToCart(true);
    try {
      await onAddToCart(item);
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 2500);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border p-4 sm:p-5 mb-3.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 relative group ${
        selected
          ? "border-[#d72828] bg-red-50/20 shadow-xs"
          : "border-gray-200/80 hover:border-gray-300 shadow-2xs hover:shadow-xs"
      }`}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Checkbox */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(item.id, e.target.checked)}
            className="w-4 h-4 sm:w-5 sm:h-5 accent-[#d72828] cursor-pointer rounded border-gray-300"
          />
        </div>

        {/* Product Image Box */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-gray-200/80 p-2 flex items-center justify-center flex-shrink-0 bg-white overflow-hidden group-hover:border-red-200 transition-colors">
          <Link
            href={`/product/${item.slug}`}
            className="w-full h-full relative block"
          >
            {item.image && item.image.startsWith("/") ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                style={{ objectFit: "contain" }}
                sizes="112px"
                className="p-1 transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Middle Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <Link href={`/product/${item.slug}`}>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base hover:text-[#d72828] transition-colors line-clamp-2 leading-snug">
            {item.name}
          </h3>
        </Link>

        {brandName && (
          <p className="text-xs text-gray-500 font-medium">
            Brand: {brandName}
          </p>
        )}

        {/* Stock Status */}
        <div className="text-xs font-semibold mt-0.5 flex items-center gap-1.5">
          {item.stockStatus === "In Stock" ? (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              In Stock
            </span>
          ) : (
            <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">Out of Stock</span>
          )}
        </div>

        {/* Price Row */}
        <div className="flex items-baseline gap-2.5 flex-wrap mt-1">
          <span className="text-base sm:text-lg font-black text-gray-900">
            ₹ {formatPrice(item.price)}
          </span>
          {item.original_price > item.price && (
            <s className="text-xs sm:text-sm text-gray-400 font-normal">
              ₹ {formatPrice(item.original_price)}
            </s>
          )}
          {item.savings_amount > 0 && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              Save ₹ {formatPrice(item.savings_amount)}
            </span>
          )}
        </div>
      </div>

      {/* Right Side Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto self-end sm:self-center mt-2 sm:mt-0">
        {/* Add to Cart Button */}
        <button
          onClick={handleCartClick}
          disabled={addingToCart || item.stockStatus !== "In Stock"}
          title={cartAdded ? "Added to Cart" : "Add to Cart"}
          className={`h-9 px-4 sm:h-10 flex items-center justify-center gap-2 rounded-lg border font-bold text-xs sm:text-sm transition-all duration-200 shadow-2xs ${
            item.stockStatus !== "In Stock"
              ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              : cartAdded
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-[#d72828] bg-white text-[#d72828] hover:bg-[#d72828] hover:text-white cursor-pointer"
          }`}
        >
          {addingToCart ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : cartAdded ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Added</span>
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
              </svg>
              <span>Add to Cart</span>
            </>
          )}
        </button>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.id)}
          title="Remove from Wishlist"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-[#d72828] hover:border-red-200 transition-all duration-200 shadow-2xs cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Recommended For You ──────────────────────────────────────────────────────
function YouMayLike({ relatedProducts = [], loading = false, brandMap = {} }) {
  const scrollRef = useRef(null);
  const router = useRouter();
  const [fallbackProducts, setFallbackProducts] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // If parent finished loading and relatedProducts is empty, fetch fallback recommendations
  useEffect(() => {
    if (!loading && (!relatedProducts || relatedProducts.length === 0)) {
      let cancelled = false;
      setFallbackLoading(true);
      fetch("/api/product/featured?limit=10")
        .then(parseJsonSafely)
        .then((data) => {
          if (cancelled || !data) return;
          const prods =
            data?.products ||
            data?.data ||
            (Array.isArray(data) ? data : []);
          setFallbackProducts(prods);
        })
        .catch((err) => {
          console.error("Fallback recommendations error:", err);
        })
        .finally(() => {
          if (!cancelled) setFallbackLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [loading, relatedProducts]);

  const displayProducts =
    relatedProducts && relatedProducts.length > 0
      ? relatedProducts
      : fallbackProducts;

  const isActuallyLoading =
    loading || (displayProducts.length === 0 && fallbackLoading);

  const scrollByAmount = (dir) => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth || 300;
    scrollRef.current.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  const handleProductClick = (product) => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
      const updated = [
        product,
        ...stored.filter((p) => p._id !== product._id),
      ].slice(0, 10);
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    router.push(`/product/${product.slug || product._id}`);
  };

  // If not loading and no products to display at all, gracefully return null rather than staying in infinite skeleton
  if (!isActuallyLoading && displayProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-gray-900 font-semibold text-lg sm:text-xl">
          Recommended For You
        </h2>

        {/* Carousel Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollByAmount(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-[#d72828] hover:border-[#d72828] hover:text-white transition-all duration-200 shadow-2xs active:scale-95 text-gray-600 cursor-pointer"
            aria-label="Previous products"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => scrollByAmount(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-[#d72828] hover:border-[#d72828] hover:text-white transition-all duration-200 shadow-2xs active:scale-95 text-gray-600 cursor-pointer"
            aria-label="Next products"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Skeleton / Scrollable Row */}
      {isActuallyLoading ? (
        <div
          className="recommended-scrollbar flex w-full min-w-0 max-w-full flex-nowrap gap-2 sm:gap-4 overflow-x-auto pb-4 overscroll-x-contain touch-manipulation"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] shrink-0 min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none bg-white rounded-2xl border border-gray-100 p-2 sm:p-4 flex flex-col h-[340px] sm:h-[380px] animate-pulse shadow-2xs"
            >
              <div className="w-full h-[180px] sm:h-[200px] bg-gray-100/80 rounded-xl mb-4" />
              <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-4" />
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-9 bg-gray-100 rounded-full mt-auto w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="recommended-scrollbar flex w-full min-w-0 max-w-full flex-nowrap gap-2 sm:gap-4 overflow-x-auto pb-4 overscroll-x-contain touch-manipulation"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          {displayProducts.map((product) => (
            <div
              key={product._id}
              className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] shrink-0 min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
            >
              <ProductCard
                product={normalizeProduct(product, brandMap)}
                onProductClick={handleProductClick}
                compactMobile={true}
                checkMovement={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────
function RecentlyViewed({ brandMap = {} }) {
  const [recentProducts, setRecentProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchRecent = async () => {
      setIsLoading(true);
      const storedString = localStorage.getItem("recentlyViewed");
      let stored = [];
      try {
        stored = JSON.parse(storedString) || [];
      } catch {
        stored = [];
      }
      if (!Array.isArray(stored)) stored = [];
      stored = stored.filter((p) => p && p.quantity > 0);
      if (stored.length === 0) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/brand");
        const result = (await parseJsonSafely(response)) || {};
        const bMap = { ...brandMap };
        (result.data || []).forEach((b) => {
          bMap[b._id] = b.brand_name;
        });
        setRecentProducts(
          stored
            .map((p) => ({ ...p, brand: bMap[p.brand] || p.brand }))
            .slice(0, 10),
        );
      } catch {
        setRecentProducts(stored.slice(0, 10));
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, [brandMap]);

  const scrollByAmount = (dir) => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth || 300;
    scrollRef.current.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  const handleClick = (product) => {
    if (navigating) return;
    setNavigating(true);
    const stored = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
    const updated = stored.filter((p) => p._id !== product._id);
    updated.unshift(product);
    localStorage.setItem(
      "recentlyViewed",
      JSON.stringify(updated.slice(0, 10)),
    );
    router.push(`/product/${product.slug || product._id}`);
  };

  if (isLoading) {
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <h2 className="text-gray-900 font-semibold text-lg sm:text-xl mb-4">
          Recently Viewed
        </h2>
        <div
          className="recommended-scrollbar flex w-full min-w-0 max-w-full flex-nowrap gap-2 sm:gap-4 overflow-x-auto pb-4 overscroll-x-contain touch-manipulation"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] shrink-0 min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none bg-white rounded-2xl border border-gray-100 p-2 sm:p-4 flex flex-col h-[340px] sm:h-[380px] animate-pulse shadow-2xs"
            >
              <div className="w-full h-[180px] sm:h-[200px] bg-gray-100/80 rounded-xl mb-4" />
              <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-4" />
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-9 bg-gray-100 rounded-full mt-auto w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentProducts.length === 0) return null;

  return (
    <>
      {navigating && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-black/30 backdrop-blur-xs">
          <div className="animate-spin rounded-full h-9 w-9 border-3 border-white border-t-[#d72828] shadow-md" />
        </div>
      )}
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-gray-900 font-semibold text-lg sm:text-xl">
            Recently Viewed
          </h2>

          {/* Carousel Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollByAmount(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-[#d72828] hover:border-[#d72828] hover:text-white transition-all duration-200 shadow-2xs active:scale-95 text-gray-600 cursor-pointer"
              aria-label="Previous products"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => scrollByAmount(1)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-[#d72828] hover:border-[#d72828] hover:text-white transition-all duration-200 shadow-2xs active:scale-95 text-gray-600 cursor-pointer"
              aria-label="Next products"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Row */}
        <div
          ref={scrollRef}
          className="recommended-scrollbar flex w-full min-w-0 max-w-full flex-nowrap gap-2 sm:gap-4 overflow-x-auto pb-4 overscroll-x-contain touch-manipulation"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          {recentProducts.map((product) => (
            <div
              key={product._id}
              className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] shrink-0 min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
            >
              <ProductCard
                product={normalizeProduct(product, brandMap)}
                onProductClick={handleClick}
                compactMobile={true}
                checkMovement={false}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Empty / Login / Loading states ──────────────────────────────────────────
function EmptyWishlist() {
  return (
    <div className="w-full max-w-2xl mx-auto my-8 sm:my-12 p-8 sm:p-12 lg:p-14 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-50/60 via-white to-white rounded-[28px] border border-gray-100 shadow-2xs flex flex-col items-center justify-center text-center">
      {/* Modern Circular Container with Subtle Glow & Float Animation */}
      <div className="relative mb-6 group">
        <div className="absolute inset-0 rounded-full bg-red-400/20 blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-50 to-red-100/60 border border-red-100 shadow-inner transform transition-transform duration-500 group-hover:scale-105 animate-[bounce_3s_infinite]">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-[#d72828] drop-shadow-xs"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <span className="text-xs font-extrabold text-[#d72828] uppercase tracking-widest mb-2 block">
        YOUR WISHLIST IS EMPTY
      </span>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
        Your Wishlist is Waiting
      </h2>

      <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-md mb-8">
        Save the products you love and track their prices so you can shop
        whenever you&apos;re ready.
      </p>

      {/* Sleek Button */}
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#d72828] to-[#ea3838] hover:from-[#c02020] hover:to-[#d72828] text-white text-sm sm:text-base font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
      >
        <span>Explore Products</span>
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
      </Link>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-xs my-6">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-4xl mb-5 text-[#d72828] shadow-inner">
        🔐
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Login to view your Wishlist
      </h2>
      <p className="text-gray-500 text-sm mb-8 leading-relaxed">
        Sign in to access your saved products across all your devices.
      </p>
      <Link
        href="/login"
        className="bg-[#d72828] hover:bg-[#c02020] text-white rounded-xl px-8 py-3 text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      >
        Login / Sign Up
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] gap-4">
      <div className="w-12 h-12 border-4 border-red-100 border-t-[#d72828] rounded-full animate-spin" />
      <p className="text-sm font-medium text-gray-500">
        Loading your wishlist...
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_OUTER_CLASS =
  "w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8 py-6 pb-20";
const PAGE_CONTENT_CLASS = "max-w-7xl mx-auto px-4 md:px-6 lg:px-8";

function WishlistPageShell({ children }) {
  return (
    <div className="bg-gray-50/40 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="bg-gradient-to-r from-red-50/70 via-red-50/40 to-gray-50/20 border-b border-red-100/50 py-3.5 px-4 md:px-8 lg:px-10">
        <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 max-w-7xl mx-auto font-medium">
          <Link
            href="/"
            className="text-gray-600 hover:text-[#d72828] transition-colors"
          >
            Home
          </Link>
          <span className="text-gray-400">›</span>
          <span className="text-[#d72828] font-bold">Wishlist</span>
        </nav>
      </div>
      <section className={PAGE_OUTER_CLASS}>
        <div className={PAGE_CONTENT_CLASS}>{children}</div>
      </section>
    </div>
  );
}

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [brandMap, setBrandMap] = useState({});
  const { updateCartCount } = useCart();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);
    try {
      const res = await fetch("/api/wishlist/get", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await parseJsonSafely(res)) || {};
      setItems(data.items || []);
      setRelatedProducts(data.relatedProducts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    fetch("/api/brand/get")
      .then(parseJsonSafely)
      .then((result) => {
        if (!result) return;
        const map = {};
        (result.brands || []).forEach((b) => {
          map[b.id] = b;
        });
        setBrandMap(map);
      })
      .catch(console.error);
  }, []);

  const handleSelectItem = (id, checked) =>
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );

  const handleRemove = async (wishlistEntryId) => {
    const token = localStorage.getItem("token");
    const item = items.find((i) => i.id === wishlistEntryId);
    if (!item) return;
    try {
      const res = await fetch(`/api/wishlist/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: item.productId }),
      });
      if (!res.ok) {
        const data = (await parseJsonSafely(res)) || {};
        toast.error(data?.message || "Failed to remove item");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== wishlistEntryId));
      setSelectedIds((prev) => prev.filter((x) => x !== wishlistEntryId));
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove item");
    }
  };

  const handleClear = async () => {
    const token = localStorage.getItem("token");
    try {
      const selectedItems = items.filter((i) => selectedIds.includes(i.id));
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`/api/wishlist/delete`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId: item.productId }),
          }),
        ),
      );
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      toast.success("Wishlist cleared");
    } catch (e) {
      console.error(e);
      toast.error("Failed to clear wishlist");
    }
  };

  const handleAddToCart = async (item) => {
    await addProductToCart({
      productId: item.productId,
      quantity: 1,
      updateCartCount,
      apiUrl,
    });
    toast.success("Product added!");
  };

  const handleMoveToCart = async () => {
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    try {
      await Promise.all(selectedItems.map((item) => handleAddToCart(item)));
      const token = localStorage.getItem("token");
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`/api/wishlist/delete`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId: item.productId }),
          }),
        ),
      );
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      router.push("/cart");
    } catch (e) {
      console.error(e);
      toast.error("Failed to move items to cart");
    }
  };

  if (loading) {
    return (
      <WishlistPageShell>
        <LoadingState />
      </WishlistPageShell>
    );
  }
  if (!isLoggedIn) {
    return (
      <WishlistPageShell>
        <LoginPrompt />
      </WishlistPageShell>
    );
  }

  return (
    <WishlistPageShell>

      <WishlistBanner />

      {items.length === 0 ? (
        <EmptyWishlist />
      ) : (
        <>
          <WishlistToolbar
            selectedIds={selectedIds}
            onClear={handleClear}
            onMoveToCart={handleMoveToCart}
          />
          {/* Wishlist Items List */}
          <div className="flex flex-col mb-8">
            {items.map((item) => (
              <WishlistProductCard
                key={item.id}
                item={item}
                brandMap={brandMap}
                selected={selectedIds.includes(item.id)}
                onSelect={handleSelectItem}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </>
      )}
      {/* Recommended For You & Recently Viewed Sections (Stacked Vertically, Full Width) */}
      <section className="mt-14 pt-8 border-t border-gray-100 flex flex-col gap-10 w-full max-w-full">
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <YouMayLike
            relatedProducts={relatedProducts}
            loading={loading}
            brandMap={brandMap}
          />
        </div>

        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <RecentlyViewed brandMap={brandMap} />
        </div>
      </section>
    </WishlistPageShell>
  );
}
