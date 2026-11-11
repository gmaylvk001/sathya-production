// context/CompareContext.js
//
// Compare feature state management.
//
// Routing logic:
//   - Guest (no localStorage 'token'): state lives entirely in localStorage
//     under key 'compare_list' as Array<{ productId, category_slug }>.
//     No MongoDB writes — purely client-side until login.
//   - Logged-in user: state is fetched from / written to MongoDB via the
//     /api/compare API routes. localStorage is used as an offline-first backup
//     and for the initial merge on login.
//
// On login event: call syncOnLogin() once to merge the localStorage list into
// MongoDB, then clear the localStorage list.
//
// Design principle: The context stores only references (productId, category_slug)
// for compare management. Full product data (productData) is fetched separately
// on the /compare page — the context does NOT embed product details.

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  trackCompareAdd,
  trackCompareRemove,
  COMPARE_TOAST_ID,
  COMPARE_ERROR_TOAST_ID,
  getCompareToastPosition,
  notifyCompareSuccess,
  notifyCompareError,
} from '@/utils/compareHelpers';

export {
  COMPARE_TOAST_ID,
  COMPARE_ERROR_TOAST_ID,
  getCompareToastPosition,
  notifyCompareSuccess,
  notifyCompareError,
};

const STORAGE_KEY = 'compare_list';
const MAX_COMPARE = 4;

const CompareContext = createContext({
  compareList: [],
  loading: false,
  error: null,
  similarProducts: [],
  categoryMismatchPrompt: null,
  setSimilarProducts: () => {},
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
  confirmCategorySwitch: () => {},
  cancelCategorySwitch: () => {},
  syncOnLogin: async () => {},
  fetchFromDB: async () => {},
  showCompareToast: () => {},
  dismissCompareToast: () => {},
  compareToast: null,
});

export const CompareProvider = ({ children }) => {
  // compareList: Array<{ productId: string, category_slug: string, productData?: object }>
  const [compareList, setCompareList] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [categoryMismatchPrompt, setCategoryMismatchPrompt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce ref to prevent rapid-fire API calls
  const debounceRef = useRef({});

  // ── Compare Toast Notification State & Timer ──────────────────────────────
  const [compareToast, setCompareToast] = useState(null);
  const toastTimerRef = useRef(null);

  const dismissCompareToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setCompareToast(null);
  }, []);

  const showCompareToast = useCallback(
    (productName) => {
      // Clear any pending timer to prevent race conditions & memory leaks
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }

      setCompareToast({
        id: Date.now(),
        productName: productName || 'Product',
      });

      // Production-ready 2.5s (2500ms) auto-dismiss timer
      toastTimerRef.current = setTimeout(() => {
        dismissCompareToast();
      }, 2500);
    },
    [dismissCompareToast]
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const isLoggedIn = () => Boolean(getToken());

  /** Read from localStorage for guests */
  const readLocalList = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  /** Write to localStorage for guests */
  const writeLocalList = useCallback((list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      // Trigger cross-tab sync (mirrors WishlistContext pattern)
      localStorage.setItem('compare_updated', Date.now().toString());
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, []);

  /** Fetch the logged-in user's compare list from MongoDB */
  const fetchFromDB = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/compare', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompareList(data.items || []);
      }
    } catch (err) {
      console.error('[CompareContext] fetchFromDB failed:', err);
      // Offline-first fallback: keep current state (or load from localStorage backup)
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoggedIn()) {
      fetchFromDB();
    } else {
      // Guest: hydrate from localStorage
      setCompareList(readLocalList());
    }

    // Cross-tab sync via storage event (mirrors WishlistContext pattern)
    const handleStorageChange = (event) => {
      if (event.key === 'compare_updated') {
        if (isLoggedIn()) {
          fetchFromDB();
        } else {
          setCompareList(readLocalList());
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // Clean up toast notification timer
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      // Clean up all pending debounce timers to avoid memory leaks / stale state updates
      if (debounceRef.current) {
        Object.values(debounceRef.current).forEach((timer) => clearTimeout(timer));
        debounceRef.current = {};
      }
      // Clean up active compare notifications
      try {
        toast.dismiss(COMPARE_TOAST_ID);
        toast.dismiss(COMPARE_ERROR_TOAST_ID);
      } catch {
        // safe guard
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── isInCompare ────────────────────────────────────────────────────────────

  const isInCompare = useCallback(
    (productId) => {
      if (!productId) return false;
      return compareList.some(
        (item) => String(item.productId) === String(productId)
      );
    },
    [compareList]
  );

  // ── addToCompare ───────────────────────────────────────────────────────────

  const addToCompare = useCallback(
    async (product, options = {}) => {
      if (!product?._id) return;
      const { forceSwitch = false } = options;

      const productId = String(product._id);

      // Extract human-readable category name (avoid raw MongoDB ObjectIds)
      let cleanCategoryName = '';
      if (product.sub_category_new_name && typeof product.sub_category_new_name === 'string') {
        const top = product.sub_category_new_name.split('##')[0].trim();
        if (top && !/^[0-9a-fA-F]{24}$/.test(top)) cleanCategoryName = top;
      }
      if (!cleanCategoryName && product.category_name && !/^[0-9a-fA-F]{24}$/.test(product.category_name)) {
        cleanCategoryName = product.category_name;
      }
      if (!cleanCategoryName && product.categoryName && !/^[0-9a-fA-F]{24}$/.test(product.categoryName)) {
        cleanCategoryName = product.categoryName;
      }
      if (!cleanCategoryName && product.sub_category && !/^[0-9a-fA-F]{24}$/.test(product.sub_category)) {
        cleanCategoryName = product.sub_category;
      }
      if (!cleanCategoryName && product.category && !/^[0-9a-fA-F]{24}$/.test(product.category)) {
        cleanCategoryName = product.category;
      }

      const displayCategory = cleanCategoryName || 'Product';
      const category_id = String(product.category || product.sub_category || '');
      const category_slug = cleanCategoryName || category_id || 'General';

      // Already in list — nothing to do
      if (!forceSwitch && isInCompare(productId)) return;

      const previewData = {
        _id: productId,
        name: product.name,
        slug: product.slug,
        price: product.price,
        special_price: product.special_price,
        images: product.images,
        brand: product.brand || product.brand_name,
        category: product.category,
        sub_category: product.sub_category,
        sub_category_new_name: product.sub_category_new_name,
        category_name: displayCategory,
        category_slug: category_slug,
        category_id: category_id,
        stock_status: product.stock_status,
        quantity: product.quantity,
        key_specifications: product.key_specifications,
        filter: product.filter,
      };

      // ── Category Mismatch Check ─────────────────────────────────────────
      const activeList = isLoggedIn() ? compareList : readLocalList();
      const firstItem = activeList[0];
      const currentCatName = firstItem?.category_name || (firstItem?.productData?.sub_category_new_name ? firstItem.productData.sub_category_new_name.split('##')[0].trim() : '') || firstItem?.category_slug || '';
      const currentCatId = firstItem?.category_id || firstItem?.productData?.category || '';

      const isSameCategory = () => {
        if (!firstItem) return true;
        // Same category ID
        if (category_id && currentCatId && category_id === currentCatId) return true;
        // Same category name
        if (cleanCategoryName && currentCatName && cleanCategoryName.toLowerCase() === currentCatName.toLowerCase()) return true;
        // Fallback: if category slug matches
        if (category_slug && firstItem.category_slug && category_slug.toLowerCase() === firstItem.category_slug.toLowerCase()) return true;
        return false;
      };

      if (!forceSwitch && activeList.length > 0 && !isSameCategory()) {
        setCategoryMismatchPrompt({
          newProduct: product,
          currentCategory: currentCatName && !/^[0-9a-fA-F]{24}$/.test(currentCatName) ? currentCatName : 'Current Category',
          newCategory: displayCategory,
        });
        return;
      }

      // ── Guest flow ──────────────────────────────────────────────────────
      if (!isLoggedIn()) {
        const currentList = forceSwitch ? [] : readLocalList();

        // Validate max-4
        if (currentList.length >= MAX_COMPARE) {
          notifyCompareError('Compare list is full (max 4 products). Remove an item to add a new one.', 'compare-full-toast');
          return;
        }

        const newList = [...currentList, { productId, category_slug, category_id, category_name: displayCategory, productData: previewData }];
        writeLocalList(newList);
        setCompareList(newList);
        showCompareToast(product.name);
        trackCompareAdd({ productId, productName: product.name, category_slug: displayCategory });
        return;
      }

      // ── Logged-in flow (optimistic UI) ──────────────────────────────────
      const optimisticItem = { productId, category_slug, category_id, category_name: displayCategory, productData: previewData };
      const previousList = compareList;

      // Optimistic add or switch
      if (forceSwitch) {
        setCompareList([optimisticItem]);
      } else {
        setCompareList((prev) => [...prev, optimisticItem]);
      }
      showCompareToast(product.name);

      // Debounce rapid clicks
      clearTimeout(debounceRef.current[productId]);
      debounceRef.current[productId] = setTimeout(async () => {
        try {
          const token = getToken();
          const res = await fetch('/api/compare', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId, forceSwitch }),
          });

          const data = await res.json();

          if (!res.ok) {
            setCompareList(previousList);
            if (data.categoryMismatch) {
              setCategoryMismatchPrompt({
                newProduct: product,
                currentCategory: data.currentCategory,
                newCategory: data.newCategory,
              });
            } else {
              notifyCompareError(data.error || 'Failed to add to compare');
            }
            return;
          }

          // Sync with server-confirmed list
          setCompareList(data.items || [optimisticItem]);
          trackCompareAdd({ productId, productName: product.name, category_slug });

        } catch (err) {
          setCompareList(previousList);
          console.error('[CompareContext] addToCompare failed:', err);
        }
      }, 300);
    },
    [compareList, isInCompare, isLoggedIn, readLocalList, writeLocalList]
  );

  // ── removeFromCompare ──────────────────────────────────────────────────────

  const removeFromCompare = useCallback(
    async (productId) => {
      if (!productId) return;
      const pid = String(productId);

      // ── Guest flow ──────────────────────────────────────────────────────
      if (!isLoggedIn()) {
        const newList = readLocalList().filter((item) => String(item.productId) !== pid);
        writeLocalList(newList);
        setCompareList(newList);
        trackCompareRemove({ productId: pid, productName: '' });
        return;
      }

      // ── Logged-in flow (optimistic UI + rollback) ────────────────────────
      const previousList = compareList;
      // Optimistic remove
      setCompareList((prev) =>
        prev.filter((item) => String(item.productId) !== pid)
      );

      try {
        const token = getToken();
        const res = await fetch(`/api/compare/${pid}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Rollback on failure
          setCompareList(previousList);
          notifyCompareError('Failed to remove from compare. Please try again.');
          return;
        }

        const data = await res.json();
        // Sync with server-confirmed list
        setCompareList(data.items || []);
        trackCompareRemove({ productId: pid, productName: '' });

      } catch (err) {
        // Network failure — rollback
        setCompareList(previousList);
        console.error('[CompareContext] removeFromCompare failed:', err);
      }
    },
    [compareList, readLocalList, writeLocalList] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── clearCompare ───────────────────────────────────────────────────────────

  const clearCompare = useCallback(async () => {
    // ── Guest flow ────────────────────────────────────────────────────────
    if (!isLoggedIn()) {
      writeLocalList([]);
      setCompareList([]);
      return;
    }

    // ── Logged-in flow (optimistic UI) ────────────────────────────────────
    const previousList = compareList;
    setCompareList([]);

    try {
      const token = getToken();
      const res = await fetch('/api/compare', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setCompareList(previousList);
        notifyCompareError('Failed to clear compare list.');
      }
    } catch (err) {
      setCompareList(previousList);
      console.error('[CompareContext] clearCompare failed:', err);
    }
  }, [compareList, writeLocalList]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── syncOnLogin ────────────────────────────────────────────────────────────
  // Call this once immediately after a successful login to merge the guest's
  // localStorage compare list into MongoDB. Clears localStorage on success.

  const syncOnLogin = useCallback(async () => {
    const localList = readLocalList();
    setLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      if (localList.length > 0) {
        // Send localStorage list to the merge endpoint
        const res = await fetch('/api/compare/merge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ localList }),
        });

        if (res.ok) {
          const data = await res.json();
          setCompareList(data.items || []);
          // Clear localStorage now that DB owns the authoritative list
          writeLocalList([]);
        } else {
          // Merge failed — fall back to plain DB fetch; keep localStorage intact
          await fetchFromDB();
        }
      } else {
        // No local items — just load DB list
        await fetchFromDB();
      }
    } catch (err) {
      console.error('[CompareContext] syncOnLogin failed:', err);
      // Fallback: try loading from DB anyway
      await fetchFromDB();
    } finally {
      setLoading(false);
    }
  }, [readLocalList, writeLocalList, fetchFromDB]);

  const confirmCategorySwitch = useCallback(() => {
    if (!categoryMismatchPrompt?.newProduct) return;
    const prod = categoryMismatchPrompt.newProduct;
    setCategoryMismatchPrompt(null);
    clearCompare();
    addToCompare(prod, { forceSwitch: true });
  }, [categoryMismatchPrompt, clearCompare, addToCompare]);

  const cancelCategorySwitch = useCallback(() => {
    setCategoryMismatchPrompt(null);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <CompareContext.Provider
      value={{
        compareList,
        loading,
        error,
        similarProducts,
        categoryMismatchPrompt,
        setSimilarProducts,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        confirmCategorySwitch,
        cancelCategorySwitch,
        syncOnLogin,
        fetchFromDB,
        showCompareToast,
        dismissCompareToast,
        compareToast,
      }}
    >
      {children}

      {/* Production-Ready Isolated Compare Toast Notification */}
      <AnimatePresence>
        {compareToast && (
          <motion.div
            key={compareToast.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed z-[99999] pointer-events-auto
                       top-16 sm:top-20 left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] max-w-md
                       md:top-20 md:right-6 md:left-auto md:translate-x-0 md:w-auto md:max-w-md"
          >
            <div className="flex items-center gap-3 bg-white text-gray-800 px-4 py-3 rounded-xl shadow-2xl border border-gray-100 backdrop-blur-md">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check size={14} strokeWidth={3} />
              </div>
              <p className="text-xs sm:text-sm font-medium leading-snug flex-1 line-clamp-2">
                <span className="font-semibold text-gray-900">"{compareToast.productName}"</span> added to compare!
              </p>
              <button
                type="button"
                onClick={dismissCompareToast}
                aria-label="Close notification"
                className="p-1 -mr-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Mismatch Confirmation Dialog */}
      {categoryMismatchPrompt && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Switch Category?</h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Your compare list currently contains <span className="font-semibold text-gray-800">{categoryMismatchPrompt.currentCategory}</span> products.
              Adding this <span className="font-semibold text-gray-800">{categoryMismatchPrompt.newCategory}</span> product will clear the existing list and start a new comparison.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={cancelCategorySwitch}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Keep Existing
              </button>
              <button
                type="button"
                onClick={confirmCategorySwitch}
                className="px-4 py-2 rounded-xl bg-[#d72828] text-xs font-bold text-white hover:bg-[#b52020] transition shadow-xs cursor-pointer"
              >
                Switch & Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </CompareContext.Provider>
  );
};

export const useCompare = () => useContext(CompareContext);
