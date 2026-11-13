// 'use client';
import Link from "next/link";
import Image from 'next/image';
import { FiSearch, FiUser, FiMenu, FiX, FiChevronRight, FiMapPin } from "react-icons/fi";
import { FaBars, FaShoppingBag, FaUserShield, FaSearch } from "react-icons/fa";
import {
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlinePhone,
  HiOutlineBuildingStorefront,
  HiOutlineBars3,
  HiOutlineGift,
  HiOutlineTag,
} from "react-icons/hi2";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { IoLogOut } from "react-icons/io5";
import { useCart } from '@/context/CartContext';
import { useWishlist } from "@/context/WishlistContext";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/scrollbar';
import { useRouter } from 'next/navigation';
import { Navigation, Scrollbar } from 'swiper/modules';
import { useHeaderdetails } from "@/context/HeaderContext";
import { useRegion } from "@/context/RegionContext";
import HeaderOfferTimer from "@/components/HeaderOfferTimer";
import HeaderMenuSidebar from "@/components/HeaderMenuSidebar";
import DealsPdfButton from "@/components/deals-offer/DealsPdfButton";
import { filterAndRankProducts } from '@/lib/searchMatch';
import { uniqueById } from '@/lib/uniqueById';
import { PAGE_TYPES } from '@/lib/categoryPageComponents/registry';
import { sortProductsClient } from '@/lib/productSort';
import {
  buildCategoryHref,
  buildBrandHref,
  hasOverviewAvailability as categoryHasOverviewDesign,
  pageTypeFromLevel,
} from '@/lib/categoryPageComponents/categoryHref';
import { toast } from 'react-toastify';
import {
  canLoginAs,
  establishSession,
  clearBrowserAuth,
  readStoredSession,
  AUTH_CONFLICT_MESSAGE,
} from '@/lib/clientAuthSession';

// ADD: alphaSortString - case-insensitive, null-safe string comparator
const alphaSortString = (a, b) => {
  const sa = (a ?? '').toString().trim();
  const sb = (b ?? '').toString().trim();
  if (sa === sb) return 0;
  return sa.localeCompare(sb, undefined, { sensitivity: 'base' });
};

/** Prefer admin-set position; fall back to name for equal/missing positions. */
const sortByCategoryPosition = (a, b) => {
  const pa = Number(a?.position);
  const pb = Number(b?.position);
  const na = Number.isFinite(pa) ? pa : 0;
  const nb = Number.isFinite(pb) ? pb : 0;
  if (na !== nb) return na - nb;
  return alphaSortString(a?.category_name, b?.category_name);
};

const sortNestedCategories = (nodes) => {
  if (!Array.isArray(nodes)) return [];
  return [...nodes]
    .sort(sortByCategoryPosition)
    .map((node) => ({
      ...node,
      subcategories: sortNestedCategories(node.subcategories),
    }));
};

/** Split text at nearest space before/after limit if exceeding maxChars */
const splitByNearestSpace = (text, maxChars = 24) => {
  if (!text || typeof text !== 'string') return text;
  if (text.length <= maxChars) return text;

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!currentLine) {
      currentLine = word;
    } else {
      const testLine = `${currentLine} ${word}`;
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= 1) return text;


  return (
    <>
      {lines.map((line, idx) => (
        <span key={idx} style={{ display: 'block' }}>
          {line}
        </span>
      ))}
    </>
  );
};

const HEADER_ACTION_LINK_CLASS =
  "group flex flex-col items-center gap-1 rounded-xl px-1 py-0.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95";
const HEADER_ACTION_ICON_WRAP_CLASS =
  "relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#ED1C24]/25 bg-gradient-to-b from-[#fffdf5] to-white text-[#ED1C24] shadow-[0_1px_2px_rgba(215,40,40,0.08)] transition-all duration-200 group-hover:border-[#ED1C24] group-hover:bg-[#FFF200] group-hover:text-[#C4161D] group-hover:shadow-[0_4px_10px_rgba(215,40,40,0.18)]";
const HEADER_ACTION_ICON_WRAP_SM_CLASS =
  "relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#ED1C24]/25 bg-gradient-to-b from-[#fffdf5] to-white text-[#ED1C24] shadow-[0_1px_2px_rgba(215,40,40,0.08)] transition-all duration-200 group-hover:border-[#ED1C24] group-hover:bg-[#FFF200] group-hover:text-[#C4161D]";
const HEADER_ACTION_LABEL_CLASS =
  "text-[#ED1C24] font-semibold leading-none transition-colors duration-200 group-hover:text-[#C4161D]";
const HEADER_ACTION_BADGE_CLASS =
  "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-[#ED1C24] text-[#FFF200] rounded-full flex items-center justify-center ring-2 ring-white";
const HEADER_ACTION_BADGE_SM_CLASS =
  "absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold bg-[#ED1C24] text-[#FFF200] rounded-full flex items-center justify-center ring-2 ring-white";



const Header = () => {
  const router = useRouter();
  const [category, setCategory] = useState('All Category');
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { wishlistCount } = useWishlist();
  const { cartCount, updateCartCount } = useCart();
  const { region, selectedRegion, openRegionModal, pincode, city } = useRegion();
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [overviewAvailability, setOverviewAvailability] = useState({});

  // ADD: Cross-tab cart sync helpers
  const CART_COUNT_KEY = 'cartCount';
  // ADD: new key for cart data list
  const CART_DATA_KEY = 'cartData';

  // ADD: track latest cartCount for safe comparisons in effects/handlers
  const cartCountRef = useRef(cartCount);
  useEffect(() => {
    cartCountRef.current = cartCount;
  }, [cartCount]);

  // ADD: local cartData + ref
  const [cartData, setCartData] = useState(null);
  const cartDataRef = useRef(null);
  useEffect(() => { cartDataRef.current = cartData; }, [cartData]);

  const setCartCountSynced = useCallback((count) => {
    // Update context + propagate to other tabs
    updateCartCount(count);
    try {
      localStorage.setItem(CART_COUNT_KEY, String(Number.isFinite(count) ? count : 0));
    } catch { /* ignore quota */ }
  }, [updateCartCount]);

  // ADD: helpers for cartData storage + compare
  const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const isSameCartObj = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };
  const persistCartData = (data) => {
    try {
      const nextStr = JSON.stringify(data ?? null);
      const prevStr = localStorage.getItem(CART_DATA_KEY);
      if (nextStr !== prevStr) {
        localStorage.setItem(CART_DATA_KEY, nextStr);
      }
    } catch { /* ignore */ }
  };
  const ensureGuestCartId = () => {
    try {
      let id = localStorage.getItem('guestCartId');
      if (!id) {
        id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
        localStorage.setItem('guestCartId', id);
      }
      return id;
    } catch {
      return 'guest-' + Date.now();
    }
  };


  const fetchCartLatest = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : { guestCartId: ensureGuestCartId() };

      const res = await fetch('/api/cart', { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) {
        // if token invalid, do not overwrite local cartData here
        return;
      }
      const payload = await res.json();
      const latestCart = payload?.cart || null;

      // Sync cartCount if server value differs
      if (typeof latestCart?.totalItems === 'number' && latestCart.totalItems !== (cartCountRef.current ?? 0)) {
        setCartCountSynced(latestCart.totalItems);
      }

      // Only update state if changed
      if (!isSameCartObj(latestCart, cartDataRef.current)) {
        setCartData(latestCart);
        persistCartData(latestCart);
      }
    } catch (e) {
      // ignore fetch errors
    }
  }, [setCartCountSynced]);

  // Initialize from localStorage on mount (so tabs align immediately)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_COUNT_KEY);
      if (raw != null) {
        const val = parseInt(raw, 10);
        if (!Number.isNaN(val)) {
          if (val !== (typeof cartCount === 'number' ? cartCount : 0)) {
            updateCartCount(val);
          }
        }
      }
    } catch { /* ignore */ }
    // run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ADD: init cartData from storage; if missing but count > 0 fetch latest
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_DATA_KEY);
      const cached = safeParse(raw);
      if (cached && !isSameCartObj(cached, cartDataRef.current)) {
        setCartData(cached);
      } else if (!cached && (cartCountRef.current ?? 0) > 0) {
        // no cached cart but we have items -> fetch once
        fetchCartLatest();
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever cartCount changes in this tab (existing)
  useEffect(() => {
    try {
      const next = String(Number.isFinite(cartCount) ? cartCount : 0);
      // avoid redundant writes
      if (localStorage.getItem(CART_COUNT_KEY) !== next) {
        localStorage.setItem(CART_COUNT_KEY, next);
      }
    } catch { /* ignore quota */ }
  }, [cartCount]);

  // ADD: whenever cartCount changes from 0 → >0 without cached cart, fetch once
  // (avoid hitting /api/cart on every count bump — badge only needs cartCount)
  useEffect(() => {
    if ((cartCountRef.current ?? 0) > 0 && !cartDataRef.current) {
      fetchCartLatest();
    }
  }, [cartCount, fetchCartLatest]);

  // ADD: persist cartData on change (avoid redundant writes)
  useEffect(() => {
    if (cartData !== undefined) {
      persistCartData(cartData);
    }
  }, [cartData]);

  // Listen to other tabs' updates
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_COUNT_KEY) {
        const next = parseInt(e.newValue || '0', 10);
        if (!Number.isNaN(next) && next !== cartCountRef.current) {
          updateCartCount(next);
        }
      }
      if (e.key === CART_DATA_KEY) {
        const nextCart = e.newValue ? safeParse(e.newValue) : null;
        if (!isSameCartObj(nextCart, cartDataRef.current)) {
          setCartData(nextCart);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [updateCartCount]);

  const handleCategoryClick = useCallback((categorySlug, categoryName, categoryId = null) => {
    const hasOverview = categoryId
      ? categoryHasOverviewDesign(overviewAvailability, categoryId, PAGE_TYPES.CATEGORY)
      : false;
    const path = buildCategoryHref([categorySlug], hasOverview, 0);
    setSelectedCategory(categoryName);
    setIsMobileMenuOpen(false);
    router.push(path);
  }, [router, overviewAvailability]);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const profileButtonRef = useRef(null);
  const mobileProfileButtonRef = useRef(null);
  const accountMenuRef = useRef(null);
  const accountMenuTimeoutRef = useRef(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleMenuMouseEnter = () => {
    if (accountMenuTimeoutRef.current) {
      clearTimeout(accountMenuTimeoutRef.current);
    }
    setIsAccountMenuOpen(true);
  };

  const handleMenuMouseLeave = () => {
    if (accountMenuTimeoutRef.current) {
      clearTimeout(accountMenuTimeoutRef.current);
    }
    accountMenuTimeoutRef.current = setTimeout(() => {
      setIsAccountMenuOpen(false);
    }, 150);
  };
  const [activeTab, setActiveTab] = useState('login');
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuHoverLeaveTimer = useRef(null);
  // const [userData, setUserData] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [headerOfferTimer, setHeaderOfferTimer] = useState(null);
  const [headerTopBanner, setHeaderTopBanner] = useState(null);
  const {
    userData,
    isLoggedIn,
    setIsLoggedIn,
    setUserData,
    isAdmin,
    setIsAdmin,
    activeOfferTimer,
    setActiveOfferTimer,
    activeTopBanner,
    setActiveTopBanner,
    normalTopBanner,
    setNormalTopBanner,
  } = useHeaderdetails();

  // Standard unified authentication state check for Header
  const isAuthenticated = Boolean(isLoggedIn || userData);
  const userDisplayName = (userData?.name && String(userData.name).trim())
    ? String(userData.name).trim().split(' ')[0]
    : (userData?.mobile ? String(userData.mobile).slice(-4) : (userData?.username || 'Account'));

  useEffect(() => {
    let timerExpiryTimeout = null;
    let isMounted = true;
    const abortController = new AbortController();

    const fetchBanners = async () => {
      const reg = region || selectedRegion?.id || "tamilnadu";
      let hasActiveOffer = false;
      const fetchOpts = { cache: "no-store", signal: abortController.signal };

      // 1. Fetch active offer timer for region
      try {
        const res = await fetch(
          `/api/offers/global-timer?region=${encodeURIComponent(reg)}`,
          fetchOpts
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.success && data.timer) {
            const timer = data.timer;
            const banner = data.top_banner_url || timer.top_banner_url || timer.topBanner || null;
            const endDate = timer.endDate || timer.offer_end;
            const endMs = endDate ? new Date(endDate).getTime() : 0;
            const remainingMs = endMs - Date.now();

            if (remainingMs > 0) {
              hasActiveOffer = true;
              setHeaderOfferTimer(timer);
              setHeaderTopBanner(banner);
              if (setActiveOfferTimer) setActiveOfferTimer(timer);
              if (setActiveTopBanner) setActiveTopBanner(banner);

              if (timerExpiryTimeout) clearTimeout(timerExpiryTimeout);
              // Max delay for 32-bit signed int in setTimeout is 2147483647 ms (~24.8 days).
              // Any delay > 2147483647 overflows in V8/browsers to negative and fires immediately.
              const MAX_TIMEOUT_MS = 2147483647;
              const delay = Math.min(remainingMs, MAX_TIMEOUT_MS);
              timerExpiryTimeout = setTimeout(() => {
                if (isMounted) {
                  const currentRemaining = (endDate ? new Date(endDate).getTime() : 0) - Date.now();
                  if (currentRemaining <= 0) {
                    setHeaderOfferTimer(null);
                    setHeaderTopBanner(null);
                    if (setActiveOfferTimer) setActiveOfferTimer(null);
                    if (setActiveTopBanner) setActiveTopBanner(null);
                  } else {
                    fetchBanners();
                  }
                }
              }, delay);
            } else {
              setHeaderOfferTimer(null);
              setHeaderTopBanner(null);
              if (setActiveOfferTimer) setActiveOfferTimer(null);
            }
          } else if (isMounted) {
            setHeaderOfferTimer(null);
            setHeaderTopBanner(null);
            if (setActiveOfferTimer) setActiveOfferTimer(null);
          }
        }
      } catch (e) {
        // Abort / transient network (HMR, tab focus) — keep last banner; avoid Next overlay noise
        if (e?.name !== "AbortError") {
          console.warn("[Header] offer timer banner refresh skipped (network)");
        }
      }

      // 2. Fetch regular state-wise top banner for region (priority fallback)
      try {
        const resTop = await fetch(
          `/api/topbanner?region=${encodeURIComponent(reg)}`,
          fetchOpts
        );
        if (resTop.ok) {
          const dataTop = await resTop.json();
          if (isMounted && dataTop?.success && dataTop.banners?.length > 0) {
            const normalBanner = dataTop.banners[0]?.banner_image || null;
            if (setNormalTopBanner) setNormalTopBanner(normalBanner);
            if (!hasActiveOffer && setActiveTopBanner) {
              setActiveTopBanner(normalBanner);
            }
          } else if (isMounted) {
            if (setNormalTopBanner) setNormalTopBanner(null);
            if (!hasActiveOffer && setActiveTopBanner) {
              setActiveTopBanner(null);
            }
          }
        }
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.warn("[Header] top banner refresh skipped (network)");
        }
      }
    };

    let focusDebounceTimer = null;
    let bannersInFlight = false;

    const safeFetchBanners = async () => {
      if (!isMounted || bannersInFlight) return;
      bannersInFlight = true;
      try {
        await fetchBanners();
      } finally {
        bannersInFlight = false;
      }
    };

    safeFetchBanners();

    // Listen for cross-tab or form updates without page reload
    const handleStorageUpdate = (e) => {
      if (e.key === "sathya_offer_timer_sync" || e.key === "sathya_top_banner_sync") {
        safeFetchBanners();
      }
    };
    const handleCustomUpdate = () => {
      if (focusDebounceTimer) clearTimeout(focusDebounceTimer);
      focusDebounceTimer = setTimeout(() => {
        safeFetchBanners();
      }, 300);
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("offerTimerUpdated", handleCustomUpdate);
    window.addEventListener("focus", handleCustomUpdate);

    return () => {
      isMounted = false;
      abortController.abort();
      if (timerExpiryTimeout) clearTimeout(timerExpiryTimeout);
      if (focusDebounceTimer) clearTimeout(focusDebounceTimer);
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("offerTimerUpdated", handleCustomUpdate);
      window.removeEventListener("focus", handleCustomUpdate);
    };
  }, [region, selectedRegion?.id, setActiveOfferTimer, setActiveTopBanner, setNormalTopBanner]);

  // Priority derivation:
  // 1. Active eligible Offer Timer Top Banner (if valid image)
  // 2. Existing normal state-wise Top Banner
  // 3. Existing default header background (null)
  const effectiveOfferTimer = headerOfferTimer || activeOfferTimer;
  // When an offer timer is active for the current state (all-states or state-specific),
  // show only the timer widget and hide the Deals button (same destination page).
  const showDealsButton = !effectiveOfferTimer;
  const currentBannerUrl = useMemo(() => {
    const timerBanner = effectiveOfferTimer
      ? (effectiveOfferTimer.top_banner_url || effectiveOfferTimer.topBanner || headerTopBanner || activeTopBanner)
      : null;
    if (timerBanner) {
      return timerBanner.startsWith("/") ? timerBanner : `/uploads/topbanner/${timerBanner}`;
    }
    if (normalTopBanner) {
      return normalTopBanner.startsWith("/") ? normalTopBanner : `/uploads/topbanner/${normalTopBanner}`;
    }
    return null;
  }, [effectiveOfferTimer, headerTopBanner, activeTopBanner, normalTopBanner]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileMenuPos, setProfileMenuPos] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All Category");
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("Search for");
  const [typedPreview, setTypedPreview] = useState("");
  const [words, setWords] = useState([]);
  const [categorieslist, setCategorieslist] = useState([]);
  const [brandsForSearch, setBrandsForSearch] = useState([]);
  const wordIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const getSortedProducts = () => {
    return sortProductsClient(products, sortOption);
  };

  // --- Add cache helpers after your state declarations (place near other consts) ---
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const loadCache = (key) => {
    // returns null if not found or parse error
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      return obj;
    } catch (e) {
      console.warn('Cache parse error for', key, e);
      return null;
    }
  };
  const saveCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) {
      // ignore storage errors (quota)
      console.warn('Cache save failed for', key, e);
    }
  };

  const RAW_CATEGORIES_CACHE_KEY = 'categories_raw_cache_v3';
  const NESTED_CATEGORIES_CACHE_KEY = 'categories_nested_cache_v3';

  // ADD: robust extractors + fallback words
  const extractCategoryArray = (payload) => {
    try {
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (payload && Array.isArray(payload.categories)) return payload.categories;
    } catch { }
    return [];
  };

  /**
   * Build active category hierarchy ensuring complete ancestor chain validity.
   * If any parent or ancestor is Inactive or missing, child categories will NOT be orphaned
   * into root level or attached to dead branches.
   */
  const buildActiveCategoryTree = (rawData) => {
    const rawArr = extractCategoryArray(rawData);
    const isActiveStatus = (status) =>
      String(status || "").trim().toLowerCase() === "active";

    // 1. Collect only Active categories
    const activeMap = new Map();
    rawArr.forEach((cat) => {
      if (cat && cat._id && isActiveStatus(cat.status)) {
        activeMap.set(String(cat._id), {
          ...cat,
          subcategories: [],
        });
      }
    });

    // 2. Validate ancestor chain: a category is only visible if its entire chain of parents up to root is Active
    const memoValid = new Map();
    const isChainActive = (catId, visiting = new Set()) => {
      if (memoValid.has(catId)) return memoValid.get(catId);
      if (visiting.has(catId)) return false;
      visiting.add(catId);

      const node = activeMap.get(catId);
      if (!node) {
        memoValid.set(catId, false);
        return false;
      }

      const pid = String(node.parentid || "none");
      if (pid === "none" || pid === "" || pid === "null" || pid === "undefined") {
        memoValid.set(catId, true);
        return true;
      }

      const parentValid = activeMap.has(pid) && isChainActive(pid, visiting);
      memoValid.set(catId, parentValid);
      return parentValid;
    };

    // 3. Build top-level and nested tree
    const rootCategories = [];
    const seenRootIds = new Set();

    for (const [id, node] of activeMap.entries()) {
      if (!isChainActive(id)) {
        // Parent or ancestor is inactive / deleted -> exclude orphan
        continue;
      }

      const pid = String(node.parentid || "none");
      if (pid === "none" || pid === "" || pid === "null" || pid === "undefined") {
        if (!seenRootIds.has(id)) {
          seenRootIds.add(id);
          rootCategories.push(node);
        }
      } else {
        const parentNode = activeMap.get(pid);
        if (parentNode && !parentNode.subcategories.some((c) => String(c._id) === id)) {
          parentNode.subcategories.push(node);
        }
      }
    }

    return sortNestedCategories(rootCategories);
  };
  const decodeHtmlEntities = (str) => {
    if (!str) return str;
    return String(str)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  const ensureWordsNotEmpty = (names) => {
    const cleaned = (names || []).map(decodeHtmlEntities).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
    return ['Mobiles', 'Laptops', 'Television', 'Air Conditioner', 'Refrigerator'];
  };

  // Auth must be defined before categories effect uses it
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const isStrictlyValidToken = Boolean(
        token &&
        typeof token === 'string' &&
        token !== 'undefined' &&
        token !== 'null' &&
        token.trim() !== ''
      );

      if (!isStrictlyValidToken) {
        clearBrowserAuth();
        setIsLoggedIn(false);
        setUserData(null);
        return;
      }

      const response = await fetch('/api/auth/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.loggedIn) {
          clearBrowserAuth();
          setIsLoggedIn(false);
          setUserData(null);
          return;
        }
        const fullUser = {
          userId: data.userId || data.user?.userId || data.user?._id,
          name: data.name || data.user?.name || '',
          last_name: data.last_name || data.user?.last_name || '',
          email: data.email || data.user?.email || '',
          mobile: data.phone || data.user?.mobile || '',
          role: data.role || data.user?.role || 'user',
          store_id: data.store_id || data.user?.store_id || '',
        };
        setIsLoggedIn(true);
        setIsAdmin(data.role === "admin" || fullUser.role === "admin");
        setUserData(fullUser);
        try {
          localStorage.setItem('sathya_user', JSON.stringify(fullUser));
        } catch {}
        // Ensure session lock exists once (avoid rewriting sessionId on every load)
        const uid = data.userId || data.user?.userId || data.user?._id;
        const hasLock = Boolean(localStorage.getItem("sathya_auth_session"));
        const existingSession = readStoredSession();
        if (
          uid &&
          token &&
          (!hasLock ||
            !existingSession?.userId ||
            String(existingSession.userId) !== String(uid))
        ) {
          establishSession({
            token,
            userId: uid,
            role: data.role || "user",
            source: data.role === "admin" ? "admin" : "store",
          });
        }
      } else {
        clearBrowserAuth();
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  useEffect(() => {
    const rawKey = RAW_CATEGORIES_CACHE_KEY;
    const nestedKey = NESTED_CATEGORIES_CACHE_KEY;
    let mounted = true;

    try {
      localStorage.removeItem('categories_raw_cache_v2');
      localStorage.removeItem('categories_nested_cache_v2');
    } catch { }

    const applyRawToWords = (raw) => {
      const arr = extractCategoryArray(raw);
      setCategorieslist(arr);
      setWords(ensureWordsNotEmpty(arr.map((cat) => cat.category_name)));
    };

    const fetchFreshCategories = async () => {
      try {
        const res = await fetch("/api/categories/get", { cache: "no-store" });
        if (!res.ok) return;
        const raw = await res.json();
        if (!mounted) return;
        saveCache(rawKey, raw);
        applyRawToWords(raw);
        const freshNested = buildActiveCategoryTree(raw);
        saveCache(nestedKey, freshNested);
        setCategories(freshNested);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.warn("[Header] categories refresh skipped (network)");
        }
      }
    };

    const setupCategories = async () => {
      try {
        // 1) Instant initial render from cache (0 CLS)
        const nestedCached = loadCache(nestedKey);
        if (nestedCached && Array.isArray(nestedCached.data) && nestedCached.data.length > 0) {
          if (mounted) setCategories(nestedCached.data);
        }

        const rawCached = loadCache(rawKey);
        if (rawCached && rawCached.data) {
          if (mounted) {
            applyRawToWords(rawCached.data);
            if (!nestedCached || !Array.isArray(nestedCached.data) || nestedCached.data.length === 0) {
              const nestedFromRaw = buildActiveCategoryTree(rawCached.data);
              saveCache(nestedKey, nestedFromRaw);
              setCategories(nestedFromRaw);
            }
          }
        }

        // 2) Stale-While-Revalidate: ALWAYS fetch fresh categories in background so updates reflect immediately
        await fetchFreshCategories();
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.warn("[Header] categories setup skipped (network)");
        }
        if (mounted) setWords(ensureWordsNotEmpty([]));
      }

      // Auth once after categories settle (not duplicated elsewhere on mount)
      try {
        await checkAuthStatus();
      } catch (e) { /* ignore */ }
    };

    setupCategories();

    // 3) Real-time sync listener for admin updates across tabs/windows
    let syncChannel = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        syncChannel = new BroadcastChannel("sathya_category_sync");
        syncChannel.onmessage = () => {
          if (mounted) {
            fetchFreshCategories();
          }
        };
      } catch (_) { }
    }

    const handleStorageChange = (e) => {
      if (e.key === "sathya_category_sync_timestamp" && mounted) {
        fetchFreshCategories();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      mounted = false;
      if (syncChannel) {
        try { syncChannel.close(); } catch (_) { }
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // CHANGED: add cancellation to avoid orphaned timers
    let cancelled = false;

    const typeEffect = () => {
      if (cancelled || words.length === 0) return;

      const currentWord = words[wordIndex.current] || '';
      const updatedText = isDeleting.current
        ? currentWord.substring(0, Math.max(0, charIndex.current - 1))
        : currentWord.substring(0, Math.min(currentWord.length, charIndex.current + 1));

      // Count words in updatedText
      const wordCount = updatedText.trim().split(/\s+/).filter(Boolean).length;

      setTypedPreview(updatedText || "");

      charIndex.current = isDeleting.current
        ? Math.max(0, charIndex.current - 1)
        : Math.min(currentWord.length, charIndex.current + 1);

      let delay = isDeleting.current ? 60 : 100;

      if (!isDeleting.current && charIndex.current === currentWord.length) {
        isDeleting.current = true;
        delay = 1000; // pause before deleting
      } else if (isDeleting.current && charIndex.current === 0) {
        isDeleting.current = false;
        wordIndex.current = (wordIndex.current + 1) % words.length;
        delay = 1000; // pause before typing next
      }

      setTimeout(() => {
        if (!cancelled) typeEffect();
      }, delay);
    };


    typeEffect();
    return () => { cancelled = true; };
  }, [words]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const { headerdetails, updateHeaderdetails } = useHeaderdetails();

  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [headerMenuItems, setHeaderMenuItems] = useState([]);
  // "Menu" dropdown button on the red bar; admin switches it in /admin/category/navcat.
  const [menuButtonEnabled, setMenuButtonEnabled] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let mounted = true;
    const cacheKey = "sathya_header_menu_v1";
    const menuButtonCacheKey = "sathya_header_menu_button_v1";
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (Array.isArray(cached) && cached.length) setHeaderMenuItems(cached);
      if (localStorage.getItem(menuButtonCacheKey) === "1") setMenuButtonEnabled(true);
    } catch { }
    fetch("/api/header-menu/storefront", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !Array.isArray(json?.data)) return;
        setHeaderMenuItems(json.data);
        try { localStorage.setItem(cacheKey, JSON.stringify(json.data)); } catch { }
        if (json.settings) {
          const enabled = json.settings.menuButtonEnabled !== false;
          setMenuButtonEnabled(enabled);
          try { localStorage.setItem(menuButtonCacheKey, enabled ? "1" : "0"); } catch { }
        }
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  // Red bar entries: admin-managed menu when configured, otherwise every active root category.
  // Category items resolve against the header's own tree so the dropdown keeps brands/subcategories.
  const redBarEntries = headerMenuItems.length > 0
    ? headerMenuItems
      .map((item) => {
        if (item.type === "custom") {
          return { kind: "custom", key: String(item._id), label: item.label, href: item.href };
        }
        const catId = String(item.category?._id || "");
        const category = categories.find((c) => String(c._id) === catId) || item.category;
        if (!category) return null;
        return {
          kind: "category",
          key: catId,
          label: category.category_name,
          category,
        };
      })
      .filter(Boolean)
    : categories.map((category) => ({
      kind: "category",
      key: String(category._id),
      label: category.category_name,
      category,
    }));

  const collectAvailabilityRequests = useCallback(
    (nodes, level = 0, out = [], seenBrandIds = new Set()) => {
      if (!Array.isArray(nodes)) return out;
      for (const node of nodes) {
        if (node?._id) {
          out.push({
            categoryId: String(node._id),
            pageType: pageTypeFromLevel(level),
          });
        }
        if (Array.isArray(node?.brands)) {
          for (const b of node.brands) {
            if (b?._id && !seenBrandIds.has(String(b._id))) {
              seenBrandIds.add(String(b._id));
              out.push({
                categoryId: String(b._id),
                pageType: PAGE_TYPES.BRAND,
                slug: b.brand_slug,
              });
            }
          }
        }
        if (Array.isArray(node?.subcategories) && node.subcategories.length > 0) {
          collectAvailabilityRequests(node.subcategories, level + 1, out, seenBrandIds);
        }
      }
      return out;
    },
    []
  );

  const resolveCategoryNavHref = useCallback((slugs = [], categoryId, level = 0) => {
    const pageType = pageTypeFromLevel(level);
    const hasOverview = categoryHasOverviewDesign(
      overviewAvailability,
      categoryId,
      pageType
    );
    return buildCategoryHref(slugs, hasOverview, level);
  }, [overviewAvailability]);

  const resolveCategoryBrandNavHref = useCallback(
    (_categorySlug, brand) => {
      const slug = brand?.brand_slug || (typeof brand === 'string' ? brand : '');
      if (!slug) return '/brand';
      const hasOverview = Boolean(
        categoryHasOverviewDesign(
          overviewAvailability,
          brand?._id,
          PAGE_TYPES.BRAND
        ) ||
        (brand?.brand_slug &&
          overviewAvailability[`${brand.brand_slug}:${PAGE_TYPES.BRAND}`])
      );
      return buildBrandHref(slug, hasOverview);
    },
    [overviewAvailability]
  );

  useEffect(() => {
    try {
      localStorage.removeItem('category_overview_availability_v1');
      localStorage.removeItem('category_overview_availability_v2');
      localStorage.removeItem('category_overview_availability_v3');
      localStorage.removeItem('category_overview_availability_v4');
      localStorage.removeItem('category_overview_availability_v5');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return;

    let cancelled = false;
    // Bump key to drop stale v1 caches that kept /overview links off.
    const AVAIL_CACHE_KEY = 'category_overview_availability_v7';
    const AVAIL_TTL_MS = 2 * 60 * 1000;

    const loadAvailability = async () => {
      try {
        const pages = collectAvailabilityRequests(categories);
        if (!pages.length) {
          if (!cancelled) setOverviewAvailability({});
          return;
        }

        // Stale-while-revalidate: paint cached map immediately, always refetch.
        const cached = loadCache(AVAIL_CACHE_KEY);
        if (
          cached &&
          Date.now() - cached.ts < AVAIL_TTL_MS &&
          cached.data &&
          typeof cached.data === 'object'
        ) {
          if (!cancelled) setOverviewAvailability(cached.data);
        }

        const BATCH = 400;
        const map = {};
        for (let i = 0; i < pages.length; i += BATCH) {
          const res = await fetch('/api/category-pages/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pages: pages.slice(i, i + BATCH) }),
            cache: 'no-store',
          });
          const data = await res.json();
          if (cancelled) return;
          if (data?.success && data.availability) {
            Object.assign(map, data.availability);
          }
        }
        setOverviewAvailability(map);
        saveCache(AVAIL_CACHE_KEY, map);
      } catch (err) {
        console.error('Failed to load category overview availability:', err);
        if (!cancelled) setOverviewAvailability((prev) => prev || {});
      }
    };

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [categories, collectAvailabilityRequests]);

  const [sortOption, setSortOption] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Keep a ref so hover brand-availability fetch does not re-run on every map update
  const overviewAvailabilityRef = useRef(overviewAvailability);
  overviewAvailabilityRef.current = overviewAvailability;

  useEffect(() => {
    if (!hoveredCategory?._id) return;
    const brands = [
      ...(Array.isArray(hoveredCategory.brands) ? hoveredCategory.brands : []),
      ...(Array.isArray(hoveredCategory.subcategories)
        ? hoveredCategory.subcategories.flatMap((sub) =>
          Array.isArray(sub?.brands) ? sub.brands : []
        )
        : []),
    ];
    const pages = [];
    const seen = new Set();
    for (const brand of brands) {
      if (!brand?._id) continue;
      const brandId = String(brand._id);
      if (seen.has(brandId)) continue;
      seen.add(brandId);
      pages.push({
        categoryId: brandId,
        pageType: PAGE_TYPES.BRAND,
        slug: brand.brand_slug,
      });
    }
    if (!pages.length) return;
    const avail = overviewAvailabilityRef.current || {};
    const missing = pages.filter(
      (p) =>
        avail[`${p.categoryId}:${PAGE_TYPES.BRAND}`] === undefined &&
        (!p.slug || avail[`${p.slug}:${PAGE_TYPES.BRAND}`] === undefined)
    );
    if (!missing.length) return;

    let cancelled = false;
    const loadBrandAvailability = async () => {
      try {
        const res = await fetch('/api/category-pages/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: missing }),
          cache: 'no-store',
        });
        const data = await res.json();
        if (cancelled || !data?.success || !data.availability) return;
        setOverviewAvailability((prev) => ({
          ...(prev || {}),
          ...data.availability,
        }));
      } catch (err) {
        console.error('Failed to load brand overview availability:', err);
      }
    };
    loadBrandAvailability();
    return () => {
      cancelled = true;
    };
  }, [hoveredCategory]);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownCenterX, setDropdownCenterX] = useState(null);
  const [dropdownUseTranslate, setDropdownUseTranslate] = useState(false);
  const slideRefs = useRef({});
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // refs & state for search dropdown positioning
  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const [searchContext, setSearchContext] = useState(null);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const searchDropdownRef = useRef(null);
  const mobileSearchDropdownRef = useRef(null);
  const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
  const [searchDropdownLeft, setSearchDropdownLeft] = useState(0);
  const [searchDropdownTop, setSearchDropdownTop] = useState(0);
  const [searchDropdownWidth, setSearchDropdownWidth] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  // Track step
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter OTP and new password
  const [resetStep, setResetStep] = useState(1);// 1: enter email, 2: enter OTP, 3: new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  // OTP input
  const [forgotOTP, setForgotOTP] = useState('');

  // New password inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Close mobile menu when clicking outside

  const handleClickOutside = (event) => {
    const inProfileDropdown = profileDropdownRef.current?.contains(event.target);
    const inProfileButton = profileButtonRef.current?.contains(event.target);
    const inMobileProfileButton = mobileProfileButtonRef.current?.contains(event.target);

    if (!inProfileDropdown && !inProfileButton && !inMobileProfileButton) {
      setDropdownOpen(false);
    }

    if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
      setIsAccountMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (accountMenuTimeoutRef.current) clearTimeout(accountMenuTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsAccountMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountMenuOpen]);

  useLayoutEffect(() => {
    if (!dropdownOpen) {
      setProfileMenuPos(null);
      return;
    }

    const updatePosition = () => {
      const isMobile = window.innerWidth < 640;
      const button = isMobile
        ? mobileProfileButtonRef.current
        : profileButtonRef.current;

      if (!button) return;

      const rect = button.getBoundingClientRect();
      setProfileMenuPos({
        top: rect.bottom + (isMobile ? 8 : 12),
        right: Math.max(8, window.innerWidth - rect.right),
        isMobile,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [dropdownOpen]);

  const handleSearch = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const searchTerm = (searchQuery || "").trim();
    if (!searchTerm) {
      toast.info("Please enter a search term");
      return;
    }
    setSearchDropdownVisible(false);
    router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
  };
  useEffect(() => {
    let mounted = true;
    const loadBrands = async () => {
      try {
        const res = await fetch("/api/brand");
        const data = await res.json();
        if (mounted) setBrandsForSearch(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error("Error loading brands for search", err);
      }
    };
    loadBrands();
    return () => { mounted = false; };
  }, []);

  // Search suggestions use /api/search/suggestions (no full-catalog preload).
  // Optional tiny local fallback if a prior session cached light products.
  useEffect(() => {
    let mounted = true;
    try {
      const raw = localStorage.getItem('cache_products');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.data || !parsed?.timestamp) return;
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) return;
      const list = Array.isArray(parsed.data) ? parsed.data : (parsed.data?.data || []);
      if (mounted && list.length > 0) setProducts(list);
    } catch { /* ignore */ }
    return () => { mounted = false; };
  }, []);

  // Memoized sorted products using existing getSortedProducts flow
  const sortedProducts = useMemo(() => getSortedProducts(), [products, sortOption]);

  // Clear search helper
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchTotal(0);
    setSearchError(null);
    setSearchDropdownVisible(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  // Production Search API: fetch suggestions with database-level search and pagination
  const fetchSuggestions = useCallback(async (q, category, pageNum = 1, isLoadMore = false) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setIsLoadingMore(false);
      setSearchHasMore(false);
      setSearchTotal(0);
      setSearchError(null);
      return;
    }

    const trimmed = q.trim();
    const requestId = ++searchRequestIdRef.current;

    if (!isLoadMore) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsLoadingSuggestions(true);
      setSearchError(null);
    } else {
      setIsLoadingMore(true);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const qs = new URLSearchParams({
        q: trimmed,
        page: String(pageNum),
        limit: "8",
      });
      if (category && category !== 'All Category' && category !== 'All Categories') {
        qs.set('category', category);
      }
      if (region) qs.set('region', region);

      const res = await fetch(`/api/search/suggestions?${qs}`, { signal: controller.signal, cache: 'no-store' });

      // Cancelled or superseded by newer request
      if (requestId !== searchRequestIdRef.current) return;

      if (!res.ok) {
        throw new Error(`Search request failed with status ${res.status}`);
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : (data?.results || []);
      const pagination = data?.pagination || {
        page: pageNum,
        limit: 8,
        total: items.length,
        totalPages: 1,
        hasMore: false,
      };

      if (isLoadMore) {
        setSuggestions((prev) => {
          const seen = new Set(prev.map((p) => String(p._id || p.id)));
          const uniqueNew = items.filter((p) => !seen.has(String(p._id || p.id)));
          return [...prev, ...uniqueNew];
        });
        setSearchPage(pageNum);
      } else {
        setSuggestions(items);
        setSearchPage(1);
      }

      setSearchTotal(pagination.total ?? items.length);
      setSearchHasMore(Boolean(pagination.hasMore));
      setSearchDropdownVisible(true);
      setSearchError(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // Expected when user keeps typing
      if (requestId !== searchRequestIdRef.current) return;
      console.error('Error fetching suggestions:', err);
      if (!isLoadMore) {
        setSuggestions([]);
        setSearchError('Unable to load search results. Please try again.');
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoadingSuggestions(false);
        setIsLoadingMore(false);
      }
    }
  }, [region]);

  const handleLoadMore = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoadingMore || !searchHasMore) return;
    fetchSuggestions(searchQuery, selectedCategory, searchPage + 1, true);
  }, [fetchSuggestions, searchQuery, selectedCategory, searchPage, isLoadingMore, searchHasMore]);

  // Debounced effect: call fetchSuggestions while typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setIsLoadingMore(false);
      setSearchHasMore(false);
      setSearchTotal(0);
      setSearchError(null);
      setSearchDropdownVisible(false);
      return;
    }

    // Show loading state immediately, then debounce the actual API call
    setIsLoadingSuggestions(true);
    setSearchDropdownVisible(true);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(q, selectedCategory, 1, false);
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedCategory, fetchSuggestions]);

  // Keep dropdown aligned with input on resize or scroll
  useEffect(() => {
    if (!searchDropdownVisible) return;
    const updatePos = () => {
      if (searchInputRef.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setSearchDropdownLeft(rect.left);
        setSearchDropdownTop(searchContext === 'desktop' ? rect.bottom + 4 : rect.bottom);
        setSearchDropdownWidth(rect.width);
      }
    };
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [searchDropdownVisible, searchContext]);

  // Close search dropdown when clicking outside input or dropdown
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (!searchDropdownVisible) return;
      if (target?.closest && (target.closest('[role="listbox"]') || target.closest('.header-search') || target.closest('.header-search-field'))) {
        return;
      }
      if (
        (searchInputRef.current && searchInputRef.current.contains(target)) ||
        (mobileSearchInputRef.current && mobileSearchInputRef.current.contains(target)) ||
        (searchDropdownRef.current && searchDropdownRef.current.contains(target)) ||
        (mobileSearchDropdownRef.current && mobileSearchDropdownRef.current.contains(target))
      ) {
        return;
      }
      setSearchDropdownVisible(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchDropdownVisible]);
  // Modify the search button to use the handler
  // Also make the search work when pressing Enter in the input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  const isValidEmail = (email) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const isValidMobile = (mobile) => /^[0-9]{10}$/.test(mobile);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({
    login: { email: "", password: "" },
    register: { name: "", email: "", mobile: "", password: "" },
  });

  // OTP Login States
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", mobile: "", password: "" });
  const [otpStep, setOtpStep] = useState(1); // 1 = phone input, 2 = OTP input
  const [otpMobile, setOtpMobile] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  // Send OTP handler
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otpMobile || !/^[6-9][0-9]{9}$/.test(otpMobile)) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: otpMobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setOtpError(data.error || 'Failed to send OTP');
        return;
      }

      setOtpStep(2);
    } catch (err) {
      console.error('Send OTP error:', err);
      setOtpError('Something went wrong. Please try again.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Verify OTP & Login handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otpValue || otpValue.length < 4) {
      setOtpError('Please enter the 4-digit OTP');
      return;
    }

    setLoadingAuth(true);
    const guestId = localStorage.getItem("guestCartId");
    try {
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: otpMobile, otp: otpValue, guestId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setOtpError(data.error || 'OTP verification failed');
        return;
      }

      if (data.token) {
        const incomingUserId = data.user?.userId || data.user?._id;
        const gate = canLoginAs(incomingUserId);
        if (!gate.ok) {
          setOtpError(gate.message || AUTH_CONFLICT_MESSAGE);
          return;
        }

        const fullUser = {
          userId: incomingUserId,
          name: data.user?.name || '',
          email: data.user?.email || '',
          mobile: data.user?.mobile || otpMobile || '',
          role: data.user?.role || 'user',
        };
        try {
          localStorage.setItem('sathya_user', JSON.stringify(fullUser));
        } catch {}
        establishSession({
          token: data.token,
          userId: incomingUserId,
          role: fullUser.role,
          source: 'store',
          user: fullUser,
        });
        setIsLoggedIn(true);
        setIsAdmin(fullUser.role === "admin");
        setUserData(fullUser);
        setShowAuthModal(false);

        // reset OTP states
        setOtpStep(1);
        setOtpMobile('');
        setOtpValue('');
        setOtpError('');

        // update cart
        const cartResponse = await fetch("/api/cart/count", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (cartResponse.ok) {
          const cartDataCount = await cartResponse.json();
          setCartCountSynced(cartDataCount.count);
        }

        // fetch and broadcast latest cartData after login/merge
        try { await fetchCartLatest(); } catch { }

        localStorage.removeItem("guestCartId");
        location.reload();
      } else {
        setShowAuthModal(true);
      }
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setLoadingAuth(false);
    }
  };

  // Keep old handleAuthSubmit as no-op for backward compatibility
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
  };
  useEffect(() => {
    setHasMounted(true);
    // Verify auth status immediately on mount
    checkAuthStatus();
  }, []);
  const handleLogout = () => {
    clearBrowserAuth();
    setIsLoggedIn(false);
    setUserData(null);
    setIsAdmin(false);
    setDropdownOpen(false);
    // CHANGE: broadcast clear to all tabs
    setCartCountSynced(0);
    // ADD: clear cartData everywhere
    try { localStorage.removeItem(CART_DATA_KEY); } catch { }
    setCartData(null);
    if (typeof window !== "undefined") {
      const protectedPaths = ["/profile", "/orders", "/address"];
      if (protectedPaths.some((p) => window.location.pathname.startsWith(p))) {
        router.push("/");
      }
    }
  };
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch("/api/offers/get");
        const result = await response.json();

        // Process and format dates before setting state
        const activeOffers = (Array.isArray(result?.data) ? result.data : [])
          .filter((offer) => offer && offer.fest_offer_status === "active");
        setOffers(activeOffers);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.warn("[Header] offers refresh skipped (network)");
        }
        setOffers([]);
      }
    };
    fetchOffers();
  }, []);
  const hideTimeout = useRef(null);
  const flattenTree = (cat, rootCategory, level = 0) => {
    let result = [];

    // Add the category itself
    result.push({ ...cat, rootCategory, level, type: 'category' });

    // Add subcategories
    if (cat.subcategories?.length > 0) {
      cat.subcategories.forEach(child => {
        result = result.concat(flattenTree(child, rootCategory, level + 1));
      });
    }

    return result;
  };


  const cancelHide = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  };
  const startHide = (delay = 100) => {
    cancelHide();
    hideTimeout.current = setTimeout(() => {
      setHoveredCategory(null);
    }, delay);
  };
  const handleMouseEnter = (categoryId, categoryNode = null) => {
    cancelHide();
    const cat = categoryNode || categories.find((c) => c._id === categoryId);
    if (!cat) return;
    // The category mega menu and the Menu dropdown never show together.
    if (menuHoverLeaveTimer.current) {
      clearTimeout(menuHoverLeaveTimer.current);
      menuHoverLeaveTimer.current = null;
    }
    setShowMenu(false);
    setHoveredCategory(cat);
    const sortedSubs = [...(cat.subcategories || [])]
      .sort(sortByCategoryPosition);
    setActiveSubCategory(null);

    const el = slideRefs.current[categoryId];
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Using fixed positioning => use viewport coords (rect.left / rect.bottom)
    setDropdownLeft(rect.left);
    setDropdownTop(rect.bottom + 18);
    setDropdownCenterX(rect.left + rect.width / 2);
  };
  // After dropdown mounts, measure and adjust so it never overflows screen or hides under arrows
  useLayoutEffect(() => {
    if (!hoveredCategory || !dropdownRef.current) return;
    const ddRect = dropdownRef.current.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    let left = dropdownLeft;

    // Center dropdown based on parent center when available
    if (dropdownCenterX != null && ddRect.width) {
      left = dropdownCenterX - ddRect.width / 2;
      // Clamp to viewport
      if (left < 8) left = 8;
      if (left + ddRect.width > screenWidth - 10) left = Math.max(10, screenWidth - ddRect.width - 10);
    } else {
      // If dropdown would overflow right edge, shift it left
      if (left + ddRect.width > screenWidth - 10) {
        left = Math.max(10, screenWidth - ddRect.width - 10);
      }
    }

    // Ensure dropdown is at least after prev arrow
    const prevBtn = document.querySelector(".custom-swiper-prev");
    const prevRight = prevBtn?.getBoundingClientRect().right || 0;
    if (left < prevRight + 8) left = prevRight + 8;

    // Ensure dropdown doesn't go too far left
    if (left < 8) left = 8;

    // Only update if it actually changes (prevents render thrash)
    if (Math.round(left) !== Math.round(dropdownLeft)) setDropdownLeft(left);
    // include dropdownLeft so we compare against current value
  }, [hoveredCategory, dropdownCenterX, dropdownLeft]);
  // cleanup hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  // Add this function to handle forgot password submission
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordMessage('');
    setForgotPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }
      setForgotPasswordMessage(data.message || 'Password reset link sent to your email');
    } catch (err) {
      setForgotPasswordError(err.message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  // Price formatter
  const formatPrice = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const num = Number(value);
    if (Number.isNaN(num)) return '';
    return '₹' + num.toLocaleString('en-IN');
  };
  // Query keyword highlight helper
  const renderHighlightedText = useCallback((text, query) => {
    if (!text) return 'Unnamed';
    if (!query || !query.trim()) return text;
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return text;
    try {
      const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      const parts = text.split(pattern);
      return parts.map((part, i) =>
        pattern.test(part) ? (
          <span key={i} className="text-brandRed font-bold">
            {part}
          </span>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  }, []);

  // Safe image path resolution
  const getSuggestionImage = useCallback((item) => {
    if (item?.image) return item.image;
    if (Array.isArray(item?.images) && item.images.length > 0) {
      const img = item.images[0];
      if (img.startsWith('http') || img.startsWith('/')) return img;
      return `/uploads/products/${img}`;
    }
    return null;
  }, []);

  const renderSuggestionItem = useCallback((item, idx) => {
    const id = item._id || item.id || idx;
    const slug = item.slug || item._id || item.id || '';

    const pSpecial = parseFloat(item.special_price) || 0;
    const pPrice = parseFloat(item.price) || 0;
    const pMrp = parseFloat(item.mrp) || 0;
    const bestPrice = pSpecial > 0 ? pSpecial : (pPrice > 0 ? pPrice : pMrp);

    const imageSrc = getSuggestionImage(item);
    return (
      <Link
        key={id}
        role="option"
        aria-selected={false}
        href={`/product/${encodeURIComponent(slug)}`}
        onClick={() => setSearchDropdownVisible(false)}
        className="group block mb-2 last:mb-0 rounded-lg bg-[#f7f7f8] hover:bg-white border border-transparent hover:border-red-300 shadow-xs hover:shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-white ring-1 ring-gray-200 flex items-center justify-center shrink-0 p-0.5">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={item.name || 'Product'}
                className="object-contain w-full h-full"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/uploads/sathya-header-logo.webp";
                }}
              />
            ) : (
              <span className="text-[10px] text-gray-400">NO IMG</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2 uppercase group-hover:text-brandRed">
              {renderHighlightedText(item.name, searchQuery)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              {bestPrice > 0 ? (
                <span className="text-[12px] font-medium text-gray-700 group-hover:text-brandRed">
                  {typeof formatPrice === 'function' ? formatPrice(bestPrice) : `₹${Number(bestPrice).toLocaleString('en-IN')}`}
                </span>
              ) : (
                <span className="text-[12px] font-medium text-gray-500 italic">
                  Coming Soon
                </span>
              )}
              {item.sub_category_new_name && (
                <span className="text-[10px] text-gray-400 truncate max-w-[130px]">
                  {item.sub_category_new_name.split('##').pop()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }, [setSearchDropdownVisible, searchQuery, renderHighlightedText, getSuggestionImage]);

  // ADD state (place with other useState declarations)
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // RESET active suggestion only when dropdown closes (not on every list update)
  useEffect(() => {
    if (!searchDropdownVisible) setActiveSuggestion(-1);
  }, [searchDropdownVisible]);

  // Scroll active suggestion into view on keyboard navigation
  useEffect(() => {
    if (activeSuggestion >= 0 && searchDropdownRef.current) {
      const activeEl = searchDropdownRef.current.querySelector('[aria-selected="true"]');
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeSuggestion]);

  // SELECT helper
  const selectSuggestion = useCallback((index) => {
    if (index < 0 || index >= suggestions.length) return;
    const item = suggestions[index];
    const slug = item.slug || item._id || item.id;
    if (!slug) return;
    setSearchDropdownVisible(false);
    router.push(`/product/${encodeURIComponent(slug)}`);
  }, [suggestions, router]);

  // DESKTOP key handling (keep existing handleKeyPress for mobile inputs)
  const handleDesktopKeyDown = (e) => {
    if (!suggestions.length) {
      if (e.key === 'Enter') handleSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(p => (p + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(p => (p - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (activeSuggestion >= 0) {
        e.preventDefault();
        selectSuggestion(activeSuggestion);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setSearchDropdownVisible(false);
    }
  };

  // DESKTOP specific renderer
  function renderDesktopSuggestionItem(item, idx) {
    const id = item._id || item.id || idx;

    const pSpecial = parseFloat(item.special_price) || 0;
    const pPrice = parseFloat(item.price) || 0;
    const pMrp = parseFloat(item.mrp) || 0;
    const bestPrice = pSpecial > 0 ? pSpecial : (pPrice > 0 ? pPrice : pMrp);
    const isActive = idx === activeSuggestion;
    const imageSrc = getSuggestionImage(item);

    return (
      <div
        key={id}
        role="option"
        aria-selected={isActive}
        onMouseEnter={() => setActiveSuggestion(idx)}
        onMouseDown={() => selectSuggestion(idx)}
        className={`flex gap-4 px-4 py-3 cursor-pointer rounded-lg transition-all group ${isActive ? 'bg-red-50/70 border border-red-200' : 'bg-[#f7f7f8] hover:bg-white border border-transparent hover:border-gray-200'
          }`}
      >
        <div className="w-[52px] h-[52px] rounded-lg overflow-hidden bg-white flex items-center justify-center border border-gray-200 shrink-0 p-1">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.name || 'Product'}
              className="object-contain w-full h-full"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/uploads/sathya-header-logo.webp";
              }}
            />
          ) : (
            <span className="text-[10px] text-gray-400">NO IMG</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] font-medium leading-snug line-clamp-2 transition-colors ${isActive ? 'text-brandRed' : 'text-gray-800 group-hover:text-gray-900'
              }`}
          >
            {renderHighlightedText(item.name, searchQuery)}
          </div>
          <div className="mt-1 flex items-center justify-between">
            {bestPrice > 0 ? (
              <div className="text-[13px] font-semibold text-brandRed">
                ₹{Number(bestPrice).toLocaleString('en-IN')}
              </div>
            ) : (
              <span className="text-[12px] font-medium text-gray-500 italic">
                Coming Soon
              </span>
            )}
            {item.sub_category_new_name && (
              <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                {item.sub_category_new_name.split('##').pop()}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };
  // ADD: mobile accordion open-state + helpers
  // FIX: replace wrong useState with real loader function + tracking map
  const [loadedCategoryIds, setLoadedCategoryIds] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  // NEW: unified nodes for mobile = categories + hoveredCategory.subcategories
  const nodes = useMemo(() => {
    const base = Array.isArray(categories) ? categories : [];
    const extra = (hoveredCategory && Array.isArray(hoveredCategory.subcategories))
      ? hoveredCategory.subcategories
      : [];

    if (!extra.length) return base;

    const map = new Map();
    base.forEach(n => { if (n && n._id) map.set(n._id, n); });
    extra.forEach(n => { if (n && n._id && !map.has(n._id)) map.set(n._id, n); });
    return Array.from(map.values());
  }, [categories, hoveredCategory]);

  // Ensures the subcategories for a category are present by rebuilding from cache/API if needed
  const ensureSubcategories = useCallback(async (categoryId) => {
    if (!categoryId) return;

    // already ensured this id in this session
    if (loadedCategoryIds[categoryId]) return;

    // find node in current nested tree
    const findNodeById = (list, id) => {
      for (const n of list || []) {
        if (n?._id === id) return n;
        const hit = findNodeById(n?.subcategories || [], id);
        if (hit) return hit;
      }
      return null;
    };

    const node = findNodeById(categories, categoryId);
    if (node && Array.isArray(node.subcategories) && node.subcategories.length > 0) {
      setLoadedCategoryIds((m) => ({ ...m, [categoryId]: true }));
      return;
    }

    try {
      // use raw cache if available, otherwise fetch
      let raw = loadCache(RAW_CATEGORIES_CACHE_KEY)?.data;
      let rawArr = extractCategoryArray(raw);
      if (!Array.isArray(rawArr) || rawArr.length === 0) {
        const res = await fetch('/api/categories/get', { cache: 'no-store' });
        raw = await res.json();
        saveCache(RAW_CATEGORIES_CACHE_KEY, raw);
        rawArr = extractCategoryArray(raw);
      }

      // Rebuild nested tree using the robust buildActiveCategoryTree helper
      const sortedNested = buildActiveCategoryTree(raw);
      setCategories(sortedNested);
      saveCache(NESTED_CATEGORIES_CACHE_KEY, sortedNested);
    } catch (e) {
      console.error('ensureSubcategories failed:', e);
    } finally {
      setLoadedCategoryIds((m) => ({ ...m, [categoryId]: true }));
    }
  }, [categories, loadedCategoryIds]);

  const toggleMobileCategory = useCallback(async (id) => {
    await ensureSubcategories(id);
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }, [ensureSubcategories]);

  // Add missing slug helpers used by renderCategoryLevel
  const safeSlugify = (s, fallback = "") => {
    const base = (s || "").toString().trim();
    if (!base) return fallback;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };
  const getCategorySlug = (cat) => cat?.category_slug || cat?.slug || safeSlugify(cat?.category_name, cat?._id || "category");
  // Compute href for node based on hierarchy + dynamic overview availability
  const getNodeHref = (ancestorSlugs = [], node, level = 0) => {
    const nodeSlug = getCategorySlug(node);
    const fullSlugs = [...ancestorSlugs, nodeSlug];
    return resolveCategoryNavHref(fullSlugs, node?._id, level);
  };
  // NEW: recursive renderer for unlimited category levels
  function renderCategoryLevel(nodes, ancestorSlugs = [], level = 0) {
    if (!Array.isArray(nodes) || nodes.length === 0) return null;
    return (
      <div className="divide-y divide-gray-100">
        {uniqueById(nodes)
          .slice() // make a shallow copy to avoid mutating original
          .sort(sortByCategoryPosition)
          .map((node) => {
            const hasChildren =
              Array.isArray(node.subcategories) && node.subcategories.length > 0;
            const isOpen = !!openCategories[node._id];
            const nodeSlug = getCategorySlug(node);
            const slugs = [...ancestorSlugs, nodeSlug];
            const href = getNodeHref(ancestorSlugs, node, level);
            const rowJustify = hasChildren ? "justify-between" : "justify-start";

            return (
              <div
                key={node._id}
                className={`${isOpen ? "bg-red-50/40" : "bg-white"} hover:bg-[#f2f2f2]`}
              >
                <div
                  className={`w-full flex items-center ${rowJustify} ${level === 0 ? "px-3 py-3 text-sm" : "pl-5 pr-3 py-2 text-[13px]"
                    } ${isOpen ? "text-brandRed bg-[#f2f2f2]" : "text-gray-800 hover:bg-[#f2f2f2]"}`}
                >
                  <Link
                    href={href}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 text-left truncate"
                    style={{ paddingLeft: level > 0 ? Math.min(level * 8, 24) : 0 }}
                  >
                    {node.category_name || "Category"}
                  </Link>

                  {hasChildren && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await ensureSubcategories(node._id);
                        setOpenCategories((prev) => {
                          const next = { ...prev };
                          const willOpen = !prev[node._id];
                          if (level === 0) {
                            Object.keys(next).forEach((k) => delete next[k]);
                            if (willOpen) next[node._id] = true;
                            return next;
                          }
                          next[node._id] = willOpen;
                          return next;
                        });
                      }}
                      aria-label="Toggle"
                      className="ml-2"
                    >
                      <FiChevronRight
                        className={`text-white rounded-full p-1 transition-transform duration-200 bg-[#ED1C24] ${isOpen ? "rotate-90" : "rotate-0"
                          }`}
                        size={18}
                      />
                    </button>
                  )}
                </div>

                {isOpen && hasChildren && (
                  <div className="pb-2">
                    {renderCategoryLevel(node.subcategories, slugs, level + 1)}
                  </div>
                )}
              </div>
            );
          })}

      </div>
    );
  }
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const ids = (Array.isArray(categories) ? categories : []).slice(0, 5).map(c => c._id);
    ids.forEach((id) => { ensureSubcategories(id); });
  }, [isMobileMenuOpen, categories, ensureSubcategories]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white shadow-xs">
        <style jsx global>{`
              :root{
                --search-h:42px;
                --search-radius:999px;
                --accent:#ED1C24;
                --search-border:#e5e7eb;
                --muted:#6b7280;
              }
              .header-search{
                display:flex;
                align-items:center;
                width:100%;
                max-width:530px;
                margin:0 auto;
                height:var(--search-h);
                background:#fff;
                border:1.5px solid var(--search-border);
                border-radius:var(--search-radius);
                overflow:hidden;
                box-shadow:0 1px 2px rgba(15,23,42,0.04);
                transition:border-color .18s ease, box-shadow .18s ease;
              }
              .header-search:focus-within{
                border-color:var(--accent);
                box-shadow:0 0 0 3px rgba(215,40,40,0.12);
              }
              .header-search-select-wrap{
                position:relative;
                flex:0 0 auto;
                flex-shrink:0;
                height:100%;
                border-right:1px solid #eee;
                background:#fafafa;
                display:flex;
                align-items:center;
              }
              .header-search-select{
                height:100%;
                width:auto;
                min-width:105px;
                max-width:145px;
                padding:0 24px 0 12px;
                border:0;
                background:transparent;
                color:#111;
                font-size:13px;
                font-weight:500;
                cursor:pointer;
                outline:none;
                -webkit-appearance:none;
                appearance:none;
                flex-shrink:0;
                white-space:nowrap;
                text-overflow:ellipsis;
                overflow:hidden;
              }
              .header-search-select-wrap::after{
                content:'';
                position:absolute;
                right:10px;
                top:50%;
                transform:translateY(-40%);
                border-left:4px solid transparent;
                border-right:4px solid transparent;
                border-top:5px solid #6b7280;
                pointer-events:none;
              }
              .header-search-field{
                position:relative;
                flex:1 1 auto;
                height:100%;
                min-width:0;
              }
              .header-search-input{
                width:100%;
                height:100%;
                border:0;
                outline:none;
                background:transparent;
                padding:0 12px;
                font-size:14px;
                color:#0f172a;
              }
              .header-search-input::-webkit-search-cancel-button{
                -webkit-appearance:none;
              }
              .header-search-btn{
                flex:0 0 auto;
                height:100%;
                min-width:48px;
                padding:0 16px;
                border:0;
                background:var(--accent);
                color:#fff;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
                transition:background .15s ease;
              }
              .header-search-btn:hover{ background:#C4161D; }
              .header-search-btn:active{ transform:scale(0.98); }
              @media (max-width:640px){
                :root{ --search-h:40px; --search-radius:12px; }
                .header-search-select{ min-width:85px; max-width:130px; font-size:11px; padding:0 22px 0 8px; }
                .header-search-btn{ min-width:42px; padding:0 12px; }
              }
              @media (min-width:641px) and (max-width:1024px){
                .header-search-select{ min-width:110px; max-width:185px; font-size:12px; padding:0 26px 0 10px; }
              }
              @media (min-width:1025px){
                .header-search-select{ min-width:110px; max-width:150px; font-size:12.5px; padding:0 24px 0 12px; }
              }
            `}</style>
        {/* Main Header */}
        <div className={`${isMobileMenuOpen
          ? "fixed inset-0 mt-0 pt-0 z-50 overflow-y-auto overflow-x-hidden"
          : `${currentBannerUrl ? "bg-cover bg-center" : "bg-white"
          } px-3 sm:px-6 md:px-6 py-1 relative z-40 transition-all duration-300`
          }`}
          style={
            !isMobileMenuOpen && currentBannerUrl
              ? {
                backgroundImage: `url("${currentBannerUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "transparent",
              }
              : undefined
          }>
          {/* NEW MOBILE TOP ROW — compact & collision-free layout */}
          <div className="sm:hidden flex items-center justify-between w-full max-w-full min-w-0 relative gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 min-w-0">
              <Link href="/" className={`p-0.5 sm:p-1 rounded-lg flex-shrink-0 ${currentBannerUrl ? "bg-transparent" : "bg-white"}`}>
                <img src="/uploads/sathya-header-logo.webp" alt="Logo" width={58} height={36} className="h-8 sm:h-9 w-auto" />
              </Link>
              <button
                type="button"
                onClick={openRegionModal}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 hover:bg-red-100 text-[#d72828] text-[10px] font-bold border border-red-200/80 transition-all flex-shrink-0 max-w-[82px] sm:max-w-[95px]"
                title={`Deliver to: ${city || 'Chennai'}, ${pincode || '600001'}`}
                suppressHydrationWarning
              >
                <FiMapPin size={10} className="text-[#d72828] flex-shrink-0" />
                <span className="truncate" suppressHydrationWarning>{pincode ? pincode : (selectedRegion?.code || 'TN')}</span>
                <span className="text-[9px] opacity-70">▾</span>
              </button>
              {/* Mobile Deals Button — hidden when offer timer is active for this state */}
              {showDealsButton && (
                <Link
                  href="/deals-offer"
                  className="inline-flex items-center justify-center px-2 py-0.5 h-[26px] sm:h-[28px] rounded-md text-[#000000] font-bold text-[10.5px] sm:text-[11px] leading-tight transition-all duration-200 shadow-xs hover:shadow hover:opacity-95 active:scale-95 flex-shrink-0 self-center"
                  style={{
                    background: "linear-gradient(135deg, #00b4db 0%, #f44336 55%, #ffc107 100%)",
                  }}
                  title="View Deals & Special Offers"
                >
                  Deals
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-brandRed flex-shrink-0">
              <Link href="/wishlist" className={`${HEADER_ACTION_LINK_CLASS} relative min-w-[32px] sm:min-w-[36px]`}>
                <div className={HEADER_ACTION_ICON_WRAP_SM_CLASS}>
                  <HiOutlineHeart size={15} strokeWidth={1.8} />
                  <span className={HEADER_ACTION_BADGE_SM_CLASS} suppressHydrationWarning>
                    {wishlistCount}
                  </span>
                </div>
                <span className={`text-[8px] hidden ${HEADER_ACTION_LABEL_CLASS}`}>Wishlist</span>
              </Link>
              <Link href="/cart" className={`${HEADER_ACTION_LINK_CLASS} relative min-w-[32px] sm:min-w-[36px]`}>
                <div className={HEADER_ACTION_ICON_WRAP_SM_CLASS}>
                  <HiOutlineShoppingBag size={15} strokeWidth={1.8} />
                  <span className={HEADER_ACTION_BADGE_SM_CLASS} suppressHydrationWarning>
                    {cartCount}
                  </span>
                </div>
                <span className={`text-[8px] hidden ${HEADER_ACTION_LABEL_CLASS}`}>Cart</span>
              </Link>
              {/* Mobile Deals Offer PDF Button - Visible ONLY for Authenticated Users */}
              {Boolean(isLoggedIn && userData) && (
                <DealsPdfButton className="scale-90" />
              )}

              {/* Mobile Profile / Login Action Button */}
              <button
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    setIsMobileMenuOpen(true);
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                aria-label={isAuthenticated ? "Account" : "Login"}
                className={`${HEADER_ACTION_LINK_CLASS} relative min-w-[32px] sm:min-w-[36px]`}
                title={isAuthenticated ? (userData?.name || "Account") : "Login / Sign In"}
              >
                <div className={HEADER_ACTION_ICON_WRAP_SM_CLASS}>
                  <FiUser size={15} strokeWidth={1.8} />
                </div>
                <span className={`text-[8px] hidden ${HEADER_ACTION_LABEL_CLASS}`}>
                  {isAuthenticated ? userDisplayName : "Login"}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleMobileMenu}
                aria-label="Menu"
                className="relative flex-shrink-0 p-1.5 -mr-1 rounded-md active:bg-orange-50"
              >
                {isMobileMenuOpen ? <FiX size={18} /> : <FaBars size={17} />}
              </button>
            </div>
          </div>
          {/* MOBILE SEARCH BAR */}
          <div className="sm:hidden mt-2 w-full max-w-full">
            {effectiveOfferTimer && (
              <div className="flex justify-center w-full mb-2">
                <HeaderOfferTimer timer={effectiveOfferTimer} isMobile={true} mobileForceDesktopStyle={true} />
              </div>
            )}
            <div className="header-search" role="search">
              <div className="header-search-select-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSelectedCategory(newCat);
                    if (searchQuery.trim().length >= 2) {
                      fetchSuggestions(searchQuery, newCat, 1, false);
                    }
                  }}
                  className="header-search-select"
                  aria-label="Category"
                >
                  <option value="All Category">All</option>
                  {categories.map((cat) => (
                    <option key={String(cat._id)} value={cat.category_name} title={cat.category_name}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="header-search-field">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder=" "
                  className="header-search-input"
                  ref={mobileSearchInputRef}
                  onFocus={() => {
                    setSearchContext('mobileTop');
                    if (mobileSearchInputRef.current) {
                      const rect = mobileSearchInputRef.current.getBoundingClientRect();
                      setSearchDropdownLeft(rect.left);
                      setSearchDropdownTop(rect.bottom);
                      setSearchDropdownWidth(rect.width);
                    }
                    if (searchQuery.trim().length >= 2) fetchSuggestions(searchQuery, selectedCategory);
                    if (searchQuery.trim().length >= 2) setSearchDropdownVisible(true);
                  }}
                />
                {searchQuery.trim() === "" && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] pointer-events-none z-10 truncate max-w-[calc(100%-12px)]">
                    <span className="text-gray-400">Search for</span>
                    <span className="text-gray-900 font-medium">"{typedPreview}"</span>
                  </div>
                )}
                {searchQuery.trim() !== "" && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    aria-label="Clear search"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => handleSearch(e)}
                aria-label="Search"
                className="header-search-btn"
              >
                <FaSearch size={14} />
              </button>
            </div>
          </div>
          {/* MOBILE TOP SUGGESTIONS (outside menu) */}
          {searchDropdownVisible && searchContext === 'mobileTop' && !isMobileMenuOpen && (
            <div
              ref={mobileSearchDropdownRef}
              role="listbox"
              aria-label="Search product suggestions"
              className="sm:hidden absolute z-[70] left-0 right-0 px-3 mt-1"
            >
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-gray-100 bg-gray-50/70 select-none">
                  <span className="text-[11px] font-bold tracking-wide text-gray-500 uppercase">
                    PRODUCTS {searchTotal > 0 ? `(${suggestions.length} of ${searchTotal})` : ''}
                  </span>
                  {isLoadingSuggestions && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 border-2 border-brandRed border-t-transparent rounded-full animate-spin"></span>
                      Searching...
                    </span>
                  )}
                </div>
                <div className="px-3 py-2 space-y-2">
                  {isLoadingSuggestions ? (
                    <div className="space-y-2 py-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse bg-gray-50 rounded-lg p-2">
                          <div className="w-10 h-10 rounded bg-gray-200 shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchError ? (
                    <div className="py-6 text-center">
                      <p className="text-xs text-red-600 mb-2">{searchError}</p>
                      <button
                        type="button"
                        onClick={() => fetchSuggestions(searchQuery, selectedCategory, 1, false)}
                        className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        Retry Search
                      </button>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <>
                      {suggestions.map(renderSuggestionItem)}

                      {/* Loading more skeleton indicator */}
                      {isLoadingMore && (
                        <div className="space-y-2 pt-1">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse bg-gray-50 rounded-lg p-2">
                              <div className="w-10 h-10 rounded bg-gray-200 shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/3" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Load More Button */}
                      {searchHasMore && !isLoadingMore && (
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          className="w-full mt-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          Load more ({suggestions.length} of {searchTotal})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleSearch(e)}
                        className="w-full mt-1.5 py-2 text-xs font-semibold text-brandRed border border-brandRed rounded-lg hover:bg-red-50 transition-colors"
                      >
                        See all {searchTotal > 0 ? searchTotal : ''} results for &ldquo;{searchQuery.trim()}&rdquo;
                      </button>
                    </>
                  ) : (
                    searchQuery.trim().length >= 2 && (
                      <div className="py-8 flex flex-col items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-medium">No products found</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Try a different keyword</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
          {/* DESKTOP ROW (unchanged original content) */}
          <div className="hidden sm:flex justify-between items-center gap-3">
            {/* Logo (Hidden on mobile) */}
            <div className={`hidden sm:block py-2 rounded-lg ${currentBannerUrl ? "bg-transparent" : "bg-white"}`}>
              <Link href="/" className="mx-auto">
                <img src="/uploads/sathya-header-logo.webp" alt="Logo" className="h-auto" width={80} height={45} />
              </Link>
            </div>

            {/* Search Bar */}
            <div className="header-search relative hidden sm:flex flex-1 max-w-[460px] md:max-w-[490px] lg:max-w-[530px]" role="search">
              <div className="header-search-select-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSelectedCategory(newCat);
                    if (searchQuery.trim().length >= 2) {
                      fetchSuggestions(searchQuery, newCat, 1, false);
                    }
                  }}
                  className="header-search-select"
                  aria-label="Search category"
                  title={selectedCategory}
                >
                  <option value="All Category">All Category</option>
                  {categories.map((cat) => (
                    <option key={String(cat._id)} value={cat.category_name}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="header-search-field">
                <input
                  type="search"
                  name="q"
                  id="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                  onFocus={() => {
                    setSearchContext('desktop');
                    if (searchInputRef.current) {
                      const rect = searchInputRef.current.getBoundingClientRect();
                      setSearchDropdownLeft(rect.left);
                      setSearchDropdownTop(rect.bottom + 4);
                      setSearchDropdownWidth(rect.width);
                    }
                    if (searchQuery.trim().length >= 2) fetchSuggestions(searchQuery, selectedCategory);
                    if (searchQuery.trim().length >= 2) setSearchDropdownVisible(true);
                  }}
                  onKeyDown={handleDesktopKeyDown}
                  className={`header-search-input ${searchQuery.trim() !== '' ? 'pr-7' : ''}`}
                  placeholder=" "
                  aria-label="Search query"
                />
                {searchQuery.trim() === "" && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
                    <span className="text-gray-400 text-sm">Search for</span>
                    <span className="text-gray-900 text-sm font-medium">"{typedPreview}"</span>
                  </div>
                )}
                {searchQuery.trim() !== "" && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    aria-label="Clear search"
                  >
                    <FiX size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="header-search-btn"
                onClick={handleSearch}
                aria-label="Search"
              >
                <FaSearch size={15} />
              </button>
            </div>
            {/* Active / Upcoming Offer Countdown Widget (Matches Screenshot Image 1) */}
            {effectiveOfferTimer && (
              <HeaderOfferTimer timer={effectiveOfferTimer} />
            )}

            {/* Icons Group */}
            <div className="flex items-center gap-1.5 md:gap-2 lg:gap-2.5 xl:gap-3 flex-shrink-0 mt-0.5">
              {/* Mobile Search Button (Hidden on desktop) */}
              <button onClick={toggleMobileMenu} className="sm:hidden text-brandRed">
                <FiSearch size={20} />
              </button>

              {/* Deals Button — hidden when offer timer is active for this state */}
              {showDealsButton && (
                <Link
                  href="/deals-offer"
                  className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-[#000000] font-bold text-[13px] leading-tight transition-all duration-200 shadow-xs hover:shadow hover:opacity-95 active:scale-95 shrink-0 self-center"
                  style={{
                    background: "linear-gradient(135deg, #00b4db 0%, #f44336 55%, #ffc107 100%)",
                  }}
                  title="View Deals & Special Offers"
                >
                  Deals
                </Link>
              )}

              {/* State / Region Selector Button */}
              <button
                type="button"
                onClick={openRegionModal}
                className={`${HEADER_ACTION_LINK_CLASS} hidden sm:flex min-w-[50px] md:min-w-[54px] cursor-pointer`}
                title={`Deliver to: ${city || 'Chennai'}, ${pincode || '600001'} (${selectedRegion?.name || 'Tamil Nadu'}). Click to change.`}
                suppressHydrationWarning
              >
                <div className={HEADER_ACTION_ICON_WRAP_CLASS}>
                  <FiMapPin size={18} strokeWidth={1.75} />
                </div>
                <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS} max-w-[62px] truncate`} suppressHydrationWarning>
                  {pincode ? pincode : (selectedRegion?.code || 'Region')} ▾
                </span>
              </button>

              {/* Contact Button (Placed next to Pincode as requested) */}
              <Link
                href="/contact"
                className={`${HEADER_ACTION_LINK_CLASS} hidden sm:flex min-w-[48px] md:min-w-[52px]`}
                title="Contact Us"
              >
                <div className={HEADER_ACTION_ICON_WRAP_CLASS}>
                  <HiOutlinePhone size={18} strokeWidth={1.75} />
                </div>
                <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS}`}>Contact</span>
              </Link>

              <a
                href="https://sathya.adtarbo.com/stores"
                target="_blank"
                rel="noopener noreferrer"
                className={`${HEADER_ACTION_LINK_CLASS} hidden sm:flex min-w-[52px]`}
              >
                <div className={HEADER_ACTION_ICON_WRAP_CLASS}>
                  <HiOutlineBuildingStorefront size={18} strokeWidth={1.75} />
                </div>
                <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS}`}>Store</span>
              </a>

              <Link href="/wishlist" className={`${HEADER_ACTION_LINK_CLASS} flex min-w-[52px] relative`}>
                <div className={HEADER_ACTION_ICON_WRAP_CLASS}>
                  <HiOutlineHeart size={18} strokeWidth={1.75} />
                  <span className={HEADER_ACTION_BADGE_CLASS} suppressHydrationWarning>
                    {wishlistCount}
                  </span>
                </div>
                <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS}`}>Wishlist</span>
              </Link>

              <Link href="/cart" className={`${HEADER_ACTION_LINK_CLASS} flex min-w-[52px] relative`}>
                <div className={HEADER_ACTION_ICON_WRAP_CLASS}>
                  <HiOutlineShoppingBag size={18} strokeWidth={1.75} />
                  <span className={HEADER_ACTION_BADGE_CLASS} suppressHydrationWarning>
                    {cartCount}
                  </span>
                </div>
                <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS}`}>Cart</span>
              </Link>

              {/* Deals Offer PDF Export Icon - Visible ONLY for Authenticated Users */}
              {Boolean(isLoggedIn && userData) && (
                <DealsPdfButton />
              )}

              {/* User Account / Login Dropdown (Replaces hamburger icon button) */}
              <div
                className="relative hidden sm:block"
                ref={accountMenuRef}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className={`${HEADER_ACTION_LINK_CLASS} min-w-[48px] md:min-w-[52px] focus:outline-none cursor-pointer`}
                  aria-label={isAuthenticated ? "Account Menu" : "Login"}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="true"
                  title={isAuthenticated ? (userData?.name || userData?.mobile || "Account") : "Login / Sign In"}
                >
                  <div
                    className={`${HEADER_ACTION_ICON_WRAP_CLASS} ${
                      isAccountMenuOpen ? "!border-[#ED1C24] !bg-[#FFF200] !text-[#C4161D] shadow-[0_4px_10px_rgba(215,40,40,0.18)]" : ""
                    }`}
                  >
                    <FiUser size={18} strokeWidth={1.75} />
                  </div>
                  <span className={`text-[10px] ${HEADER_ACTION_LABEL_CLASS} max-w-[62px] truncate`} suppressHydrationWarning>
                    {isAuthenticated ? userDisplayName : 'Login'}
                  </span>
                </button>

                {isAccountMenuOpen && (
                  <div
                    className="absolute right-0 top-full pt-2 z-50 transition-all duration-200"
                    style={{ minWidth: "220px" }}
                  >
                    <div className="w-56 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {isAuthenticated ? (
                        /* Logged-In User Menu */
                        <>
                          <div className="p-3 bg-gradient-to-r from-red-50/80 to-amber-50/50 border-b border-gray-100">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Signed In As</p>
                            <p className="text-[13px] font-bold text-gray-900 truncate mt-0.5">
                              {userData.name || userData.username || "My Account"}
                            </p>
                            {(userData.mobile || userData.email) && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {userData.mobile || userData.email}
                              </p>
                            )}
                          </div>

                          <div className="py-1.5">
                            {isAdmin && (
                              <Link
                                href="/admin/dashboard"
                                onClick={() => setIsAccountMenuOpen(false)}
                                className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                  <FaUserShield size={14} />
                                </span>
                                <span className="text-[13px] font-medium">Admin Panel</span>
                              </Link>
                            )}

                            <Link
                              href="/profile"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <FiUser size={15} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">My Profile</span>
                            </Link>

                            <Link
                              href="/orders"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <HiOutlineShoppingBag size={15} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">My Orders</span>
                            </Link>

                            <Link
                              href="/address"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <FiMapPin size={15} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">My Addresses</span>
                            </Link>

                            <div className="h-px bg-gray-100 my-1 mx-2" />

                            <Link
                              href="/loyalty"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <HiOutlineGift size={16} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">Loyalty</span>
                            </Link>

                            <Link
                              href="/brands"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <HiOutlineTag size={16} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">All Brands</span>
                            </Link>

                            <div className="h-px bg-gray-100 my-1 mx-2" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-white hover:bg-[#ED1C24] transition-colors group/item cursor-pointer text-left"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 group-hover/item:bg-white group-hover/item:text-[#ED1C24] transition-colors">
                                <IoLogOut size={16} />
                              </span>
                              <span className="text-[13px] font-medium">Logout</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Guest State with Sign In Button */
                        <>
                          <div className="p-3 bg-gradient-to-r from-red-50/80 to-amber-50/50 border-b border-gray-100">
                            <p className="text-[11px] text-gray-600 font-medium">Welcome to Sathya Store</p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                setShowAuthModal(true);
                              }}
                              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
                            >
                              <FiUser size={14} />
                              <span>Sign In / Register</span>
                            </button>
                          </div>

                          <div className="py-1.5">
                            <Link
                              href="/loyalty"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <HiOutlineGift size={16} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">Loyalty</span>
                            </Link>

                            <div className="h-px bg-gray-100 my-1 mx-2" />

                            <Link
                              href="/brands"
                              onClick={() => setIsAccountMenuOpen(false)}
                              className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:text-brandRed hover:bg-red-50/80 transition-colors group/item"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-brandRed group-hover/item:bg-brandRed group-hover/item:text-white transition-colors">
                                <HiOutlineTag size={16} strokeWidth={1.8} />
                              </span>
                              <span className="text-[13px] font-medium">All Brands</span>
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Mobile Menu (Hidden on desktop) */}
          {isMobileMenuOpen && (
            <div className="sm:hidden bg-white fixed inset-0 z-50 p-4 pt-3 rounded-lg shadow-lg overflow-y-auto transition-all duration-300"
              style={{ touchAction: 'auto', userSelect: 'auto', WebkitUserSelect: 'auto' }}
            >
              {/* Internal sticky header */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2 border-b">
                <div className="flex items-center gap-2 text-brandRed font-semibold text-sm">
                  <FiMenu size={18} />
                  <span>Menu</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-full text-brandRed hover:bg-red-50 active:bg-red-100 focus:outline-none focus:ring focus:ring-red-200"
                >
                  <FiX size={22} />
                </button>
              </div>

              {/* Mobile User Account Header (Replaces hidden top bar profile icon) */}
              <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-red-50/80 to-amber-50/50 border border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#d72828] text-white flex items-center justify-center flex-shrink-0">
                    <FiUser size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {isAuthenticated ? (userData?.name || userData?.username || (userData?.mobile ? `User (${userData.mobile})` : "My Account")) : "My Account"} 
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {isAuthenticated ? (userData?.mobile || userData?.email || "Manage profile") : "Login to view orders & offers"}
                    </p>
                  </div>
                </div>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push('/profile');
                    }}
                    className="text-[11px] font-bold text-[#d72828] hover:underline flex-shrink-0 ml-2"
                  >
                    Profile →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="text-[11px] font-bold px-3 py-1 rounded-md bg-[#d72828] text-white shadow-xs flex-shrink-0 ml-2"
                  >
                    Login
                  </button>
                )}
              </div>

              {/* Mobile Logged-in User Quick Actions */}
              {isAuthenticated && (
                <div className="mb-3 p-2 bg-gradient-to-r from-red-50/50 via-white to-amber-50/40 rounded-xl border border-gray-100 flex items-center justify-around text-center text-xs">
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex flex-col items-center gap-1 text-gray-700 hover:text-brandRed py-1 px-1.5"
                  >
                    <FiUser size={16} className="text-brandRed" />
                    <span className="text-[11px] font-medium">Profile</span>
                  </Link>
                  <div className="w-px h-6 bg-gray-200" />
                  <Link
                    href="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex flex-col items-center gap-1 text-gray-700 hover:text-brandRed py-1 px-1.5"
                  >
                    <HiOutlineShoppingBag size={16} className="text-brandRed" />
                    <span className="text-[11px] font-medium">Orders</span>
                  </Link>
                  <div className="w-px h-6 bg-gray-200" />
                  <Link
                    href="/address"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex flex-col items-center gap-1 text-gray-700 hover:text-brandRed py-1 px-1.5"
                  >
                    <FiMapPin size={16} className="text-brandRed" />
                    <span className="text-[11px] font-medium">Addresses</span>
                  </Link>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex flex-col items-center gap-1 text-red-600 hover:text-red-700 py-1 px-1.5 cursor-pointer"
                  >
                    <IoLogOut size={16} />
                    <span className="text-[11px] font-medium">Logout</span>
                  </button>
                </div>
              )}

              {/* Featured Mobile Navigation Cards (Loyalty, All Brands, Store, Contact) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Link
                  href="/loyalty"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#ED1C24]/20 bg-gradient-to-b from-[#fffdf5] to-white p-2.5 text-[#ED1C24] shadow-sm active:scale-95 transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF200]/70 text-[#C4161D] shrink-0">
                    <HiOutlineGift size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold leading-tight">Loyalty</span>
                    <span className="text-[10px] text-gray-500 font-normal truncate">Rewards & Points</span>
                  </div>
                </Link>

                <Link
                  href="/brands"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#ED1C24]/20 bg-gradient-to-b from-[#fffdf5] to-white p-2.5 text-[#ED1C24] shadow-sm active:scale-95 transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF200]/70 text-[#C4161D] shrink-0">
                    <HiOutlineTag size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold leading-tight">All Brands</span>
                    <span className="text-[10px] text-gray-500 font-normal truncate">Official Partners</span>
                  </div>
                </Link>

                <a
                  href="https://sathya.adtarbo.com/stores"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#ED1C24]/20 bg-gradient-to-b from-[#fffdf5] to-white p-2.5 text-[#ED1C24] shadow-sm active:scale-95 transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF200]/70 text-[#C4161D] shrink-0">
                    <HiOutlineBuildingStorefront size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold leading-tight">Stores</span>
                    <span className="text-[10px] text-gray-500 font-normal truncate">Find Nearby</span>
                  </div>
                </a>

                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#ED1C24]/20 bg-gradient-to-b from-[#fffdf5] to-white p-2.5 text-[#ED1C24] shadow-sm active:scale-95 transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF200]/70 text-[#C4161D] shrink-0">
                    <HiOutlinePhone size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold leading-tight">Contact</span>
                    <span className="text-[10px] text-gray-500 font-normal truncate">Customer Support</span>
                  </div>
                </Link>
              </div>

              {/* Mobile Category Block (accordion) */}
              <div className=" bg-white rounded-md border border-gray-200 overflow-hidden">
                <div
                  className="text-white bg-[#ED1C24]"
                  style={{ borderTop: "4px solid #FFF200" }}
                >
                  <div className="px-3 py-4 text-[14px] font-semibold tracking-wide">
                    Browse Category
                  </div>
                </div>
                {/* Use unified nodes (categories + hoveredCategory subcategories when available) */}
                {Array.isArray(nodes) && nodes.length > 0 ? (
                  renderCategoryLevel(nodes, [], 0)
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500">
                    Loading categories…
                  </div>
                )}
              </div>
              {/* Deals & Special Offers Link — hidden when offer timer is active for this state */}
              {showDealsButton && (
                <div className="mt-3">
                  <Link
                    href="/deals-offer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 shadow-xs text-black font-bold text-xs transition-transform active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #00b4db 0%, #f44336 55%, #ffc107 100%)",
                    }}
                    title="View Deals & Special Offers"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🔥</span>
                      <span className="tracking-wide">Deals & Special Offers</span>
                    </span>
                    <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white font-semibold">View →</span>
                  </Link>
                </div>
              )}
            </div>
          )}
          {/* Auth Modal — Phone + OTP */}
          {showAuthModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 w-96 max-w-full relative">
                <button onClick={() => { setShowAuthModal(false); setOtpStep(1); setOtpMobile(''); setOtpValue(''); setOtpError(''); }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl">
                  &times;
                </button>

                <h2 className="text-xl font-semibold mb-1 text-gray-800">
                  {otpStep === 1 ? 'Login / Register' : 'Verify OTP'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {otpStep === 1
                    ? 'Enter your mobile number to continue'
                    : `We've sent an OTP to ${otpMobile}`}
                </p>

                {otpStep === 1 ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number</label>
                      <div className="flex items-center border rounded focus-within:ring-2 focus-within:ring-red-500 overflow-hidden">
                        <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r">+91</span>
                        <input
                          type="tel"
                          placeholder="Enter 10-digit number"
                          value={otpMobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setOtpMobile(val);
                            if (otpError) setOtpError('');
                          }}
                          className="flex-1 px-4 py-2 focus:outline-none text-sm"
                          maxLength={10}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {otpError && (
                      <div className="text-red-500 text-sm">{otpError}</div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingAuth}
                      className="w-full bg-red-500 text-white py-2.5 px-4 rounded hover:bg-brandRedDark disabled:bg-gray-400 transition-colors duration-200 font-medium"
                    >
                      {loadingAuth ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Enter OTP</label>
                      <input
                        type="text"
                        placeholder="Enter 4-digit OTP"
                        value={otpValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setOtpValue(val);
                          if (otpError) setOtpError('');
                        }}
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
                        maxLength={4}
                        required
                        autoFocus
                      />
                    </div>

                    {otpError && (
                      <div className="text-red-500 text-sm">{otpError}</div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingAuth}
                      className="w-full bg-red-500 text-white py-2.5 px-4 rounded hover:bg-brandRedDark disabled:bg-gray-400 transition-colors duration-200 font-medium"
                    >
                      {loadingAuth ? 'Verifying...' : 'Verify & Login'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setOtpStep(1); setOtpValue(''); setOtpError(''); }}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                    >
                      ← Change mobile number
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96 max-w-full relative">
                <button onClick={() => setShowForgotPasswordModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                {/* STEP 1: Enter Email */}
                {forgotStep === 1 && (
                  <>
                    <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
                    <form onSubmit={async (e) => {
                      e.preventDefault(); setForgotPasswordError(''); setForgotPasswordMessage(''); setForgotPasswordLoading(true);
                      try {
                        const res = await fetch('/api/auth/request-reset', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: forgotPasswordEmail }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || 'Error sending OTP');
                        setForgotPasswordMessage('OTP sent to your email.');
                        setForgotStep(2);
                      } catch (err) {
                        setForgotPasswordError(err.message);
                      } finally {
                        setForgotPasswordLoading(false);
                      }
                    }} className="space-y-4">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brandRed"
                      />
                      {forgotPasswordError && (
                        <p className="text-red-500 text-sm">{forgotPasswordError}</p>
                      )}
                      {forgotPasswordMessage && (
                        <p className="text-green-500 text-sm">{forgotPasswordMessage}</p>
                      )}
                      <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="w-full bg-red-500 text-white py-2 rounded hover:bg-brandRedDark disabled:bg-gray-400"
                      >
                        {forgotPasswordLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </form>
                  </>
                )}

                {/* STEP 2: Enter OTP */}
                {forgotStep === 2 && (
                  <>
                    <h2 className="text-lg font-semibold mb-4">Enter OTP</h2>
                    <p className="text-sm mb-2">Email: <strong>{forgotPasswordEmail}</strong></p>
                    <form onSubmit={async (e) => {
                      e.preventDefault(); setForgotPasswordError(''); setForgotPasswordMessage('');
                      if (!forgotOTP.trim()) {
                        setForgotPasswordError('Please enter OTP.');
                        return;
                      }
                      setForgotPasswordLoading(true);
                      try {
                        const res = await fetch('/api/auth/verify-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: forgotPasswordEmail,
                            otp: forgotOTP,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || 'Invalid OTP');
                        setForgotPasswordMessage('OTP verified. Please set your new password.');
                        setForgotStep(3);
                      } catch (err) {
                        setForgotPasswordError(err.message);
                      } finally {
                        setForgotPasswordLoading(false);
                      }
                    }} className="space-y-4">
                      <input type="text" placeholder="Enter OTP" value={forgotOTP} onChange={(e) => setForgotOTP(e.target.value)} required className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brandRed" />
                      {forgotPasswordError && (
                        <p className="text-red-500 text-sm">{forgotPasswordError}</p>
                      )}
                      {forgotPasswordMessage && (
                        <p className="text-green-500 text-sm">{forgotPasswordMessage}</p>
                      )}
                      <button type="submit" disabled={forgotPasswordLoading} className="w-full bg-red-500 text-white py-2 rounded hover:bg-brandRedDark disabled:bg-gray-400">
                        {forgotPasswordLoading ? 'Validating...' : 'Validate OTP'}
                      </button>
                    </form>
                  </>
                )}
                {/* STEP 3: New Password */}
                {forgotStep === 3 && (
                  <>
                    <h2 className="text-lg font-semibold mb-4">Set New Password</h2>
                    <p className="text-sm mb-2">Email: <strong>{forgotPasswordEmail}</strong></p>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setForgotPasswordError('');
                      setForgotPasswordMessage('');
                      if (newPassword !== confirmPassword) {
                        setForgotPasswordError('Passwords do not match.');
                        return;
                      }
                      setForgotPasswordLoading(true);
                      try {
                        const res = await fetch('/api/auth/reset-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: forgotPasswordEmail,
                            otp: forgotOTP,
                            newPassword,
                          }),
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || 'Error resetting password');

                        setForgotPasswordMessage('Password reset successful.');
                        setTimeout(() => {
                          setShowForgotPasswordModal(false);
                          setShowAuthModal(true); // reopen login
                        }, 1500);
                      } catch (err) {
                        setForgotPasswordError(err.message);
                      } finally {
                        setForgotPasswordLoading(false);
                      }
                    }} className="space-y-4">
                      <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brandRed" />
                      <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brandRed" />
                      {forgotPasswordError && (
                        <p className="text-red-500 text-sm">{forgotPasswordError}</p>
                      )}
                      {forgotPasswordMessage && (
                        <p className="text-green-500 text-sm">{forgotPasswordMessage}</p>
                      )}
                      <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="w-full bg-red-500 text-white py-2 rounded hover:bg-brandRedDark disabled:bg-gray-400"
                      >
                        {forgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Category listing bar — red bar with yellow line on top (Sathya brand) */}
        <div
          className="hidden sm:flex relative w-full min-h-[56px] items-center bg-[#ED1C24] shadow"
          style={{ borderTop: "4px solid #FFF200" }}
        >
          {menuButtonEnabled && (
            <div
              className="relative flex-shrink-0 self-stretch pl-10 md:pl-14"
              data-sathya-menu-toggle
              onMouseEnter={() => {
                if (menuHoverLeaveTimer.current) {
                  clearTimeout(menuHoverLeaveTimer.current);
                  menuHoverLeaveTimer.current = null;
                }
                setShowMenu(true);
                cancelHide();
                setHoveredCategory(null);
                setActiveSubCategory(null);
              }}
              onMouseLeave={() => {
                if (menuHoverLeaveTimer.current) clearTimeout(menuHoverLeaveTimer.current);
                menuHoverLeaveTimer.current = setTimeout(() => {
                  setShowMenu(false);
                  menuHoverLeaveTimer.current = null;
                }, 200);
              }}
            >
              <button
                type="button"
                className="h-full self-stretch px-4 md:px-5 flex items-center gap-2.5 text-white font-bold text-base bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent"
                aria-label="Open menu"
                aria-expanded={showMenu}
                onClick={() => {
                  // Touch / keyboard: toggle. Desktop opens on hover.
                  setShowMenu((prev) => !prev);
                  cancelHide();
                  setHoveredCategory(null);
                  setActiveSubCategory(null);
                }}
              >
                <FiMenu size={18} strokeWidth={2.5} />
                <span>Menu</span>
              </button>
              <HeaderMenuSidebar
                open={showMenu}
                onClose={() => setShowMenu(false)}
                categories={categories}
                resolveCategoryHref={resolveCategoryNavHref}
                showDealsButton={showDealsButton}
              />
            </div>
          )}
          <div className="w-full relative min-w-0">
            <div className="relative">
              <div className="flex justify-center overflow-x-auto scrollbar-hide">
                <Swiper
                  modules={[Navigation]}
                  navigation={{ prevEl: ".custom-swiper-prev", nextEl: ".custom-swiper-next" }}
                  spaceBetween={20}
                  slidesPerView="auto"
                  watchOverflow={true}
                  observer={true}
                  observeParents={true}
                  className="pl-10 pr-14"
                >
                  {redBarEntries.map((entry) => {
                    if (entry.kind === "custom") return (
                    <SwiperSlide key={`custom-${entry.key}`} className="!w-auto">
                      <div
                        onMouseEnter={() => { cancelHide(); setHoveredCategory(null); }}
                        className="px-2 py-2 flex flex-col items-center text-center"
                      >
                        {/^https?:\/\//i.test(entry.href) ? (
                          <a
                            href={entry.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-white hover:text-[#FFF200] whitespace-nowrap"
                          >
                            {entry.label}
                          </a>
                        ) : (
                          <Link
                            href={entry.href}
                            className="text-sm font-bold text-white hover:text-[#FFF200] whitespace-nowrap"
                          >
                            {entry.label}
                          </Link>
                        )}
                      </div>
                    </SwiperSlide>
                    );
                    const { category } = entry;
                    return (
                    <SwiperSlide key={entry.key} className="!w-auto">
                      <div ref={(el) => (slideRefs.current[category._id] = el)} onMouseEnter={() => handleMouseEnter(category._id, category)} onMouseLeave={() => startHide(120)} className="px-2 py-2 flex flex-col items-center text-center" >
                        <Link
                          href={resolveCategoryNavHref([category.category_slug], category._id, 0)}
                          onClick={(e) => {
                            // Ensure latest availability is used even if Swiper cached the slide href.
                            e.preventDefault();
                            if (hideTimeout.current) {
                              clearTimeout(hideTimeout.current);
                              hideTimeout.current = null;
                            }
                            setHoveredCategory(null);
                            setActiveSubCategory(null);
                            handleCategoryClick(
                              category.category_slug,
                              category.category_name,
                              category._id
                            );
                          }}
                          className="text-sm font-bold text-white hover:text-[#FFF200] whitespace-nowrap"
                        >
                          {entry.label}
                        </Link>

                      </div>
                    </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </div>
          </div>
        </div>

        {hoveredCategory && hoveredCategory.subcategories?.length > 0 && (() => {
          const isSingleSub = (hoveredCategory.subcategories || []).length <= 1;
          return (
            <div
              ref={dropdownRef}
              className="fixed z-50 bg-white"
              style={{
                top: `${dropdownTop}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'fit-content',
                minWidth: isSingleSub ? 'unset' : '800px',
                maxWidth: '96vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                minHeight: isSingleSub ? '370px' : '420px',
              }}
              onMouseEnter={cancelHide}
              onMouseLeave={() => startHide(120)}
            >
              <style>{`
        .dd-sidebar::-webkit-scrollbar { display: none; }
        .dd-sidebar { -ms-overflow-style: none; scrollbar-width: none; }
        .dd-brands::-webkit-scrollbar { width: 3px; }
        .dd-brands::-webkit-scrollbar-thumb { background: #ED1C24; border-radius: 2px; }
        .dd-brands::-webkit-scrollbar-track { background: #f1f1f1; }
        .dd-sub-scroll { overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #ED1C24 #f1f1f1; }
        .dd-sub-scroll::-webkit-scrollbar { width: 3px; }
        .dd-sub-scroll::-webkit-scrollbar-thumb { background: #ED1C24; border-radius: 2px; }
        .dd-sub-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
        .dd-child-link { display:block; font-size:13px; color:#374151; text-decoration:none; padding:5px 8px; border-radius:4px; white-space:normal; line-height:1.35; transition: color 0.1s, background 0.1s; }
        .dd-child-link:hover { color:#ED1C24; background:#FEF2F2; }
        .dd-brand-item { display:flex; align-items:center; justify-content:center; padding:5px 6px; border:none; border-radius:6px; text-decoration:none; transition: background 0.1s; }
        .dd-brand-item:hover { background:#FEF2F2; }
      `}</style>

              <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: isSingleSub ? '370px' : '420px' }}>

                {/* ── LEFT SIDEBAR ── */}
                <div
                  className="dd-sidebar"
                  style={{
                    width: '220px',
                    flexShrink: 0,
                    borderRight: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: 'stretch',
                    background: '#fff',
                  }}
                >
                  <div style={{
                    padding: '10px 16px',
                    fontSize: '13px', fontWeight: 700, color: '#C4161D',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    borderBottom: 'none', flexShrink: 0,
                    paddingTop: "16px"
                  }}>
                    Shop by Category
                  </div>

                  <div className="dd-sidebar" style={{ flex: 1, overflowY: 'auto' }}>
                    {[...hoveredCategory.subcategories]
                      .sort(sortByCategoryPosition)
                      .map((sub) => {
                        const isActive = activeSubCategory?._id === sub._id;
                        return (
                          <div
                            key={sub._id}
                            id={`dd-left-${sub._id}`}
                            onClick={() => {
                              setActiveSubCategory(sub);
                              const el = document.getElementById(`dd-left-${sub._id}`);
                              if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 16px', cursor: 'pointer',
                              background: isActive ? '#FEF2F2' : '#fff',
                              borderBottom: 'none',
                              transition: 'background 0.1s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {(() => {
                                const iconSrc = sub.icon_url || sub.image;
                                return iconSrc ? (
                                  <img
                                    src={iconSrc}
                                    alt={sub.category_name || ''}
                                    style={{
                                      width: 30,
                                      height: 30,
                                      objectFit: 'contain',
                                      flexShrink: 0,
                                      filter: 'brightness(0) saturate(100%) invert(18%) sepia(87%) saturate(3500%) hue-rotate(347deg) brightness(87%) contrast(96%)',
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: 24, height: 24, borderRadius: '4px',
                                    background: '#FEE2E2', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', flexShrink: 0,
                                  }}>
                                    <span style={{ fontSize: '10px', color: '#BC2121', fontWeight: 700 }}>
                                      {(sub.category_name || '').charAt(0)}
                                    </span>
                                  </div>
                                );
                              })()}
                              <Link
                                href={resolveCategoryNavHref(
                                  [hoveredCategory.category_slug, sub.category_slug],
                                  sub._id,
                                  1
                                )}
                                style={{
                                  fontSize: '13px',
                                  fontWeight: isActive ? 700 : 600,
                                  color: isActive ? '#BC2121' : '#BC2121',
                                  textDecoration: 'none', lineHeight: 1.3,
                                }}
                              >
                                {splitByNearestSpace(sub.category_name, 24)}
                              </Link>
                            </div>
                            <FiChevronRight size={13} style={{ color: isActive ? '#BC2121' : '#d1d5db', flexShrink: 0 }} />
                          </div>
                        );
                      })}
                    <div style={{ padding: '10px 16px' }}>
                      <Link
                        href={resolveCategoryNavHref(
                          [hoveredCategory.category_slug],
                          hoveredCategory._id,
                          0
                        )}
                        onClick={() => setHoveredCategory(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '13px', fontWeight: 600, color: '#ED1C24', textDecoration: 'none',
                        }}
                      >
                        View All {hoveredCategory.category_name}
                        <FiChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT CONTENT AREA ── */}
                {(() => {
                  const ROWS_VISIBLE = 7;
                  const ROW_HEIGHT_PX = 28;
                  const brands = hoveredCategory.brands || [];
                  const navImgs = hoveredCategory?.navImage
                    ? (typeof hoveredCategory.navImage === 'string'
                      ? hoveredCategory.navImage.split(',').map(s => s.trim()).filter(Boolean)
                      : Array.isArray(hoveredCategory.navImage) ? hoveredCategory.navImage : [])
                    : [];
                  const activeSub = activeSubCategory;
                  // Children if any; otherwise brand names for that subcategory (e.g. Audio)
                  const getSubListItems = (sub) => {
                    const children = Array.isArray(sub?.subcategories) && sub.subcategories.length > 0
                      ? [...sub.subcategories].sort(sortByCategoryPosition)
                      : [];
                    if (children.length > 0) {
                      return children.map((child) => ({
                        key: child._id,
                        label: child.category_name,
                        href: resolveCategoryNavHref(
                          [
                            hoveredCategory.category_slug,
                            sub.category_slug,
                            child.category_slug,
                          ],
                          child._id,
                          2
                        ),
                        kind: 'child',
                      }));
                    }
                    const subBrands = Array.isArray(sub?.brands) && sub.brands.length > 0
                      ? sub.brands
                      : brands;
                    return [...subBrands]
                      .sort((a, b) => alphaSortString(a.brand_name, b.brand_name))
                      .map((brand) => ({
                        key: brand._id || brand.brand_slug,
                        label: brand.brand_name,
                        href: resolveCategoryBrandNavHref(
                          hoveredCategory.category_slug,
                          brand,
                          hoveredCategory._id
                        ),
                        kind: 'brand',
                      }));
                  };
                  const renderListColumn = (items, key, opts = {}) => {
                    const needsScroll = items.length > ROWS_VISIBLE;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          minWidth: '180px',
                          maxWidth: '220px',
                          borderRight: opts.showBorder ? '1px solid #e5e7eb' : 'none',
                          paddingRight: opts.showBorder ? '16px' : '0',
                          paddingLeft: opts.padLeft ? '16px' : '0',
                          alignSelf: 'flex-start',
                        }}
                      >
                        {opts.header}
                        <div
                          className={needsScroll ? 'dd-sub-scroll' : undefined}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: needsScroll ? `${ROWS_VISIBLE * ROW_HEIGHT_PX}px` : undefined,
                          }}
                        >
                          {items.map((item) => (
                            <Link
                              key={item.key}
                              href={item.href}
                              onClick={() => setHoveredCategory(null)}
                              className="dd-child-link"
                            >
                              {splitByNearestSpace(item.label, 24)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  };
                  const renderBrands = () => brands.length > 0 && (
                    <div style={{
                      marginTop: isSingleSub ? '16px' : 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid #e5e7eb',
                      flexShrink: 0,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        fontSize: '11px', fontWeight: 700, color: '#C4161D',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
                      }}>
                        Top Brands
                      </div>
                      <div className="dd-brands" style={{
                        display: 'grid',
                        gridTemplateColumns: isSingleSub ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(5, minmax(80px, 1fr))',
                        gridTemplateRows: 'repeat(2, auto)',
                        gap: '8px 16px',
                        alignItems: 'center',
                        justifyItems: 'start',
                      }}>
                        {[...brands]
                          .sort((a, b) => alphaSortString(a.brand_name, b.brand_name))
                          .slice(0, 10)
                          .map((brand) => (
                            <Link
                              key={brand._id || brand.brand_slug}
                              href={resolveCategoryBrandNavHref(
                                hoveredCategory.category_slug,
                                brand,
                                hoveredCategory._id
                              )}
                              onClick={() => setHoveredCategory(null)}
                              className="dd-brand-item"
                            >
                              {brand.image ? (
                                <img
                                  src={`/uploads/Brands/${brand.image}`}
                                  alt={brand.brand_name}
                                  style={{ height: '32px', maxWidth: '80px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <span
                                style={{
                                  display: brand.image ? 'none' : 'block',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#374151'
                                }}
                              >
                                {brand.brand_name}
                              </span>
                            </Link>
                          ))}
                        {brands.length > 10 && (
                          <Link
                            href={resolveCategoryNavHref(
                              [hoveredCategory.category_slug],
                              hoveredCategory._id,
                              0
                            )}
                            onClick={() => setHoveredCategory(null)}
                            style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '5px 6px', fontSize: '11px', fontWeight: 600, color: '#ED1C24', textDecoration: 'none' }}
                          >
                            +{brands.length - 10} more <FiChevronRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: isSingleSub ? '370px' : '420px' }}>
                      <div style={{ flex: 1, padding: '16px 20px', minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: isSingleSub ? '370px' : '420px' }}>
                        {activeSub ? (
                          <div style={{ flex: 1, minHeight: 0 }}>
                            <>
                              <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: 'none' }}>
                                <Link
                                  href={resolveCategoryNavHref(
                                    [hoveredCategory.category_slug, activeSub.category_slug],
                                    activeSub._id,
                                    1
                                  )}
                                  onClick={() => setHoveredCategory(null)}
                                  style={{
                                    fontSize: '13px', fontWeight: 700, color: '#ED1C24',
                                    textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em',
                                    whiteSpace: 'normal', lineHeight: 1.35,
                                  }}
                                >
                                  {splitByNearestSpace(activeSub.category_name, 24)}
                                </Link>
                              </div>
                              {(() => {
                                const activeItems = getSubListItems(activeSub);
                                if (isSingleSub) {
                                  const chunks = [];
                                  for (let i = 0; i < activeItems.length; i += ROWS_VISIBLE) {
                                    chunks.push(activeItems.slice(i, i + ROWS_VISIBLE));
                                  }
                                  const columnChunks = chunks.length > 0 ? chunks.slice(0, 3) : [[]];
                                  return (
                                    <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                                      {columnChunks.map((chunkItems, ci) =>
                                        renderListColumn(
                                          ci === columnChunks.length - 1 && chunks.length > columnChunks.length
                                            ? activeItems.slice(ci * ROWS_VISIBLE)
                                            : chunkItems,
                                          `${activeSub._id}-col-${ci}`,
                                          {
                                            showBorder: ci < columnChunks.length - 1,
                                            padLeft: ci > 0,
                                          }
                                        )
                                      )}
                                    </div>
                                  );
                                }
                                const otherSubs = [...hoveredCategory.subcategories]
                                  .sort(sortByCategoryPosition)
                                  .filter((s) => s._id !== activeSub._id)
                                  .slice(0, 3);
                                return (
                                  <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                                    {renderListColumn(activeItems, activeSub._id, {
                                      showBorder: otherSubs.length > 0,
                                      padLeft: false,
                                    })}
                                    {otherSubs.map((sub, idx) => {
                                      const items = getSubListItems(sub);
                                      return renderListColumn(items, sub._id, {
                                        showBorder: idx < otherSubs.length - 1,
                                        padLeft: true,
                                        header: (
                                          <Link
                                            href={resolveCategoryNavHref(
                                              [hoveredCategory.category_slug, sub.category_slug],
                                              sub._id,
                                              1
                                            )}
                                            onClick={() => setHoveredCategory(null)}
                                            style={{
                                              fontSize: '13px', fontWeight: 700, color: '#ED1C24',
                                              textDecoration: 'none', textTransform: 'uppercase',
                                              letterSpacing: '0.04em', marginBottom: '8px',
                                              paddingBottom: '6px', borderBottom: 'none',
                                              whiteSpace: 'normal',
                                              lineHeight: 1.35,
                                            }}
                                          >
                                            {splitByNearestSpace(sub.category_name, 24)}
                                          </Link>
                                        ),
                                      });
                                    })}
                                  </div>
                                );
                              })()}
                            </>
                          </div>
                        ) : (
                          <div style={{ flex: 1, minHeight: 0 }}>
                            <>
                              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                                {isSingleSub ? (() => {
                                  const singleSub = hoveredCategory.subcategories[0];
                                  if (!singleSub) return null;
                                  const items = getSubListItems(singleSub);
                                  const chunks = [];
                                  for (let i = 0; i < items.length; i += ROWS_VISIBLE) {
                                    chunks.push(items.slice(i, i + ROWS_VISIBLE));
                                  }
                                  const columnChunks = chunks.length > 0 ? chunks.slice(0, 3) : [[]];
                                  return columnChunks.map((chunkItems, ci) =>
                                    renderListColumn(
                                      ci === columnChunks.length - 1 && chunks.length > columnChunks.length
                                        ? items.slice(ci * ROWS_VISIBLE)
                                        : chunkItems,
                                      `${singleSub._id}-col-${ci}`,
                                      {
                                        showBorder: ci < columnChunks.length - 1,
                                        padLeft: ci > 0,
                                        header: ci === 0 ? (
                                          <Link
                                            href={resolveCategoryNavHref(
                                              [hoveredCategory.category_slug, singleSub.category_slug],
                                              singleSub._id,
                                              1
                                            )}
                                            onClick={() => setHoveredCategory(null)}
                                            style={{
                                              display: 'block', fontSize: '13px', fontWeight: 700,
                                              color: '#C4161D', textDecoration: 'none',
                                              textTransform: 'uppercase', letterSpacing: '0.04em',
                                              marginBottom: '8px', paddingBottom: '6px',
                                              borderBottom: 'none',
                                              whiteSpace: 'normal',
                                              lineHeight: 1.35,
                                            }}
                                          >
                                            {splitByNearestSpace(singleSub.category_name, 24)}
                                          </Link>
                                        ) : (
                                          <div style={{ height: '27px', marginBottom: '8px', paddingBottom: '6px' }} />
                                        ),
                                      }
                                    )
                                  );
                                })() : (
                                  [...hoveredCategory.subcategories]
                                    .sort(sortByCategoryPosition)
                                    .slice(0, 4)
                                    .map((sub, si, arr) => {
                                      const items = getSubListItems(sub);
                                      return renderListColumn(items, sub._id, {
                                        showBorder: si < arr.length - 1,
                                        padLeft: si > 0,
                                        header: (
                                          <Link
                                            href={resolveCategoryNavHref(
                                              [hoveredCategory.category_slug, sub.category_slug],
                                              sub._id,
                                              1
                                            )}
                                            onClick={() => setHoveredCategory(null)}
                                            style={{
                                              display: 'block', fontSize: '13px', fontWeight: 700,
                                              color: '#C4161D', textDecoration: 'none',
                                              textTransform: 'uppercase', letterSpacing: '0.04em',
                                              marginBottom: '8px', paddingBottom: '6px',
                                              borderBottom: 'none',
                                              whiteSpace: 'normal',
                                              lineHeight: 1.35,
                                            }}
                                          >
                                            {splitByNearestSpace(sub.category_name, 24)}
                                          </Link>
                                        ),
                                      });
                                    })
                                )}
                              </div>
                            </>
                          </div>
                        )}
                        {renderBrands()}
                      </div>
                      {navImgs.length > 0 && (
                        <div style={{
                          flexShrink: 0, width: '250px', alignSelf: 'stretch',
                          borderLeft: '1px solid #e5e7eb', overflow: 'hidden',
                        }}>
                          <Link
                            href={resolveCategoryNavHref(
                              [hoveredCategory.category_slug],
                              hoveredCategory._id,
                              0
                            )}
                            onClick={() => setHoveredCategory(null)}
                            style={{ display: 'block', width: '100%', height: '100%' }}
                          >
                            <img
                              src={navImgs[0]}
                              alt={hoveredCategory.category_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>
          );
        })()}
      </header>
      {/* DESKTOP SUGGESTIONS DROPDOWN */}
      {searchDropdownVisible && searchContext === 'desktop' && (
        <div
          ref={searchDropdownRef}
          className="hidden sm:flex flex-col fixed z-[9999] bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden"
          style={{
            top: `${searchDropdownTop}px`,
            left: `${searchDropdownLeft}px`,
            width: `${Math.max(searchDropdownWidth, 360)}px`,
            maxHeight: '520px'
          }}
          role="listbox"
          aria-label="Search product suggestions"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5 border-b border-gray-100 bg-gray-50/70 select-none">
            <span className="text-[11px] font-bold tracking-[0.12em] text-gray-500 uppercase">
              Products {searchTotal > 0 ? `(${suggestions.length} of ${searchTotal})` : ''}
            </span>
            {isLoadingSuggestions && (
              <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 border-2 border-brandRed border-t-transparent rounded-full animate-spin"></span>
                Searching...
              </span>
            )}
          </div>

          {/* List Area */}
          <div className="px-3 py-2.5 overflow-y-auto custom-scrollbar space-y-2 max-h-[420px]">
            {isLoadingSuggestions ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse bg-gray-50 rounded-lg">
                    <div className="w-[50px] h-[50px] rounded-md bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-3.5 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="py-8 px-4 text-center">
                <p className="text-sm font-medium text-red-600 mb-2">{searchError}</p>
                <button
                  type="button"
                  onClick={() => fetchSuggestions(searchQuery, selectedCategory, 1, false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Retry Search
                </button>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                {suggestions.map(renderDesktopSuggestionItem)}

                {/* Loading more skeleton indicator */}
                {isLoadingMore && (
                  <div className="space-y-2 pt-1">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse bg-gray-50 rounded-lg">
                        <div className="w-[50px] h-[50px] rounded-md bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                          <div className="h-3.5 bg-gray-200 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Button */}
                {searchHasMore && !isLoadingMore && (
                  <div className="px-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="w-full py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      Load more products ({suggestions.length} of {searchTotal})
                    </button>
                  </div>
                )}

                {/* Full search button */}
                <div className="px-1 pt-1 pb-1">
                  <button
                    type="button"
                    onClick={(e) => handleSearch(e)}
                    className="w-full py-2.5 text-sm font-semibold text-brandRed border border-brandRed rounded-lg hover:bg-red-50 transition-colors"
                  >
                    See all {searchTotal > 0 ? searchTotal : ''} results for &ldquo;{searchQuery.trim()}&rdquo;
                  </button>
                </div>
              </>
            ) : (
              searchQuery.trim().length >= 2 && (
                <div className="py-10 flex flex-col items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">No products found for &ldquo;{searchQuery.trim()}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-1">Try checking the spelling or use a different keyword</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {dropdownOpen && userData && profileMenuPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={profileDropdownRef}
          className={`bg-white rounded-xl shadow-xl border border-gray-100 ${profileMenuPos.isMobile ? 'w-40 rounded-md' : 'w-48 sm:w-56'
            }`}
          style={{
            position: 'fixed',
            top: profileMenuPos.top,
            right: profileMenuPos.right,
            zIndex: 9999,
          }}
        >
          {profileMenuPos.isMobile ? (
            <>
              {isAdmin && (
                <Link href="/admin/dashboard" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs hover:bg-red-50">
                  Admin Panel
                </Link>
              )}
              <Link href="/profile" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs hover:bg-red-50">
                My Profile
              </Link>
              <Link href="/address" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs hover:bg-red-50">
                My Addresses
              </Link>
              <Link href="/orders" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs hover:bg-red-50">
                My Orders
              </Link>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50">
                Logout
              </button>
            </>
          ) : (
            <div className="py-2 px-1">
              {isAdmin && (
                <Link href="/admin/dashboard" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-brandRed transition-colors">
                  Admin Panel
                </Link>
              )}
              <Link href="/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-brandRed transition-colors">
                My Profile
              </Link>
              <Link href="/address" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-brandRed transition-colors">
                My Addresses
              </Link>
              <Link href="/orders" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-brandRed transition-colors">
                My Orders
              </Link>
              <hr className="my-1 border-gray-200" />
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-brandRed transition-colors">
                Logout
              </button>
            </div>
          )}

        </div>,
        document.body
      )}
    </>
  );
};
export default Header;