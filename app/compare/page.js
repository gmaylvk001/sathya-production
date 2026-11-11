// app/compare/page.js
//
// Full side-by-side product comparison page.
//
// Data fetching strategy:
//   - Logged-in users: compareList already contains productData from the API
//   - Guest users: compareList has only { productId, category_slug }
//     → fetches full product data via /api/product/by-ids?ids=...
//
// Renders <CompareTable> when products are available, <CompareEmptyState> otherwise.

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useCompare } from '@/context/CompareContext';
import CompareTable from '@/components/CompareTable';
import CompareEmptyState from '@/components/CompareEmptyState';
import { trackCompareView } from '@/utils/compareHelpers';

export default function ComparePage() {
  const { compareList, clearCompare, loading: contextLoading } = useCompare();

  // Enriched list with full product data (for guest users who only have IDs)
  const [enrichedList, setEnrichedList] = useState([]);
  const [fetching, setFetching] = useState(false);

  // ── Enrich compare list with full product data ────────────────────────────

  const enrichList = useCallback(async () => {
    if (compareList.length === 0) {
      setEnrichedList([]);
      return;
    }

    // Check if all items already have productData (logged-in API response)
    const allHaveData = compareList.every(
      (item) => item.productData && item.productData._id
    );

    if (allHaveData) {
      setEnrichedList(compareList);
      return;
    }

    // Guest or partial data: fetch full product objects by IDs
    setFetching(true);
    try {
      const ids = compareList.map((item) => String(item.productId)).join(',');
      const res = await fetch(`/api/compare?ids=${ids}`);
      if (!res.ok) throw new Error('Failed to fetch products');

      const { products } = await res.json();
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      // Merge fetched productData back into compareList items
      const merged = compareList.map((item) => ({
        ...item,
        productData: productMap.get(String(item.productId)) || null,
      }));
      setEnrichedList(merged);
    } catch (err) {
      console.error('[ComparePage] enrichList error:', err);
      // Fall back to original list (productData may be null → graceful UI)
      setEnrichedList(compareList);
    } finally {
      setFetching(false);
    }
  }, [compareList]);

  useEffect(() => {
    enrichList();
  }, [enrichList]);

  // Fire analytics on mount when products are loaded
  useEffect(() => {
    if (enrichedList.length > 0) {
      trackCompareView({
        count: enrichedList.length,
        category_slug: enrichedList[0]?.category_slug || '',
      });
    }
  }, [enrichedList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = contextLoading || fetching;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* SEO */}
      <title>Compare Products | Sathya Store</title>
      <meta
        name="description"
        content="Compare products side by side at Sathya Store. View specifications, prices, and ratings to make the best choice."
      />

      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b-2 sticky top-0 z-40 shadow-sm" style={{ borderBottomColor: '#d72828' }}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
                aria-label="Back to products"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back to Products</span>
              </Link>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">
                Compare Products
              </h1>
              {enrichedList.length > 0 && (
                <span className="text-xs font-extrabold text-white px-2.5 py-0.5 rounded-full" style={{ background: '#d72828' }}>
                  {enrichedList.length} / 4
                </span>
              )}
            </div>

            {/* Actions */}
            {enrichedList.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={enrichList}
                  aria-label="Refresh compare list"
                  className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                >
                  <RefreshCw size={15} className={fetching ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={clearCompare}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-300"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
          {isLoading ? (
            /* Loading skeleton */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-32 animate-pulse" style={{ background: 'linear-gradient(to right, #fef2f2, #fee2e2)' }} />
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : enrichedList.length === 0 ? (
            <CompareEmptyState />
          ) : (
            <>
              {/* Category badge */}
              {enrichedList[0]?.category_slug && (
                <div className="mb-6 flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Category:</span>
                  <span className="text-xs font-bold text-white px-3 py-1 rounded-full capitalize" style={{ background: '#d72828' }}>
                    {enrichedList[0].category_slug.replace(/-/g, ' ')}
                  </span>
                </div>
              )}

              <CompareTable products={enrichedList} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
