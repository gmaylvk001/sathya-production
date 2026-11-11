// components/CompareTable.jsx
//
// Side-by-side product comparison table — Croma / Flipkart standard.
// Features:
//   - Lowest Price & Best Savings auto-calculated badges
//   - "Show Only Differences" toggle switch
//   - Structured Grouped Rows: Price & Savings, Overview, Key Specs, Detailed Specs
//   - Smart fallbacks ensuring the table is NEVER empty
//   - In-table Empty Column Slot (+ Add Product within same category)
//   - Sticky Product Header on scroll
//   - Direct Add to Cart & View Details CTAs

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Zap,
  Award,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
  Plus,
  Search,
  Loader2,
  Check,
  Eye,
} from 'lucide-react';
import { useCompare } from '@/context/CompareContext';
import { useCart } from '@/context/CartContext';
import { normalizeAttributes, parseNumericValue, formatBrandName, checkProductAvailability, stripHtml } from '@/utils/compareHelpers';
import { toast } from 'react-toastify';
import { getDiscountInfo } from "@/lib/discountHelper";

const BRAND_RED = '#d72828';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getImageSrc(product) {
  if (!product) return '/uploads/products/placeholder.jpg';
  const img = Array.isArray(product.images)
    ? product.images[0]
    : product.images || product.image || '';
  if (!img) return '/uploads/products/placeholder.jpg';
  if (typeof img === 'string' && img.startsWith('http')) return img;
  return `/uploads/products/${String(img).replace(/^\/?(?:uploads\/products\/)?/, '').replace(/^\/+/, '')}`;
}

function getPrice(product) {
  if (!product) return null;
  const special = Number(product.special_price);
  const regular = Number(product.price);
  return special > 0 && special < regular ? special : regular;
}

function getMRP(product) {
  if (!product) return null;
  return Number(product.price) || null;
}

function getDiscount(product) {
  const sp = getPrice(product);
  const mp = getMRP(product);
  const { discountPercent, showDiscount } = getDiscountInfo(mp, sp);
  return showDiscount ? discountPercent : null;
}

function getSavings(product) {
  const sp = getPrice(product);
  const mp = getMRP(product);
  const { showDiscount } = getDiscountInfo(mp, sp);
  if (!showDiscount || !sp || !mp) return 0;
  return mp - sp;
}

function getRating(product) {
  return product ? Number(product.avgRating || product.rating || 0) : 0;
}

function findBestIndex(values, key) {
  const nums = values.map(parseNumericValue);
  if (nums.every((v) => v === null)) return null;
  const lowerIsBetter = /price|cost|weight|watt|power|noise|consum/i.test(key);
  let bestIdx = null;
  let bestVal = lowerIsBetter ? Infinity : -Infinity;
  nums.forEach((v, i) => {
    if (v === null) return;
    if (lowerIsBetter ? v < bestVal : v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  });
  return bestIdx;
}

// ── Star Rating Display ───────────────────────────────────────────────────────

function StarDisplay({ rating, count }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        let fill = '#e5e7eb';
        if (i <= full) fill = '#f59e0b';
        else if (i === full + 1 && half) fill = '#f59e0b';
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={fill} stroke="none">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
      <span className="text-xs font-bold text-amber-600 ml-1">
        {rating > 0 ? rating.toFixed(1) : '—'}
      </span>
      {count > 0 && <span className="text-xs text-gray-400 ml-0.5">({count})</span>}
    </span>
  );
}

// ── In-Table Add Product Picker ───────────────────────────────────────────────

function InTableAddProductSlot({ category, categoryId, excludeIds = [], onAdd }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category && !/^[0-9a-fA-F]{24}$/.test(category)) params.set('category', category);
        if (categoryId) params.set('categoryId', categoryId);
        if (search.trim()) params.set('search', search.trim());
        if (Array.isArray(excludeIds) && excludeIds.length > 0) params.set('exclude', excludeIds.join(','));

        const res = await fetch(`/api/compare?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        if (active) setResults(data.products || []);
      } catch (err) {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, search, category, categoryId, excludeIds]);

  const displayCat = category && !/^[0-9a-fA-F]{24}$/.test(category) ? category : 'Product';

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-3 border-l border-dashed border-gray-200" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full max-w-[180px] h-36 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#d72828] bg-gray-50/60 hover:bg-red-50/40 flex flex-col items-center justify-center gap-2 p-3 transition-all cursor-pointer group shadow-2xs active:scale-98"
      >
        <div className="w-9 h-9 rounded-full bg-white group-hover:bg-red-100 flex items-center justify-center text-[#d72828] shadow-xs transition-colors">
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-gray-700 group-hover:text-[#d72828]">
            Add Product
          </p>
          <p className="text-[10px] text-gray-400">Same category</p>
        </div>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-72 sm:w-84 max-h-84 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex flex-col z-50 text-left animate-scaleUp">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
            <span className="text-[11px] font-bold text-gray-800 uppercase">
              Add {displayCat}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          </div>

          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${category || 'products'}...`}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#d72828]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-52">
            {loading ? (
              <div className="py-6 flex justify-center text-gray-400">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : results.length > 0 ? (
              results.map((prod) => (
                <div
                  key={String(prod._id)}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-xl transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center shrink-0 overflow-hidden">
                    <Image
                      src={getImageSrc(prod)}
                      alt={prod.name}
                      width={36}
                      height={36}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{prod.name}</p>
                    <p className="text-[11px] font-bold text-[#d72828]">
                      ₹{Number(prod.special_price > 0 ? prod.special_price : prod.price || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(prod);
                      setOpen(false);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-[#d72828] text-white rounded-lg hover:bg-[#b52020] shrink-0 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                No products found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Header Card ───────────────────────────────────────────────────────

function ProductHeaderCard({
  item,
  onRemove,
  colIdx,
  isLowestPrice,
  isBestSavings,
  onAddToCart,
  isAddingToCart,
}) {
  const p = item.productData || item;
  const price = getPrice(p);
  const mrp = getMRP(p);
  const disc = getDiscount(p);
  const rating = getRating(p);
  const reviewCount = p?.reviewCount || p?.review_count || 0;
  const avail = checkProductAvailability(p);

  return (
    <div className="flex flex-col items-center gap-2 pb-3 relative min-h-[300px]">
      {/* Remove button */}
      <button
        onClick={() => onRemove(item.productId || p._id)}
        aria-label={`Remove ${p?.name || 'product'} from compare`}
        className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center transition-all z-10 cursor-pointer shadow-2xs"
        title="Remove"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {p ? (
        <>
          {/* Badges Container: Discount + Winners */}
          <div className="absolute top-0 left-0 flex flex-col gap-1 items-start z-10">
            {disc && (
              <span
                className="text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs"
                style={{ background: BRAND_RED }}
              >
                -{disc}% OFF
              </span>
            )}
            {isLowestPrice && (
              <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <Tag size={10} /> Lowest Price
              </span>
            )}
            {isBestSavings && !isLowestPrice && (
              <span className="bg-amber-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <Sparkles size={10} /> Best Savings
              </span>
            )}
          </div>

          {/* Product Image */}
          <Link href={`/product/${p.slug || p._id}`} className="block mt-7 group">
            <div className="w-28 h-28 bg-white rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 group-hover:border-red-200 transition-all shadow-xs">
              <Image
                src={getImageSrc(p)}
                alt={p.name || 'Product'}
                width={100}
                height={100}
                className="object-contain p-2 group-hover:scale-105 transition-transform"
                unoptimized
              />
            </div>
          </Link>

          {/* Brand */}
          {formatBrandName(p) ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {formatBrandName(p)}
            </span>
          ) : null}

          {/* Title */}
          <Link
            href={`/product/${p.slug || p._id}`}
            className="text-xs font-bold text-gray-800 hover:text-[#d72828] line-clamp-2 text-center leading-snug transition-colors px-1"
            title={p.name}
          >
            {p.name}
          </Link>

          {/* Price */}
          <div className="flex flex-col items-center gap-0.5 my-1">
            <span className="text-lg font-black" style={{ color: BRAND_RED }}>
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
            {getDiscountInfo(mrp, price).showDiscount && (
              <span className="text-xs text-gray-400 line-through">
                ₹{Number(mrp).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Rating or Clean Stock Pill (No dead grey stars with dash) */}
          {rating > 0 ? (
            <StarDisplay rating={rating} count={reviewCount} />
          ) : (
            <div className="h-5 flex items-center justify-center">
              {avail.canAddToCart ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  In Stock
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                  {avail.label}
                </span>
              )}
            </div>
          )}

          {/* Action CTAs: Direct Add to Cart or Out of Stock / Sold Out Online */}
          <div className="w-full flex flex-col gap-1.5 mt-auto pt-2">
            {avail.canAddToCart ? (
              <button
                type="button"
                onClick={() => onAddToCart(p)}
                disabled={isAddingToCart}
                className="w-full text-center text-xs font-bold text-white py-2.5 rounded-xl transition-all shadow-xs hover:bg-[#b52020] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ background: BRAND_RED }}
              >
                <ShoppingCart size={13} />
                <span>{isAddingToCart ? 'Adding...' : 'Add to Cart'}</span>
              </button>
            ) : (
              <div className="w-full text-center text-xs font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-500 border border-gray-200">
                {avail.label}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 mt-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
            <XCircle size={32} className="text-gray-300" />
          </div>
          <span className="text-xs text-gray-400 italic text-center">
            Product no longer available
          </span>
        </div>
      )}
    </div>
  );
}

// ── Desktop Table ─────────────────────────────────────────────────────────────

function DesktopTable({ products, rows }) {
  const { removeFromCompare, addToCompare } = useCompare();
  const { updateCartCount } = useCart();
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [addingId, setAddingId] = useState(null);

  // Cart handler
  const handleAddToCart = async (product) => {
    if (!product?._id) return;
    setAddingId(product._id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      let guestCartId = null;
      if (!token) {
        guestCartId = localStorage.getItem('guestCartId') || 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('guestCartId', guestCartId);
      }

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { guestCartId }),
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`"${product.name}" added to cart!`, { autoClose: 2000, position: 'bottom-center' });
        if (data.cartCount !== undefined) {
          updateCartCount(data.cartCount);
        }
      } else {
        toast.error(data.message || data.error || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Cart error:', err);
    } finally {
      setAddingId(null);
    }
  };

  // Best Value & Lowest Price Calculation
  const validPrices = products
    .map((item, idx) => ({ idx, price: getPrice(item?.productData || item) }))
    .filter((p) => p.price && p.price > 0);

  const lowestPriceIdx = validPrices.length > 0
    ? validPrices.reduce((min, p) => (p.price < min.price ? p : min), validPrices[0]).idx
    : null;

  const validSavings = products
    .map((item, idx) => ({ idx, savings: getSavings(item?.productData || item) }))
    .filter((s) => s.savings > 0);

  const bestSavingsIdx = validSavings.length > 0
    ? validSavings.reduce((max, s) => (s.savings > max.savings ? s : max), validSavings[0]).idx
    : null;

  // Filter differences
  const displayedRows = showOnlyDifferences ? rows.filter((r) => r.isDifferent) : rows;
  const visibleRows = showAllSpecs ? displayedRows : displayedRows.slice(0, 20);

  // Column template calculation (including empty slot if < 4)
  const canAddMore = products.length < 4;
  const totalCols = products.length + (canAddMore ? 1 : 0);
  const colTemplate = `220px repeat(${totalCols}, 1fr)`;

  const cleanCategoryName = (() => {
    const first = products[0];
    const prod = first?.productData || first || {};
    if (first?.category_name && !/^[0-9a-fA-F]{24}$/.test(first.category_name)) return first.category_name;
    if (prod.sub_category_new_name && typeof prod.sub_category_new_name === 'string') {
      const top = prod.sub_category_new_name.split('##')[0].trim();
      if (top && !/^[0-9a-fA-F]{24}$/.test(top)) return top;
    }
    const catName = prod.category_name || prod.categoryName;
    if (catName && !/^[0-9a-fA-F]{24}$/.test(catName)) return catName;
    const slug = first?.category_slug;
    if (slug && !/^[0-9a-fA-F]{24}$/.test(slug) && slug.toLowerCase() !== 'general') return slug;
    return 'Product';
  })();

  const categoryId = products[0]?.category_id || products[0]?.productData?.category || '';
  const excludeIds = products.map((p) => String(p.productId || p._id || p.productData?._id)).filter(Boolean);

  return (
    <div className="hidden md:block">
      {/* ── Control Bar: Display Options & Differences Toggle ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50/90 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700">Display Options:</span>
          <button
            type="button"
            onClick={() => setShowOnlyDifferences((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              showOnlyDifferences
                ? 'bg-[#d72828] text-white shadow-xs'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                showOnlyDifferences ? 'bg-white animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span>Highlight Differences Only</span>
          </button>
        </div>
        <span className="text-[11px] text-gray-500 font-medium">
          {displayedRows.length} attributes compared
        </span>
      </div>

      {/* ── Product Headers (Full Cards at Top) ── */}
      <div
        className="grid border-b-2 shadow-xs bg-white"
        style={{ gridTemplateColumns: colTemplate, borderBottomColor: BRAND_RED }}
      >
        <div className="px-5 py-5 flex items-end">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full" style={{ background: BRAND_RED }} />
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-widest">
              Products
            </span>
          </div>
        </div>

        {/* Product Columns */}
        {products.map((item, colIdx) => (
          <div key={colIdx} className="px-4 py-3 border-l border-gray-100">
            <ProductHeaderCard
              item={item}
              onRemove={removeFromCompare}
              colIdx={colIdx}
              isLowestPrice={colIdx === lowestPriceIdx}
              isBestSavings={colIdx === bestSavingsIdx}
              onAddToCart={handleAddToCart}
              isAddingToCart={addingId === (item.productId || item.productData?._id)}
            />
          </div>
        ))}

        {/* In-Table Empty Add Product Slot Column */}
        {canAddMore && (
          <InTableAddProductSlot
            category={cleanCategoryName}
            categoryId={categoryId}
            excludeIds={excludeIds}
            onAdd={(prod) => addToCompare(prod)}
          />
        )}
      </div>

      {/* ── True Sticky Compact Product Header on Scroll (pinned below navbar at top-[68px]) ── */}
      <div
        className="sticky top-[68px] z-30 grid bg-white/95 backdrop-blur-md border-y border-gray-200 shadow-sm"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div className="px-5 py-2.5 flex items-center gap-2 bg-gray-50/80 border-r border-gray-100">
          <div className="w-1.5 h-4 rounded-full" style={{ background: BRAND_RED }} />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-700 truncate">
            Comparing ({products.length})
          </span>
        </div>

        {products.map((item, colIdx) => {
          const p = item.productData || item;
          const price = getPrice(p);
          const avail = checkProductAvailability(p);

          return (
            <div
              key={colIdx}
              className="px-3 py-2 border-l border-gray-100 flex items-center justify-between gap-2 bg-white/90"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                <Image
                  src={getImageSrc(p)}
                  alt={p.name || 'Product'}
                  width={34}
                  height={34}
                  className="object-contain p-0.5"
                  unoptimized
                />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <p className="text-[11px] font-bold text-gray-800 truncate" title={p.name}>
                  {p.name}
                </p>
                <p className="text-xs font-black text-[#d72828] leading-tight">
                  ₹{Number(price || 0).toLocaleString('en-IN')}
                </p>
              </div>

              {avail.canAddToCart ? (
                <button
                  type="button"
                  onClick={() => handleAddToCart(p)}
                  disabled={addingId === (p._id || item.productId)}
                  className="px-2.5 py-1 text-[11px] font-bold text-white rounded-lg hover:bg-[#b52020] active:scale-95 transition-all shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  style={{ background: BRAND_RED }}
                  title="Add to cart"
                >
                  <ShoppingCart size={11} />
                  <span>Add</span>
                </button>
              ) : (
                <span className="px-2 py-1 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-lg shrink-0 border border-gray-200">
                  {avail.label === 'Sold Out Online' ? 'Sold Out' : 'Out of Stock'}
                </span>
              )}
            </div>
          );
        })}

        {canAddMore && (
          <div className="border-l border-dashed border-gray-200 bg-gray-50/40 flex items-center justify-center px-2 py-1">
            <span className="text-[11px] font-semibold text-gray-400">+ Add</span>
          </div>
        )}
      </div>

      {/* ── Group 1: Pricing & Offers Summary (Clean SVG icon, no emoji) ── */}
      <div className="px-5 py-2.5 flex items-center gap-2 bg-red-50/80 border-b border-red-100">
        <Tag size={14} className="text-[#d72828]" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#d72828]">
          Pricing & Offers
        </span>
      </div>

      {/* Selling Price Row */}
      <div className="grid border-b border-gray-100 hover:bg-red-50/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-5 py-3 border-r border-gray-100 bg-gray-50/60 font-semibold text-xs text-gray-700">
          Selling Price
        </div>
        {products.map((item, idx) => {
          const sp = getPrice(item.productData || item);
          const isLowest = idx === lowestPriceIdx;
          return (
            <div key={idx} className={`px-4 py-3 border-l border-gray-100 flex items-center justify-center ${isLowest ? 'bg-emerald-50/50' : 'bg-white'}`}>
              <span className={`text-sm font-black ${isLowest ? 'text-emerald-700' : 'text-[#d72828]'}`}>
                ₹{Number(sp || 0).toLocaleString('en-IN')}
                {isLowest && <span className="ml-1 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-extrabold">Lowest</span>}
              </span>
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>

      {/* MRP Row */}
      <div className="grid border-b border-gray-100 hover:bg-red-50/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-5 py-3 border-r border-gray-100 bg-white font-semibold text-xs text-gray-700">
          Maximum Retail Price (MRP)
        </div>
        {products.map((item, idx) => {
          const mrp = getMRP(item.productData || item);
          return (
            <div key={idx} className="px-4 py-3 border-l border-gray-100 flex items-center justify-center bg-white text-xs text-gray-500">
              {mrp ? `₹${Number(mrp).toLocaleString('en-IN')}` : '—'}
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>

      {/* Total Savings Row */}
      <div className="grid border-b border-gray-100 hover:bg-red-50/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-5 py-3 border-r border-gray-100 bg-gray-50/60 font-semibold text-xs text-gray-700">
          Discount & Savings
        </div>
        {products.map((item, idx) => {
          const sav = getSavings(item.productData || item);
          const disc = getDiscount(item.productData || item);
          const isBest = idx === bestSavingsIdx;
          return (
            <div key={idx} className={`px-4 py-3 border-l border-gray-100 flex items-center justify-center ${isBest ? 'bg-amber-50/50' : 'bg-white'}`}>
              {sav > 0 ? (
                <span className={`text-xs font-bold ${isBest ? 'text-amber-700' : 'text-emerald-600'}`}>
                  Save ₹{sav.toLocaleString('en-IN')} ({disc}% OFF)
                  {isBest && <span className="ml-1 text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-extrabold">Best</span>}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Standard Price</span>
              )}
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>

      {/* ── Group 2: General Overview & Stock (Clean SVG icon, no emoji) ── */}
      <div className="px-5 py-2.5 flex items-center gap-2 bg-red-50/80 border-b border-red-100">
        <Zap size={14} className="text-[#d72828]" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#d72828]">
          General Overview
        </span>
      </div>

      {/* Stock Availability */}
      <div className="grid border-b border-gray-100 hover:bg-red-50/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-5 py-3 border-r border-gray-100 bg-gray-50/60 font-semibold text-xs text-gray-700">
          Stock Availability
        </div>
        {products.map((item, idx) => {
          const p = item.productData || item;
          const avail = checkProductAvailability(p);
          return (
            <div key={idx} className="px-4 py-3 border-l border-gray-100 flex items-center justify-center bg-white">
              {avail.canAddToCart ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                  <Check size={11} strokeWidth={3} /> In Stock ({p.quantity} units)
                </span>
              ) : avail.label === 'Sold Out Online' ? (
                <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 border border-gray-300 px-2.5 py-1 rounded-full text-xs font-bold">
                  <X size={11} strokeWidth={3} /> Sold Out Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
                  <X size={11} strokeWidth={3} /> Currently Out of Stock
                </span>
              )}
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>

      {/* Category Row */}
      <div className="grid border-b border-gray-100 hover:bg-red-50/20 transition-colors" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-5 py-3 border-r border-gray-100 bg-white font-semibold text-xs text-gray-700">
          Category
        </div>
        {products.map((item, idx) => {
          const p = item.productData || item;
          const catName = p?.category_name || (p?.sub_category_new_name ? p.sub_category_new_name.split('##')[0].trim() : '') || p?.categoryName || cleanCategoryName || '—';
          return (
            <div key={idx} className="px-4 py-3 border-l border-gray-100 flex items-center justify-center bg-white text-xs font-semibold text-gray-700">
              {catName}
            </div>
          );
        })}
        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>

      {/* ── Group 3: Key Specifications (Clean SVG icon, no emoji, NO fake green checkmarks) ── */}
      <div className="px-5 py-2.5 flex items-center gap-2 bg-red-50/80 border-b border-red-100">
        <Award size={14} className="text-[#d72828]" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#d72828]">
          Key Specifications
        </span>
      </div>

      {visibleRows.length > 0 ? (
        visibleRows.map(({ key, values, isDifferent }, rowIdx) => {
          const isEven = rowIdx % 2 === 0;

          return (
            <div
              key={rowIdx}
              className={`grid border-b border-gray-100 transition-colors group ${
                isDifferent ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-gray-50'
              }`}
              style={{ gridTemplateColumns: colTemplate }}
            >
              <div className={`px-5 py-3 flex items-center justify-between border-r border-gray-100 ${isEven ? 'bg-gray-50/60' : 'bg-white'}`}>
                <span className="text-xs font-semibold text-gray-700">{stripHtml(key)}</span>
                {isDifferent && (
                  <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Diff
                  </span>
                )}
              </div>

              {values.map((val, colIdx) => {
                const displayVal = stripHtml(val);
                return (
                  <div
                    key={colIdx}
                    className={`px-4 py-3 flex items-center justify-center border-l border-gray-100 ${
                      isEven ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    {displayVal ? (
                      <span className="text-xs text-center leading-snug text-gray-700 whitespace-pre-line">
                        {displayVal}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                );
              })}

              {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
            </div>
          );
        })
      ) : (
        <div className="py-8 text-center text-xs text-gray-500 bg-white">
          {showOnlyDifferences ? 'All compared specifications are identical for these products.' : 'No specifications available'}
        </div>
      )}

      {/* Show more/less toggle button */}
      {displayedRows.length > 20 && (
        <div className="flex justify-center py-4 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => setShowAllSpecs((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-bold px-6 py-2.5 rounded-full border-2 transition-all hover:bg-red-50 cursor-pointer shadow-2xs"
            style={{ color: BRAND_RED, borderColor: BRAND_RED }}
          >
            {showAllSpecs ? (
              <>
                <ChevronUp size={14} /> Show Fewer Specifications
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show All {displayedRows.length} Specifications
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Direct Action Footer Row ── */}
      <div className="grid" style={{ gridTemplateColumns: colTemplate, background: `${BRAND_RED}08` }}>
        <div className="px-5 py-5 border-r border-gray-100 flex items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Direct Actions
          </span>
        </div>

        {products.map((item, colIdx) => {
          const p = item.productData || item;
          const avail = checkProductAvailability(p);

          return (
            <div key={colIdx} className="px-4 py-4 flex flex-col gap-2 border-l border-gray-100">
              {p ? (
                <>
                  {avail.canAddToCart ? (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      disabled={addingId === (p._id || item.productId)}
                      className="w-full text-center text-xs font-bold text-white py-2.5 rounded-xl transition-all hover:bg-[#b52020] active:scale-95 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      style={{ background: BRAND_RED }}
                    >
                      <ShoppingCart size={13} />
                      <span>{addingId === (p._id || item.productId) ? 'Adding...' : 'Add to Cart'}</span>
                    </button>
                  ) : (
                    <div className="w-full text-center text-xs font-semibold py-2.5 rounded-xl bg-gray-200 text-gray-600 border border-gray-300">
                      {avail.label}
                    </div>
                  )}

                  <Link
                    href={`/product/${p.slug || p._id}`}
                    className="w-full text-center text-xs font-semibold py-2 rounded-xl border border-gray-300 hover:border-red-400 bg-white text-gray-700 hover:text-[#d72828] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>View Product Details</span>
                  </Link>
                </>
              ) : null}
            </div>
          );
        })}

        {canAddMore && <div className="border-l border-dashed border-gray-100 bg-gray-50/20" />}
      </div>
    </div>
  );
}

// ── Mobile Responsive View ───────────────────────────────────────────────────

function MobileCards({ products, rows }) {
  const { removeFromCompare } = useCompare();

  return (
    <div className="md:hidden flex flex-col gap-4">
      {products.map((item, colIdx) => {
        const p = item.productData || item;
        const price = getPrice(p);
        const mrp = getMRP(p);
        const disc = getDiscount(p);
        const rating = getRating(p);
        const reviewCount = p?.reviewCount || p?.review_count || 0;

        return (
          <div key={colIdx} className="rounded-2xl border border-gray-200 overflow-hidden shadow-xs bg-white">
            <div className="relative p-4 bg-gray-50/80 border-b border-gray-100">
              {disc && (
                <span
                  className="absolute top-3 left-3 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{ background: BRAND_RED }}
                >
                  -{disc}%
                </span>
              )}

              <button
                type="button"
                onClick={() => removeFromCompare(item.productId || p._id)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white text-gray-400 hover:text-red-500 shadow-xs flex items-center justify-center"
              >
                <X size={13} />
              </button>

              <div className="flex gap-3 pt-2">
                <div className="w-20 h-20 bg-white rounded-xl border flex items-center justify-center overflow-hidden shrink-0">
                  <Image
                    src={getImageSrc(p)}
                    alt={p?.name || 'Product'}
                    width={72}
                    height={72}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 line-clamp-2">{p?.name}</p>
                  <p className="text-base font-extrabold text-[#d72828] mt-1">
                    ₹{Number(price || 0).toLocaleString('en-IN')}
                  </p>
                  {getDiscountInfo(mrp, price).showDiscount && (
                    <p className="text-xs text-gray-400 line-through">₹{Number(mrp).toLocaleString('en-IN')}</p>
                  )}
                  <StarDisplay rating={rating} count={reviewCount} />
                </div>
              </div>
            </div>

            {/* Mobile Specs List */}
            <div className="divide-y divide-gray-100 px-4 py-2 text-xs">
              {rows.slice(0, 10).map(({ key, values }, rIdx) => (
                <div key={rIdx} className="py-2 flex justify-between items-center gap-3">
                  <span className="text-gray-500 font-medium">{stripHtml(key)}</span>
                  <span className="font-semibold text-gray-800 text-right whitespace-pre-line">
                    {stripHtml(values[colIdx]) || '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <Link
                href={`/product/${p?.slug || p?._id}`}
                className="flex-1 text-center py-2 bg-[#d72828] text-white rounded-xl text-xs font-bold"
              >
                View Product
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function CompareTable({ products }) {
  if (!products || products.length === 0) return null;

  const rows = useMemo(() => {
    return normalizeAttributes(products.map((item) => item.productData || item).filter(Boolean));
  }, [products]);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-xs overflow-visible">
      <DesktopTable products={products} rows={rows} />
      <MobileCards products={products} rows={rows} />
    </div>
  );
}
