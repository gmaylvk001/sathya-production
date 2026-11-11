'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ProductCard from '@/components/product/ProductCard';
import { normalizeProduct } from '@/lib/normalizeProduct';

// ─── Header Sub-Component ──────────────────────────────────────────────────
const RecentlyViewedHeader = ({
  onPrev,
  onNext,
  canScrollLeft = false,
  canScrollRight = false,
  showControls = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
      <h3 className="text-base sm:text-xl font-extrabold text-[#d72828] tracking-tight">
        Recently Viewed
      </h3>
      {showControls && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canScrollLeft}
            aria-label="Previous recently viewed products"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canScrollRight}
            aria-label="Next recently viewed products"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Skeleton Sub-Component ────────────────────────────────────────────────
const RecentlyViewedSkeleton = () => {
  return (
    <div className="bg-white border border-gray-100 rounded-[16px] overflow-hidden flex flex-col h-full shadow-2xs animate-pulse">
      <div className="relative h-[120px] sm:h-[170px] w-full bg-gray-100/70 flex items-center justify-center p-2 sm:p-3">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gray-200/70"></div>
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-6 h-6 sm:w-7 sm:h-7 bg-gray-200/70 rounded-full"></div>
      </div>
      <div className="p-2 sm:p-4 flex flex-col flex-1 gap-1.5 sm:gap-2 bg-white">
        <div className="h-2 sm:h-2.5 w-12 sm:w-14 bg-gray-200/70 rounded"></div>
        <div className="space-y-1 sm:space-y-1.5 my-0.5 sm:my-1">
          <div className="h-3 sm:h-3.5 bg-gray-200/80 rounded w-full"></div>
          <div className="h-3 sm:h-3.5 bg-gray-200/80 rounded w-2/3"></div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1 sm:pt-1.5">
          <div className="h-4 sm:h-4 bg-gray-200/80 rounded w-16 sm:w-20"></div>
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-8 sm:w-10"></div>
        </div>
        <div className="mt-1.5 sm:mt-2 h-8 sm:h-8 bg-gray-200/70 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

// ─── Product Card Sub-Component (Uses Shared Uniform ProductCard) ───────────
const RecentlyViewedCard = ({ product, brandMap = {}, onProductClick, compactMobile = false }) => {
  if (!product) return null;
  return (
    <ProductCard
      product={normalizeProduct(product, brandMap)}
      onProductClick={onProductClick}
      checkMovement={false}
      compactMobile={compactMobile}
    />
  );
};

// ─── Main RecentlyViewedProducts Component ─────────────────────────────────
const RecentlyViewedProducts = ({ products: initialProducts, className = "" }) => {
  const [recentProducts, setRecentProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(true);
  const [brandMap, setBrandMap] = useState({});
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch('/api/brand');
        const result = await response.json();
        if (!result.error && Array.isArray(result.data)) {
          const map = {};
          result.data.forEach((b) => {
            map[b._id] = b.brand_name;
          });
          setBrandMap(map);
        }
      } catch (error) {
        console.error('Error fetching brand map:', error);
      }
    };

    fetchBrand();
  }, []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setRecentProducts(initialProducts);
      setLoading(false);
      return;
    }

    const loadRecentlyViewed = () => {
      try {
        setLoading(true);
        const storedString = localStorage.getItem('recentlyViewed');
        let stored = [];
        try {
          stored = JSON.parse(storedString) || [];
        } catch {
          stored = [];
        }

        if (!Array.isArray(stored)) {
          stored = [];
        }

        const validProducts = stored.filter(
          (product) => product && product._id
        );

        setRecentProducts(validProducts);
      } catch (error) {
        console.error('Error reading recently viewed from localStorage:', error);
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentlyViewed();
  }, [initialProducts]);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [recentProducts, updateScrollState]);

  const handlePrev = () => {
    if (scrollRef.current) {
      const scrollStep = typeof window !== 'undefined' && window.innerWidth < 768 ? scrollRef.current.clientWidth : 320;
      scrollRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
      setTimeout(updateScrollState, 350);
    }
  };

  const handleNext = () => {
    if (scrollRef.current) {
      const scrollStep = typeof window !== 'undefined' && window.innerWidth < 768 ? scrollRef.current.clientWidth : 320;
      scrollRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
      setTimeout(updateScrollState, 350);
    }
  };

  const handleProductClick = (product) => {
    try {
      const storedString = localStorage.getItem('recentlyViewed');
      let stored = [];
      try {
        stored = JSON.parse(storedString) || [];
      } catch {
        stored = [];
      }
      const updated = [product, ...stored.filter((p) => p._id !== product._id)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating recentlyViewed localStorage:', e);
    }
  };

  if (loading) {
    return (
      <section aria-label="Recently Viewed Products" className={`w-full my-6 sm:my-10 px-0 sm:px-6 ${className}`}>
        <div className="bg-white rounded-[18px] sm:rounded-[24px] border border-gray-100 p-2.5 sm:p-6 shadow-2xs">
          <RecentlyViewedHeader />
          <div
            className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none py-1 px-0.5"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
              >
                <RecentlyViewedSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!recentProducts || recentProducts.length === 0) {
    return null;
  }

  if (recentProducts.length === 1) {
    return (
      <section aria-label="Recently Viewed Products" className={`w-full my-6 sm:my-10 px-0 sm:px-6 ${className}`}>
        <div className="bg-white rounded-[18px] sm:rounded-[24px] border border-gray-100 p-2.5 sm:p-6 shadow-2xs">
          <RecentlyViewedHeader />
          <div className="w-[calc(50%-4px)] max-w-[260px]">
            <RecentlyViewedCard
              product={recentProducts[0]}
              brandMap={brandMap}
              onProductClick={handleProductClick}
              compactMobile={true}
            />
          </div>
        </div>
      </section>
    );
  }

  if (recentProducts.length === 2) {
    return (
      <section aria-label="Recently Viewed Products" className={`w-full my-6 sm:my-10 px-0 sm:px-6 ${className}`}>
        <div className="bg-white rounded-[18px] sm:rounded-[24px] border border-gray-100 p-2.5 sm:p-6 shadow-2xs">
          <RecentlyViewedHeader />
          <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-full sm:max-w-[540px]">
            {recentProducts.map((product) => (
              <div key={product._id} className="min-w-0">
                <RecentlyViewedCard
                  product={product}
                  brandMap={brandMap}
                  onProductClick={handleProductClick}
                  compactMobile={true}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Recently Viewed Products" className={`w-full my-6 sm:my-10 px-0 sm:px-6 ${className}`}>
      <div className="bg-white rounded-[18px] sm:rounded-[24px] border border-gray-100 p-2.5 sm:p-6 shadow-2xs">
        <RecentlyViewedHeader
          onPrev={handlePrev}
          onNext={handleNext}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          showControls={recentProducts.length > 2}
        />
        <div className="relative w-full">
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth py-1 px-0.5"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {recentProducts.map((product) => (
              <div
                key={product._id}
                className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] snap-start min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
              >
                <RecentlyViewedCard
                  product={product}
                  brandMap={brandMap}
                  onProductClick={handleProductClick}
                  compactMobile={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewedProducts;
