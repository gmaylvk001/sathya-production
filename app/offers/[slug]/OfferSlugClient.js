"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import SharedProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";
import { isProductInStock } from "@/lib/productSort";

// Skeleton component for smooth loading state
function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 flex flex-col justify-between animate-pulse">
      <div className="w-full h-40 bg-gray-200 rounded-md mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-5 bg-gray-200 rounded w-1/2 pt-1"></div>
        <div className="h-9 bg-gray-200 rounded w-full mt-3"></div>
      </div>
    </div>
  );
}

export default function OfferSlugClient({
  offer,
  initialProducts = [],
  brandMap = {},
  slug = "",
}) {
  const [products] = useState(initialProducts);
  const [loading, setLoading] = useState(false);

  // Sorting state: 'featured' | 'price-low-high' | 'price-high-low' | 'discount' | 'newest'
  const [sortBy, setSortBy] = useState("featured");

  // Filtering state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Extract dynamic categories and brands from product dataset
  const { categoryList, brandList, priceMin, priceMax } = useMemo(() => {
    const catsMap = new Map();
    const brandsMap = new Map();
    let min = Infinity;
    let max = 0;

    const getCategoryName = (p) => {
      if (p.sub_category_new_name && typeof p.sub_category_new_name === "string") {
        const parts = p.sub_category_new_name.split("##").map((s) => s.trim()).filter(Boolean);
        const readable = parts.find((part) => part && !/^[0-9a-fA-F]{16,}$/.test(part));
        if (readable) return readable;
      }
      const candidate = p.category || p.sub_category || "";
      if (candidate && typeof candidate === "string" && !/^[0-9a-fA-F]{16,}$/.test(candidate.trim())) {
        return candidate.trim();
      }
      return null;
    };

    products.forEach((p) => {
      // Category extraction
      const cat = getCategoryName(p);
      if (cat) {
        catsMap.set(cat, (catsMap.get(cat) || 0) + 1);
      }

      // Brand extraction
      const brandId = p.brand?._id || p.brand || "";
      const brandName =
        p.brand?.brand_name ||
        p.brand?.name ||
        p.brand_name ||
        brandMap[brandId] ||
        (typeof p.brand === "string" && !/^[0-9a-fA-F]{20,}$/.test(p.brand) ? p.brand : "");

      if (brandName && typeof brandName === "string" && brandName.trim() && brandName.toUpperCase() !== "SATHYA") {
        const cleanBrand = brandName.trim();
        brandsMap.set(cleanBrand, (brandsMap.get(cleanBrand) || 0) + 1);
      }

      // Price extraction
      const effPrice = Number(p.special_price > 0 ? p.special_price : p.price) || 0;
      if (effPrice > 0) {
        if (effPrice < min) min = effPrice;
        if (effPrice > max) max = effPrice;
      }
    });

    return {
      categoryList: Array.from(catsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      brandList: Array.from(brandsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      priceMin: min === Infinity ? 0 : min,
      priceMax: max === 0 ? 100000 : max,
    };
  }, [products, brandMap]);

  const [priceRange, setPriceRange] = useState([priceMin, priceMax]);

  useEffect(() => {
    setPriceRange([priceMin, priceMax]);
  }, [priceMin, priceMax]);

  // Toggle category
  const toggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
    setCurrentPage(1);
  };

  // Toggle brand
  const toggleBrand = (brandName) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
    setCurrentPage(1);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setOnlyInStock(false);
    setPriceRange([priceMin, priceMax]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    onlyInStock ||
    priceRange[0] > priceMin ||
    priceRange[1] < priceMax;

  // Filtered & Sorted products computation
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // 1. Availability filter
      if (onlyInStock && !isProductInStock(p)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategories.length > 0) {
        let pCat = null;
        if (p.sub_category_new_name && typeof p.sub_category_new_name === "string") {
          const parts = p.sub_category_new_name.split("##").map((s) => s.trim()).filter(Boolean);
          pCat = parts.find((part) => part && !/^[0-9a-fA-F]{16,}$/.test(part));
        }
        if (!pCat) {
          const candidate = p.category || p.sub_category || "";
          if (candidate && !/^[0-9a-fA-F]{16,}$/.test(candidate.trim())) {
            pCat = candidate.trim();
          }
        }
        if (!pCat || !selectedCategories.includes(pCat)) {
          return false;
        }
      }

      // 3. Brand filter
      if (selectedBrands.length > 0) {
        const brandId = p.brand?._id || p.brand || "";
        const bName =
          p.brand?.brand_name ||
          p.brand?.name ||
          p.brand_name ||
          brandMap[brandId] ||
          (typeof p.brand === "string" ? p.brand : "");

        if (!bName || !selectedBrands.includes(bName.trim())) {
          return false;
        }
      }

      // 4. Price range filter
      const effPrice = Number(p.special_price > 0 ? p.special_price : p.price) || 0;
      if (effPrice < priceRange[0] || effPrice > priceRange[1]) {
        return false;
      }

      return true;
    });

    // Stock prioritization helper: in-stock first
    const stockScore = (p) => (isProductInStock(p) ? 1 : 0);

    // Sorting
    result.sort((a, b) => {
      const stockDiff = stockScore(b) - stockScore(a);
      if (stockDiff !== 0) return stockDiff;

      const priceA = Number(a?.special_price > 0 ? a.special_price : a?.price) || 0;
      const priceB = Number(b?.special_price > 0 ? b.special_price : b?.price) || 0;

      if (sortBy === "price-low-high") {
        return priceA - priceB;
      }
      if (sortBy === "price-high-low") {
        return priceB - priceA;
      }
      if (sortBy === "discount") {
        const discA = a?.price > 0 && a?.special_price > 0 ? (a.price - a.special_price) / a.price : 0;
        const discB = b?.price > 0 && b?.special_price > 0 ? (b.price - b.special_price) / b.price : 0;
        return discB - discA;
      }
      if (sortBy === "newest") {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        return timeB - timeA;
      }
      // Default: featured / newest
      const timeA = new Date(a?.createdAt || 0).getTime();
      const timeB = new Date(b?.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [products, selectedCategories, selectedBrands, onlyInStock, priceRange, sortBy, brandMap]);

  // Pagination calculation
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-16">
      {/* 1. Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-xs font-medium text-gray-500">
            <Link href="/" className="hover:text-red-600 transition flex items-center gap-1">
              <Icon icon="mdi:home-outline" className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-400">Offers</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold uppercase tracking-wide">
              {offer?.offerName || "Special Offer"}
            </span>
          </nav>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Live Exclusive Deal</span>
          </div>
        </div>
      </div>

      {/* 2. Hero Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-gray-900 font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm mb-2">
                <Icon icon="mdi:fire" className="w-4 h-4 text-red-600" />
                Featured Offer
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
                {offer?.offerName}
              </h1>
              {offer?.description && (
                <p className="text-red-100 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed font-light">
                  {offer.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-center">
                <span className="block text-xl sm:text-2xl font-black">{totalProducts}</span>
                <span className="text-[11px] uppercase tracking-wider text-red-100 font-medium">
                  Products Available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Icon icon="mdi:filter-variant" className="w-4 h-4 text-red-600" />
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* In-Stock Toggle */}
              <div className="mb-5 pb-4 border-b border-gray-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-gray-700">In-Stock Only</span>
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => {
                      setOnlyInStock(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Category Filter */}
              {categoryList.length > 0 && (
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                    Category
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {categoryList.map((cat) => (
                      <label
                        key={cat.name}
                        className="flex items-center justify-between text-gray-600 hover:text-gray-900 cursor-pointer py-0.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.name)}
                            onChange={() => toggleCategory(cat.name)}
                            className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">({cat.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Filter */}
              {brandList.length > 0 && (
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                    Brand
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {brandList.map((brand) => (
                      <label
                        key={brand.name}
                        className="flex items-center justify-between text-gray-600 hover:text-gray-900 cursor-pointer py-0.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.name)}
                            onChange={() => toggleBrand(brand.name)}
                            className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                          />
                          <span className="truncate">{brand.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">({brand.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Filter */}
              {priceMax > priceMin && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                    Price Range
                  </h4>
                  <div className="space-y-2 text-xs">
                    <input
                      type="range"
                      min={priceMin}
                      max={priceMax}
                      value={priceRange[1]}
                      onChange={(e) => {
                        setPriceRange([priceRange[0], Number(e.target.value)]);
                        setCurrentPage(1);
                      }}
                      className="w-full accent-red-600"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                      <span>₹{priceMin.toLocaleString()}</span>
                      <span className="font-bold text-red-600">Up to ₹{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="flex-1 min-w-0">
            {/* Control Bar (Total Count, Active Filter Tags, Mobile Filter Button, Sorting) */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg"
                >
                  <Icon icon="mdi:filter-variant" className="w-4 h-4 text-red-600" />
                  Filters {hasActiveFilters && `(${selectedCategories.length + selectedBrands.length + (onlyInStock ? 1 : 0)})`}
                </button>
                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                  Showing <strong className="text-gray-900">{totalProducts}</strong> products
                </span>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <label className="text-xs text-gray-500 shrink-0 font-medium">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg py-1.5 px-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium cursor-pointer"
                >
                  <option value="featured">Featured / Newest</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="discount">Highest Discount</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs text-gray-400 font-medium">Active Filters:</span>
                {selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {cat}
                    <button onClick={() => toggleCategory(cat)} className="hover:text-red-900">
                      <Icon icon="mdi:close" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedBrands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {b}
                    <button onClick={() => toggleBrand(b)} className="hover:text-blue-900">
                      <Icon icon="mdi:close" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {onlyInStock && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-xs px-2.5 py-1 rounded-full font-medium">
                    In Stock
                    <button onClick={() => setOnlyInStock(false)} className="hover:text-green-900">
                      <Icon icon="mdi:close" className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <ProductCardSkeleton key={idx} />
                ))}
              </div>
            ) : paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {paginatedProducts.map((p, idx) => (
                    <SharedProductCard
                      key={p._id || idx}
                      product={normalizeProduct(p, brandMap)}
                      compactMobile={true}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && <span className="text-gray-400 text-xs">...</span>}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                                currentPage === page
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* User-Friendly Empty State */
              <div className="bg-white rounded-xl border border-gray-200 p-10 sm:p-14 text-center shadow-sm">
                <div className="w-24 h-24 mx-auto mb-4 relative opacity-85">
                  <Image
                    src="/images/no-productbox.png"
                    alt="No Products"
                    fill
                    className="object-contain"
                    onError={(e) => {
                      // Fallback if image not present
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                    <Icon icon="mdi:package-variant-closed" className="w-10 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Currently no products available under {offer?.offerName || "this offer"}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
                  {hasActiveFilters
                    ? "No products matched your selected filters. Try resetting the filters to view all products."
                    : "Check back soon as we continuously update our deals and campaign inventory!"}
                </p>
                <div className="flex justify-center gap-3">
                  {hasActiveFilters ? (
                    <button
                      onClick={resetFilters}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-5 py-2.5 rounded-lg text-xs transition"
                    >
                      Reset Filters
                    </button>
                  ) : null}
                  <Link
                    href="/"
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg text-xs shadow-sm transition inline-flex items-center gap-1.5"
                  >
                    <Icon icon="mdi:shopping-outline" className="w-4 h-4" />
                    Continue Shopping
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm lg:hidden">
          <div className="bg-white w-4/5 max-w-xs h-full p-5 overflow-y-auto flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Icon icon="mdi:filter-variant" className="w-4 h-4 text-red-600" />
                  Filters
                </h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>
              </div>

              {/* In-Stock Toggle */}
              <div className="mb-4 pb-3 border-b border-gray-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-gray-700">In-Stock Only</span>
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                </label>
              </div>

              {/* Categories */}
              {categoryList.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Category</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs pr-1">
                    {categoryList.map((cat) => (
                      <label key={cat.name} className="flex items-center justify-between py-0.5 cursor-pointer">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.name)}
                            onChange={() => toggleCategory(cat.name)}
                            className="w-3.5 h-3.5 text-red-600 rounded"
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">({cat.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands */}
              {brandList.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Brand</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs pr-1">
                    {brandList.map((b) => (
                      <label key={b.name} className="flex items-center justify-between py-0.5 cursor-pointer">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(b.name)}
                            onChange={() => toggleBrand(b.name)}
                            className="w-3.5 h-3.5 text-red-600 rounded"
                          />
                          <span className="truncate">{b.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">({b.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={resetFilters}
                className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
