"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Addtocart from "@/components/AddToCart";
import AddToWishlistButton from "@/components/ProductCard";
import { useRegion } from "@/context/RegionContext";
import { useHeaderdetails } from "@/context/HeaderContext";
import DealsOfferModal from "@/components/deals-offer/DealsOfferModal";
import CategoryProductSlider from "@/components/deals-offer/CategoryProductSlider";
import { getCardOfferCategoryHref, isExternalUrl } from "@/lib/cardOffers/cardOfferNavigationHelper";
import { getDiscountInfo } from "@/lib/discountHelper";

// Helper to determine destination URL for any card offer
export function getCardOfferHref(card) {
  return getCardOfferCategoryHref(card);
}

// Map subcategory slug / ID to broad category section order
const SECTION_ORDER = [
  {
    title: "TV & ACCESSORIES",
    slugs: ["television", "soundbar", "speakers", "qled", "full-hd"],
    viewAllHref: "/category/televisions",
  },
  {
    title: "APPLIANCES",
    slugs: [
      "air-cooler",
      "washing-machine",
      "refrigerator",
      "air-conditioner",
      "air-conditioner-large",
      "refrigerators",
      "single-door",
      "double-door",
      "triple-door",
      "side-by-side",
      "deep-freezer",
      "mini-fridge",
      "dishwasher",
    ],
    viewAllHref: "/category/large-appliances",
  },
  {
    title: "MOBILES & WEARABLES",
    slugs: ["mobile-phones", "mobiles-accessories", "wearables", "smart-watches", "gadgets"],
    viewAllHref: "/category/mobiles-accessories",
  },
  {
    title: "KITCHEN APPLIANCES",
    slugs: [
      "kitchen-appliances",
      "mixer-grinder",
      "induction-stove",
      "gas-stove",
      "wet-grinder",
      "water-purifier",
      "air-fryer",
      "microwave-oven",
      "electric-cooker",
      "cooktop",
      "kettle",
    ],
    viewAllHref: "/category/kitchen-appliances",
  },
  {
    title: "UTILITY APPLIANCES",
    slugs: ["fan", "tower-fan", "water-heater", "iron", "vacuum-cleaner", "stabilizer", "inverter", "air-purifier"],
    viewAllHref: "/category/small-appliances",
  },
];

// Helper to determine if an offer timer is active for the specified region
function isTimerActiveForRegion(timer, currentRegion) {
  // 1. Check if status is active
  const isDisplay =
    (timer.timerDisplayStatus ? timer.timerDisplayStatus === "Yes" : true) &&
    (timer.status ? timer.status === "active" : true);
  if (!isDisplay) return false;

  // 2. Check dates if set (allow upcoming offers for tomorrow/future)
  const now = Date.now();
  const end = timer.endDate || timer.offer_end;
  if (end && new Date(end).getTime() <= now) return false;

  if (!currentRegion) return true;

  const regNorm = currentRegion.toLowerCase().replace(/[^a-z0-9]/g, "");

  const stateAliases = {
    kerala: ["kerala", "kl"],
    tamilnadu: ["tamilnadu", "tamil nadu", "tn"],
    karnataka: ["karnataka", "ka"],
    andhra: ["andhra", "andhra pradesh", "ap"],
    telangana: ["telangana", "ts", "tg"],
  };

  const currentAliases = stateAliases[regNorm] || [regNorm];

  // 3. Match 'all'
  if (
    timer.state === "all" ||
    (Array.isArray(timer.offerViewStates) &&
      timer.offerViewStates.some((s) => s.toLowerCase() === "all")) ||
    (Array.isArray(timer.states) &&
      timer.states.some((s) => s.toLowerCase() === "all"))
  ) {
    return true;
  }

  // 4. Match state lists
  const timerStates = [
    ...(Array.isArray(timer.offerViewStates) ? timer.offerViewStates : []),
    ...(Array.isArray(timer.states) ? timer.states : []),
    ...(typeof timer.state === "string" ? [timer.state] : []),
  ].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));

  return currentAliases.some((alias) =>
    timerStates.some((ts) => ts === alias.replace(/[^a-z0-9]/g, ""))
  );
}

// Card Offer Banner Component (matches user's reference image with red bottom bar)
function AdminCardOfferItem({ card }) {
  const initialImg = card.image
    ? card.image.startsWith("/") || card.image.startsWith("http")
      ? card.image
      : `/uploads/cardoffers/${card.image}`
    : "/uploads/sathya-header-logo.webp";

  const [imgSrc, setImgSrc] = useState(initialImg);

  useEffect(() => {
    setImgSrc(initialImg);
  }, [initialImg]);

  const targetHref = getCardOfferHref(card);
  const isExternal = isExternalUrl(targetHref);

  return (
    <Link
      href={targetHref}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex flex-col h-full bg-white border border-gray-200/90 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden rounded-sm"
    >
      {/* Banner Image Container (square, scales with card width) */}
      <div className="relative w-full aspect-square bg-white overflow-hidden">
        <Image
          src={imgSrc}
          alt={card.title || "Offer Banner"}
          fill
          className="object-contain p-2 sm:p-3 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 1024px) 50vw, 25vw"
          onError={() => setImgSrc("/uploads/sathya-header-logo.webp")}
          unoptimized
        />
      </div>

      {/* Red Title Bottom Bar */}
      <div
        className="mt-auto bg-[#d72828] group-hover:bg-red-700 text-white font-bold text-[10px] sm:text-xs lg:text-sm py-2 sm:py-2.5 px-2.5 sm:px-4 uppercase tracking-wide sm:tracking-wider transition-colors text-left truncate"
        title={card.title}
      >
        {card.title}
      </div>
    </Link>
  );
}

// Product Card Component with fallback image handling
function DealProductCard({ product, brandMap }) {
  const price = Number(product.price) || 0;
  const specialPrice = Number(product.special_price) || 0;
  const { discountPercent: discountPct, showDiscount } = getDiscountInfo(price, specialPrice);
  const displayPrice = showDiscount ? specialPrice : (specialPrice > 0 ? specialPrice : price);

  const initialImg = product.images?.[0]
    ? product.images[0].startsWith("http")
      ? product.images[0]
      : `/uploads/products/${product.images[0]}`
    : "/uploads/sathya-header-logo.webp";

  const [imgSrc, setImgSrc] = useState(initialImg);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl hover:border-red-200 transition-all duration-300 flex flex-col p-3 sm:p-4 w-[240px] sm:w-[260px] md:w-[270px] flex-none relative group">
      {/* Discount Badge */}
      {showDiscount && (
        <div className="absolute top-3 left-3 z-10 bg-[#d72828] text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded shadow-sm">
          {discountPct}% OFF
        </div>
      )}

      {/* Wishlist Button */}
      <div className="absolute top-3 right-3 z-10">
        <AddToWishlistButton productId={product._id} />
      </div>

      {/* Product Image */}
      <Link
        href={`/product/${product.slug}`}
        className="block relative w-full h-44 sm:h-48 overflow-hidden rounded-lg my-2 flex items-center justify-center bg-white"
      >
        <Image
          src={imgSrc}
          alt={product.name || "Deal Product"}
          fill
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 240px, 270px"
          onError={() => setImgSrc("/uploads/sathya-header-logo.webp")}
          unoptimized
        />
      </Link>

      {/* Brand Label */}
      {brandMap[product.brand] && (
        <div className="text-[10px] sm:text-xs uppercase font-semibold text-gray-400 mb-1 tracking-wider">
          {brandMap[product.brand]}
        </div>
      )}

      {/* Product Title */}
      <Link
        href={`/product/${product.slug}`}
        className="block mb-2 group-hover:text-[#d72828] transition-colors"
      >
        <h3
          className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 min-h-[36px] leading-tight"
          title={product.name}
        >
          {product.name}
        </h3>
      </Link>

      {/* Pricing */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-base sm:text-lg font-extrabold text-gray-900">
          ₹{Math.round(displayPrice).toLocaleString("en-IN")}
        </span>
        {showDiscount && (
          <span className="text-xs text-gray-400 line-through">
            ₹{Math.round(price).toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {/* Stock Status */}
      <div className="text-[11px] font-medium mb-3">
        {product.stock_status === "In Stock" ||
        (product.quantity && product.quantity > 0) ? (
          <span className="text-green-600 font-semibold">In Stock</span>
        ) : (
          <span className="text-red-500 font-semibold">Out of Stock</span>
        )}
      </div>

      {/* Add to Cart Button */}
      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center">
        <Addtocart
          productId={product._id}
          stockQuantity={product.quantity || 1}
          special_price={product.special_price}
          movement={product.movement}
          productName={product.name}
          productSlug={product.slug}
          className="w-full text-xs sm:text-sm py-2 rounded-lg"
        />
      </div>
    </div>
  );
}

export default function DealsOfferPage() {
  const { region, selectedRegion } = useRegion();
  const { setActiveOfferTimer, setActiveTopBanner } = useHeaderdetails();
  const [activeOfferTimers, setActiveOfferTimers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brandMap, setBrandMap] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(true);
  const scrollRefs = useRef({});

  useEffect(() => {
    document.title = "Deals & Offers | Sathya Store";
  }, []);

  // Listen for modal open triggers from URL query or header timer clicks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openModal") === "true") {
        setIsModalOpen(true);
      }

      const handleOpenEvent = () => setIsModalOpen(true);
      window.addEventListener("openDealsModal", handleOpenEvent);
      return () => window.removeEventListener("openDealsModal", handleOpenEvent);
    }
  }, []);

  // Fetch admin offers, timers, and category products
  useEffect(() => {
    let isMounted = true;

    async function loadDealsData() {
      try {
        setLoading(true);
        setError(null);

        const activeReg = region || selectedRegion?.id || "kerala";

        // Fetch offer timers, deals category products, settings, and brands in parallel
        const [timersRes, dealsCatRes, settingsRes, brandRes] = await Promise.allSettled([
          fetch("/api/offer-timer"),
          fetch("/api/deals-offer/category-products"),
          fetch("/api/categoryproduct/settings"),
          fetch("/api/brand"),
        ]);

        // Process ALL Offer Timers active for current region
        if (timersRes.status === "fulfilled" && timersRes.value.ok) {
          const tData = await timersRes.value.json();
          const timers = tData?.data || [];

          if (timers.length > 0) {
            // Find ALL active timers matching current state/region
            const matchedTimers = timers.filter((t) =>
              isTimerActiveForRegion(t, activeReg)
            );

            // Sort by live offers first (startDate <= now), then upcoming (startDate > now), then latest
            matchedTimers.sort((a, b) => {
              const now = Date.now();
              const startA = new Date(a.startDate || a.offer_start || 0).getTime();
              const startB = new Date(b.startDate || b.offer_start || 0).getTime();
              const isLiveA = !startA || startA <= now;
              const isLiveB = !startB || startB <= now;
              if (isLiveA && !isLiveB) return -1;
              if (!isLiveA && isLiveB) return 1;

              const idA = Number(a.timerId || a.custom_id || 0);
              const idB = Number(b.timerId || b.custom_id || 0);
              if (idB !== idA) return idB - idA;

              return startB - startA;
            });

            if (isMounted) {
              setActiveOfferTimers(matchedTimers);
              if (typeof window !== "undefined") {
                window.__dealsOfferTimers = matchedTimers;
              }

              // Ensure the latest uploaded banner from top active offer shows as header background
              const latestTimer = matchedTimers[0] || null;
              if (latestTimer) {
                const latestBanner =
                  latestTimer.topBanner || latestTimer.top_banner_url || null;
                const bannerUrl = latestBanner
                  ? latestBanner.startsWith("/")
                    ? latestBanner
                    : `/uploads/topbanner/${latestBanner}`
                  : null;

                if (setActiveTopBanner && bannerUrl) {
                  setActiveTopBanner(bannerUrl);
                }
                if (setActiveOfferTimer) {
                  setActiveOfferTimer(latestTimer);
                }
              }
            }
          }
        }

        // Process Brand Data
        let bMap = {};
        if (brandRes.status === "fulfilled" && brandRes.value.ok) {
          const bData = await brandRes.value.json();
          if (bData?.data && Array.isArray(bData.data)) {
            bData.data.forEach((b) => {
              if (b?._id) bMap[b._id] = b.brand_name;
            });
          }
        }
        if (isMounted) setBrandMap(bMap);

        // Process Deals Category Products Data (12 random products per category)
        let hasLoadedCategories = false;
        if (dealsCatRes.status === "fulfilled" && dealsCatRes.value.ok) {
          try {
            const catData = await dealsCatRes.value.json();
            if (catData?.success && Array.isArray(catData.sections) && catData.sections.length > 0) {
              const activeSections = catData.sections.filter(
                (s) => Array.isArray(s?.products) && s.products.length > 0
              );
              if (activeSections.length > 0) {
                if (catData.brandMap && Object.keys(catData.brandMap).length > 0) {
                  bMap = { ...bMap, ...catData.brandMap };
                  if (isMounted) setBrandMap(bMap);
                }
                if (isMounted) {
                  setSections(activeSections);
                  if (typeof window !== "undefined") {
                    window.__dealsOfferSections = activeSections;
                  }
                }
                hasLoadedCategories = true;
              }
            }
          } catch (e) {
            console.warn("Could not parse deals category products:", e);
          }
        }

        // Fallback to CategoryProduct settings if dedicated endpoint didn't provide sections
        if (!hasLoadedCategories && settingsRes.status === "fulfilled" && settingsRes.value.ok) {
          const result = await settingsRes.value.json();
          if (result?.ok && Array.isArray(result?.data)) {
            const rawSections = result.data.filter(
              (item) => item?.products && item.products.length > 0
            );

            // Group into organized sections according to SECTION_ORDER
            const organized = [];
            const processedItemIds = new Set();

            SECTION_ORDER.forEach((rule) => {
              const matchingItems = rawSections.filter((item) => {
                const sSlug =
                  item.subcategoryId?.category_slug?.toLowerCase() || "";
                return rule.slugs.includes(sSlug);
              });

              if (matchingItems.length > 0) {
                const combinedProducts = [];
                const seenProductIds = new Set();

                matchingItems.forEach((item) => {
                  processedItemIds.add(item._id);
                  (item.products || []).forEach((prod) => {
                    if (prod?._id && !seenProductIds.has(prod._id)) {
                      seenProductIds.add(prod._id);
                      combinedProducts.push(prod);
                    }
                  });
                });

                if (combinedProducts.length > 0) {
                  organized.push({
                    id: rule.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    title: rule.title,
                    viewAllHref: rule.viewAllHref,
                    products: combinedProducts,
                  });
                }
              }
            });

            // Add any remaining categories not covered by SECTION_ORDER
            rawSections.forEach((item) => {
              if (!processedItemIds.has(item._id) && item.products?.length > 0) {
                const catName =
                  item.subcategoryId?.category_name || "SPECIAL DEALS";
                const catSlug = item.subcategoryId?.category_slug || "";
                organized.push({
                  id: item._id || catSlug,
                  title: catName.toUpperCase(),
                  viewAllHref: catSlug
                    ? `/category/${catSlug}`
                    : "/category/appliances",
                  products: item.products,
                });
              }
            });

            if (isMounted) {
              setSections(organized);
              if (typeof window !== "undefined") {
                window.__dealsOfferSections = organized;
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading deals offer page:", err);
        if (isMounted) setError("Failed to load deals. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDealsData();
    return () => {
      isMounted = false;
    };
  }, [region, selectedRegion?.id]);

  const scrollContainer = (id, direction) => {
    const el = scrollRefs.current[id];
    if (el) {
      const scrollAmount = Math.max(el.clientWidth * 0.75, 280);
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-800 pb-16">
      {/* Top Breadcrumb Header Bar */}
      <div className="bg-[#fdfdfd] border-b border-gray-200/90 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-gray-900 uppercase">
            GREAT DEALS - SHOP NOW
          </h1>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider"
          >
            <Link href="/" className="hover:text-[#d72828] transition-colors">
              HOME
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800">DEALS</span>
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-12">
        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-10 py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="h-7 w-56 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded overflow-hidden bg-white animate-pulse"
                  >
                    <div className="h-52 bg-gray-100" />
                    <div className="h-10 bg-red-100" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white animate-pulse"
                  >
                    <div className="h-40 bg-gray-100 rounded-lg" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded mt-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-500 font-semibold mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#d72828] text-white font-bold rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Offer Sections: Rendered line by line, sorted latest on top */}
        {!loading &&
          !error &&
          activeOfferTimers.length === 0 && (
            <div className="w-full bg-gray-50/80 border border-gray-200/90 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center my-2">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#d72828] mx-auto mb-3 shadow-xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight mb-1">
                No Active Promotions In This Region
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                There are currently no active promotional campaigns in your selected location. Browse our wide range of category deals below!
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          activeOfferTimers.map((timer) => {
            const timerTitle =
              timer.offerTitle || timer.offer_title || "SPECIAL OFFER";
            const timerSlug = timerTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            const stateSlug = (
              region ||
              selectedRegion?.id ||
              (timer.offerViewStates && timer.offerViewStates[0]) ||
              timer.state ||
              "all"
            )
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            const timerIdVal = timer.timerId ?? timer.custom_id ?? timer._id;
            const viewAllLink = `/super-offers/${stateSlug}/${timerSlug}?offer_timer_id=${timerIdVal}`;

            const timerCards =
              Array.isArray(timer.card_offers)
                ? timer.card_offers.filter((c) => c.status !== "inactive")
                : [];

            return (
              <section key={timer._id || timer.timerId} className="relative">
                {/* Header: Offer Title + VIEW ALL (only when card offers exist) */}
                <div className="flex items-center justify-between pb-2 mb-6 border-b border-gray-300">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide text-[#d72828] uppercase">
                    {timerTitle}
                  </h2>
                  {timerCards.length > 0 && (
                    <Link
                      href={viewAllLink}
                      className="bg-[#d72828] hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm px-6 py-2 uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow"
                    >
                      VIEW ALL
                    </Link>
                  )}
                </div>

                {/* Card Offers Grid or Amazon-Style Empty State */}
                {timerCards.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    {timerCards.slice(0, 4).map((card, idx) => (
                      <AdminCardOfferItem
                        key={card.id || card._id || idx}
                        card={card}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-[232px] sm:h-[250px] md:h-[266px] bg-gray-50/70 border border-dashed border-gray-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center flex flex-col items-center justify-center my-1">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#d72828] mb-2.5 shadow-xs">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 tracking-tight mb-1">
                      No Card Offers Available
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                      There are currently no active card offers for this promotion. Check back soon for new exclusive bank discounts and category deals.
                    </p>
                  </div>
                )}
              </section>
            );
          })}

        {/* Category Product Carousels */}
        {!loading &&
          !error &&
          sections.map((section) => (
            <CategoryProductSlider
              key={section.id}
              title={section.title}
              viewAllHref={section.viewAllHref}
              products={section.products}
              brandMap={brandMap}
            />
          ))}
      </div>

      {/* Interactive Deals Offer Countdown Modal (Matches Reference Image 1) */}
      {activeOfferTimers.length > 0 && (
        <DealsOfferModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          timer={activeOfferTimers[0]}
        />
      )}
    </main>
  );
}
