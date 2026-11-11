// components/CompareBar.jsx
//
// Upgraded 4-slot floating compare tray — Croma / Flipkart standard.
// Shows rich card slots (Image, Title, Price, Remove button),
// Unclipped fixed mini-modal picker for adding products with live search & suggestions,
// Minimum 2 products rule, and Minimize/Expand toggle.

'use client';

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompare, ArrowRight, Layers, Plus, ChevronDown, ChevronUp, Search, Loader2, Check } from 'lucide-react';
import { useCompare } from '@/context/CompareContext';
import { trackCompareView, formatBrandName } from '@/utils/compareHelpers';
import ComparisonModal from '@/components/ComparisonModal';

const MAX_SLOTS = 4;
const BRAND_RED = '#d72828';

function getImageSrc(product) {
  if (!product) return '/uploads/products/placeholder.jpg';
  const img = Array.isArray(product.images)
    ? product.images[0]
    : product.images || product.image || '';
  if (!img) return '/uploads/products/placeholder.jpg';
  if (typeof img === 'string' && img.startsWith('http')) return img;
  return `/uploads/products/${String(img).replace(/^\/?(?:uploads\/products\/)?/, '').replace(/^\/+/, '')}`;
}

export default function CompareBar() {
  const pathname = usePathname();
  const { compareList, removeFromCompare, clearCompare, similarProducts, addToCompare } = useCompare();
  const [isClosed, setIsClosed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Return null immediately when already on /compare page
  if (pathname === '/compare') return null;
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Human-readable category resolution (Never print raw MongoDB ObjectIds)
  const displayCategoryName = useMemo(() => {
    if (compareList.length === 0) return 'Up to 4 items';
    const firstItem = compareList[0];
    const prod = firstItem?.productData || {};

    // 1. Explicitly stored category_name
    if (firstItem?.category_name && !/^[0-9a-fA-F]{24}$/.test(firstItem.category_name)) {
      return firstItem.category_name;
    }
    // 2. Subcategory new name (e.g. Televisions##Television##ULTRA HD)
    if (prod.sub_category_new_name && typeof prod.sub_category_new_name === 'string') {
      const top = prod.sub_category_new_name.split('##')[0].trim();
      if (top && !/^[0-9a-fA-F]{24}$/.test(top)) return top;
    }
    // 3. Category name on product
    const catName = prod.category_name || prod.categoryName;
    if (catName && !/^[0-9a-fA-F]{24}$/.test(catName)) return catName;
    const slug = firstItem?.category_slug;
    if (slug && !/^[0-9a-fA-F]{24}$/.test(slug) && slug.toLowerCase() !== 'general') return slug;

    return 'Up to 4 items';
  }, [compareList]);

  // Open modal on Compare Now
  const handleCompareNow = useCallback(() => {
    if (compareList.length < 2) {
      setShowAddPicker(true);
      return;
    }
    trackCompareView({ count: compareList.length, category_slug: displayCategoryName });
    setIsModalOpen(true);
  }, [compareList, displayCategoryName]);

  // Re-open if items change
  useEffect(() => {
    setIsClosed(false);
    setIsMinimized(false);
  }, [compareList.length]);

  // Focus search input when picker opens
  useEffect(() => {
    if (showAddPicker) {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    } else {
      setSearchQuery('');
    }
  }, [showAddPicker]);

  // Close picker on Escape key
  useEffect(() => {
    if (!showAddPicker) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowAddPicker(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddPicker]);

  // Live search products within the same category & suggestions
  useEffect(() => {
    if (!showAddPicker) return;

    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const firstItem = compareList[0];
        const currentProductId = String(firstItem?.productId || '');
        const categoryId = String(firstItem?.category_id || firstItem?.productData?.category || '');
        const catName = displayCategoryName !== 'Up to 4 items' ? displayCategoryName : '';
        const excludeIds = compareList.map((c) => String(c.productId)).join(',');

        const params = new URLSearchParams();
        if (catName) params.set('category', catName);
        if (categoryId) params.set('categoryId', categoryId);
        if (currentProductId) params.set('productId', currentProductId);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (excludeIds) params.set('exclude', excludeIds);

        const res = await fetch(`/api/compare?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to search');
        const data = await res.json();
        if (active) {
          setSearchResults(data.products || []);
        }
      } catch (err) {
        console.error('[CompareBar search error]', err);
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showAddPicker, searchQuery, displayCategoryName, compareList]);

  // Available suggested items fallback
  const suggestedItems = searchResults.length > 0
    ? searchResults
    : (similarProducts || []).filter(
        (sp) => sp?._id && !compareList.some((item) => String(item.productId) === String(sp._id))
      );

  const emptySlotsCount = Math.max(0, MAX_SLOTS - compareList.length);

  // Handle adding product from picker
  const handleAddProduct = (prod) => {
    if (!prod?._id) return;
    setRecentlyAddedId(prod._id);
    addToCompare(prod);
    setTimeout(() => {
      setRecentlyAddedId(null);
      if (compareList.length + 1 >= MAX_SLOTS) {
        setShowAddPicker(false);
      }
    }, 600);
  };

  if (compareList.length === 0 || isClosed) {
    return (
      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        {/* Minimized Pill */}
        {isMinimized ? (
          <motion.div
            key="compare-pill"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-[9000]"
          >
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="bg-white border-2 border-[#d72828] text-[#d72828] shadow-2xl rounded-full px-4 py-2.5 flex items-center gap-2 font-bold text-xs hover:bg-red-50 transition-all cursor-pointer active:scale-95"
            >
              <Layers size={15} />
              <span>Compare ({compareList.length}/{MAX_SLOTS})</span>
              <ChevronUp size={15} />
            </button>
          </motion.div>
        ) : (
          /* Full Expanded 4-Slot Sticky Tray */
          <motion.div
            key="compare-bar"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            role="region"
            aria-label="Compare Tray"
            className="fixed bottom-0 left-0 right-0 z-[9000] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
          >
            {/* Red accent line with minimize button */}
            <div className="relative h-1" style={{ background: `linear-gradient(to right, ${BRAND_RED}, #f87171, ${BRAND_RED})` }}>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Minimize compare tray"
                className="absolute right-6 -top-3.5 bg-white border border-gray-200 text-gray-500 hover:text-[#d72828] hover:border-red-300 w-7 h-7 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer z-10"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 flex-wrap lg:flex-nowrap">

              {/* Tray Header & Counter Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center shadow-2xs">
                  <Layers size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-gray-900 tracking-wide uppercase">Compare</span>
                    <span
                      className="text-[11px] font-extrabold text-white px-2 py-0.5 rounded-full"
                      style={{ background: BRAND_RED }}
                    >
                      {compareList.length} / {MAX_SLOTS}
                    </span>
                  </div>
                  {/* Clean human-readable subtitle - NEVER prints raw Mongo ObjectId */}
                  <p className="text-[11px] text-gray-500 font-medium truncate max-w-[130px]" title={displayCategoryName}>
                    {displayCategoryName}
                  </p>
                </div>
              </div>

              {/* 4 Structured Slots (Cards) */}
              <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 py-1">

                {/* 1. Filled Slots */}
                {compareList.map((item) => {
                  const product = item.productData || {};
                  const price = Number(product.special_price > 0 ? product.special_price : product.price || 0);
                  const imgSrc = getImageSrc(product);

                  return (
                    <div
                      key={String(item.productId)}
                      className="relative w-full min-w-0 h-16 sm:h-[72px] bg-white rounded-xl border border-gray-200 hover:border-red-300 shadow-xs flex items-center p-1.5 sm:p-2 gap-1.5 sm:gap-2 transition-all group overflow-hidden"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <Image
                          src={imgSrc}
                          alt={product.name || 'Product'}
                          width={48}
                          height={48}
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>

                      {/* Product Name & Price */}
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[11px] font-semibold text-gray-800 truncate" title={product.name || ''}>
                          {product.name || 'Product'}
                        </p>
                        <p className="text-xs font-extrabold text-[#d72828] mt-0.5 truncate">
                          ₹{price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCompare(item.productId)}
                        aria-label={`Remove ${product.name || 'product'}`}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center transition-all cursor-pointer z-10"
                        title="Remove from compare"
                      >
                        <X size={10} strokeWidth={2.8} />
                      </button>
                    </div>
                  );
                })}

                {/* 2. Active + Add to Compare Empty Slot (Slot 2) */}
                {emptySlotsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(true)}
                    className="w-full min-w-0 h-16 sm:h-[72px] rounded-xl border-2 border-dashed border-gray-300 hover:border-[#d72828] bg-gray-50/70 hover:bg-red-50/40 flex items-center justify-center gap-1.5 sm:gap-2 text-gray-700 hover:text-[#d72828] transition-all cursor-pointer px-1.5 sm:px-2 group shadow-xs active:scale-98"
                    title="Add product to compare"
                  >
                    <div className="w-6 h-6 rounded-full bg-white group-hover:bg-red-100 flex items-center justify-center transition-colors shadow-xs shrink-0">
                      <Plus size={13} className="text-[#d72828]" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">Add Product</p>
                      <p className="text-[10px] text-gray-400 group-hover:text-red-400 leading-tight truncate">Same category</p>
                    </div>
                  </button>
                )}

                {/* 3. Remaining Clickable Empty Slots (e.g. Slot 3 & 4) */}
                {Array.from({ length: Math.max(0, emptySlotsCount - 1) }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setShowAddPicker(true)}
                    className="w-full min-w-0 h-16 sm:h-[72px] rounded-xl border border-dashed border-gray-200 hover:border-[#d72828] bg-gray-50/40 hover:bg-red-50/30 flex items-center justify-center gap-1 text-gray-400 hover:text-[#d72828] transition-all cursor-pointer group active:scale-98 px-1"
                    title={`Add product to Slot ${compareList.length + 2 + idx}`}
                  >
                    <Plus size={12} className="text-gray-400 group-hover:text-[#d72828] shrink-0" />
                    <span className="text-[11px] font-semibold truncate">
                      Slot {compareList.length + 2 + idx}
                    </span>
                  </button>
                ))}

              </div>

              {/* Action Buttons: Minimum 2 Products Business Logic */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsClosed(true)}
                  aria-label="Hide compare bar"
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={clearCompare}
                  aria-label="Clear all compare items"
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  Clear all
                </button>

                {/* Compare CTA: Minimum 2 Products Rule */}
                {compareList.length < 2 ? (
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(true)}
                    className="inline-flex items-center gap-1.5 text-[#d72828] bg-red-50 hover:bg-red-100 border-2 border-[#d72828] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Add 1 more product to compare side-by-side"
                  >
                    <span>Add 1 More to Compare</span>
                    <Plus size={15} strokeWidth={2.5} className="text-[#d72828]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompareNow}
                    aria-label={`Compare ${compareList.length} products`}
                    className="inline-flex items-center gap-2 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer hover:bg-[#b52020]"
                    style={{ background: BRAND_RED }}
                  >
                    <GitCompare size={16} />
                    <span>Compare Now ({compareList.length})</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed "Add Product to Compare" Picker Mini-Modal (Unclipped) ── */}
      <AnimatePresence>
        {showAddPicker && (
          <div
            className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
            onClick={() => setShowAddPicker(false)}
          >
            <div
              ref={dropdownRef}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-picker-title"
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-5 flex flex-col max-h-[85vh] animate-scaleUp"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="pr-4">
                  <h3 id="compare-picker-title" className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wide">
                    Add {displayCategoryName !== 'Up to 4 items' ? displayCategoryName : 'Product'} to Compare
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select a product to compare side-by-side (Slot {compareList.length + 1} of {MAX_SLOTS})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Close picker"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative my-3">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${displayCategoryName !== 'Up to 4 items' ? displayCategoryName.toLowerCase() : 'products'} by name or brand...`}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-[#d72828] focus:bg-white transition-all shadow-2xs"
                />
                {searching ? (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#d72828] animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Products List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[360px]">
                {suggestedItems.length > 0 ? (
                  suggestedItems.map((prod) => {
                    const pPrice = Number(prod.special_price > 0 ? prod.special_price : prod.price || 0);
                    const pImg = getImageSrc(prod);
                    const isAdded = recentlyAddedId === prod._id || compareList.some((c) => String(c.productId) === String(prod._id));

                    return (
                      <div
                        key={String(prod._id)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 hover:border-gray-200"
                      >
                        <div className="w-13 h-13 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          <Image
                            src={pImg}
                            alt={prod.name}
                            width={48}
                            height={48}
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {formatBrandName(prod) ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {formatBrandName(prod)}
                            </span>
                          ) : null}
                          <p className="text-xs font-semibold text-gray-800 truncate" title={prod.name}>
                            {prod.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-extrabold text-[#d72828]">
                              ₹{pPrice.toLocaleString('en-IN')}
                            </span>
                            {prod.quantity > 0 && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                In Stock
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(prod)}
                          disabled={isAdded}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-700 cursor-default'
                              : 'bg-red-50 hover:bg-[#d72828] text-[#d72828] hover:text-white active:scale-95'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={13} strokeWidth={3} />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                    {searching ? (
                      <>
                        <Loader2 size={24} className="text-[#d72828] animate-spin" />
                        <span>Searching {displayCategoryName.toLowerCase()}...</span>
                      </>
                    ) : (
                      <>
                        <Layers size={28} className="text-gray-300" />
                        <span>No other products found in this category</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  {compareList.length} of {MAX_SLOTS} slots used
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Side-by-side Live Comparison Modal */}
      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
