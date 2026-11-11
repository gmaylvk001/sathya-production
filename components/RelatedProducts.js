'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SharedProductCard from '@/components/product/ProductCard';
import { normalizeProduct } from '@/lib/normalizeProduct';

// ─── Carousel Controls Sub-Component ──────────────────────────────────────
const CarouselControls = ({
  onViewAll,
  onPrev,
  onNext,
  canScrollLeft,
  canScrollRight,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
      <div>
        <div className="flex items-baseline gap-2 sm:gap-2.5">
          <h3 className="text-base sm:text-xl font-extrabold text-[#d72828] tracking-tight">
            Related Products
          </h3>
          <span className="text-xs sm:text-sm font-medium text-gray-500 hidden xs:inline-block">
            You may also like
          </span>
        </div>
        <p className="text-xs font-medium text-gray-500 xs:hidden mt-0.5">
          You may also like
        </p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[#d72828] hover:text-red-700 transition-colors inline-flex items-center gap-1 mr-1 sm:mr-2 cursor-pointer"
          >
            View All
            <span className="text-[10px] font-bold">›</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPrev}
          disabled={!canScrollLeft}
          aria-label="Previous products"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <FiChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canScrollRight}
          aria-label="Next products"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <FiChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Product Card Skeleton Sub-Component ──────────────────────────────────
const ProductCardSkeleton = () => {
  return (
    <div className="bg-white border border-gray-100 rounded-[16px] overflow-hidden flex flex-col h-full shadow-2xs animate-pulse">
      <div className="relative h-[120px] sm:h-[170px] w-full bg-gray-100 flex items-center justify-center p-2 sm:p-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gray-200/70"></div>
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-6 h-6 sm:w-7 sm:h-7 bg-gray-200/70 rounded-full"></div>
      </div>
      <div className="p-2 sm:p-4 flex flex-col flex-1 gap-1.5 sm:gap-2 bg-white">
        <div className="h-2 sm:h-2.5 w-12 sm:w-16 bg-gray-200/70 rounded"></div>
        <div className="space-y-1 sm:space-y-1.5 my-0.5 sm:my-1">
          <div className="h-3 sm:h-3.5 bg-gray-200/80 rounded w-full"></div>
          <div className="h-3 sm:h-3.5 bg-gray-200/80 rounded w-3/4"></div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1 sm:pt-2">
          <div className="h-4 sm:h-5 bg-gray-200/80 rounded w-16 sm:w-24"></div>
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-10 sm:w-12"></div>
        </div>
        <div className="mt-1.5 sm:mt-2 h-8 sm:h-9 bg-gray-200/70 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

// ─── Main RelatedProducts Component ─────────────────────────────────────────
const RelatedProducts = ({
  relatedProducts = [],
  currentProductId,
  categoryId,
  brandId,
  region,
  onViewAll,
  className = "",
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brandMap, setBrandMap] = useState({});
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brand');
        const result = await response.json();
        if (isMounted && !result.error && Array.isArray(result.data)) {
          const map = {};
          result.data.forEach((b) => {
            map[b._id] = b.brand_name;
          });
          setBrandMap(map);
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };

    fetchBrands();
    return () => {
      isMounted = false;
    };
  }, []);

  const serializedRelated = useMemo(() => {
    if (!relatedProducts) return '';
    if (typeof relatedProducts === 'string') return relatedProducts;
    if (Array.isArray(relatedProducts)) {
      return relatedProducts
        .map((p) => (typeof p === 'object' && p !== null ? p._id || p.id || '' : String(p)))
        .join(',');
    }
    return '';
  }, [relatedProducts]);

  const resolvedCategoryId = useMemo(() => {
    if (!categoryId) return '';
    return typeof categoryId === 'object' ? categoryId._id || '' : String(categoryId);
  }, [categoryId]);

  const resolvedBrandId = useMemo(() => {
    if (!brandId) return '';
    return typeof brandId === 'object' ? brandId._id || '' : String(brandId);
  }, [brandId]);

  const resolvedCurrentId = useMemo(() => {
    if (!currentProductId) return '';
    return typeof currentProductId === 'object'
      ? currentProductId._id || ''
      : String(currentProductId);
  }, [currentProductId]);

  useEffect(() => {
    let isCancelled = false;

    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);

        const ids = Array.isArray(relatedProducts)
          ? relatedProducts
              .map((item) => (typeof item === "object" && item !== null ? item._id || item.id : item))
              .filter(Boolean)
              .join(",")
          : "";

        if (!ids && !resolvedCategoryId) {
          if (!isCancelled) {
            setProducts([]);
            setLoading(false);
          }
          return;
        }

        const params = new URLSearchParams({ limit: "10" });
        if (ids) params.set("ids", ids);
        if (resolvedCategoryId) params.set("category", resolvedCategoryId);
        if (resolvedBrandId) params.set("brand", resolvedBrandId);
        if (resolvedCurrentId) params.set("exclude", resolvedCurrentId);
        if (region) params.set("region", region);

        const res = await fetch(`/api/product/related?${params.toString()}`);
        const data = await res.json();

        if (!isCancelled) {
          setProducts(res.ok && Array.isArray(data.products) ? data.products : []);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
        if (!isCancelled) {
          setProducts([]);
          setLoading(false);
        }
      }
    };

    fetchRelatedProducts();

    return () => {
      isCancelled = true;
    };
  }, [serializedRelated, resolvedCurrentId, resolvedCategoryId, resolvedBrandId, region]);

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
  }, [products, updateScrollState]);

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

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section aria-label="Related Products" className={`w-full my-6 sm:my-10 px-0 sm:px-6 ${className}`}>
      <div className="bg-white rounded-[18px] sm:rounded-[24px] border border-gray-100 p-2.5 sm:p-6 shadow-2xs">
        <CarouselControls
          onViewAll={onViewAll}
          onPrev={handlePrev}
          onNext={handleNext}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] snap-start min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
                >
                  <ProductCardSkeleton />
                </div>
              ))
            ) : (
              products.map((product) => (
                <div
                  key={product._id}
                  className="flex-[0_0_calc((100%-8px)/2)] sm:flex-[0_0_calc((100%-16px)/2)] md:flex-[0_0_calc((100%-32px)/3)] lg:flex-[0_0_calc((100%-48px)/4)] xl:flex-[0_0_calc((100%-64px)/5)] snap-start min-w-0 max-w-[calc((100%-8px)/2)] sm:max-w-none"
                >
                  <SharedProductCard
                    product={normalizeProduct(product, brandMap)}
                    checkMovement={false}
                    compactMobile={true}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
