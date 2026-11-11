"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "react-feather";
import { FaSortAmountDown, FaSlidersH } from "react-icons/fa";
import ProductCard from "@/components/ProductCard";
import SharedProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";
import Addtocart from "@/components/AddToCart";
import { ToastContainer, toast } from 'react-toastify';
import {
  buildFilterLookupMaps,
  searchParamsToSelectedFilters,
  hasActiveFilterParams,
  normalizeFilterOption,
  slugifyFilter,
  buildFilterGroupsFromList,
  selectionKey,
} from "@/lib/filterUrl";
import { useCategoryFilterUrl } from "@/hooks/useCategoryFilterUrl";
import ProductFilters from "@/components/filters/ProductFilters";
import { CATEGORY_PAGE_SHELL_CLASS } from "@/lib/categoryPageComponents/layout";
import { sortProductsClient } from "@/lib/productSort";

export default function BrandPage() {
  const [brandData, setBrandData] = useState({
    brand: null,
    categories: [],
    filters: []
  });
  const [products, setProducts] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    price: { min: 0, max: 100000 },
    filters: []
  });
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [filterGroups, setFilterGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const { slug } = useParams();
  const [sortOption, setSortOption] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [nofound, setNofound] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSortPanelOpen, setIsSortPanelOpen] = useState(false);
  const [filterUrlReady, setFilterUrlReady] = useState(false);
  const [filterCatalog, setFilterCatalog] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const skipNextFilterFetch = useRef(true);
  const lastFetchedFiltersKeyRef = useRef("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  useCategoryFilterUrl({
    selectedFilters,
    setSelectedFilters,
    filterCatalog,
    brands: filterCatalog?.brands || (brandData.brand ? [brandData.brand] : []),
    filterGroups: filterCatalog?.filterGroups || filterGroups,
    categoryTree: filterCatalog?.categoryTree || brandData.categoryTree || brandData.categories || [],
    subcategoryTree: filterCatalog?.subcategoryTree || brandData.categoryTree || brandData.categories || [],
    priceRange,
    enabled: true,
    ready: filterUrlReady && !!filterCatalog,
    omitUrlKeys: ["brand"],
    onApplyUrlFilters: (hydratedFilters) => {
      fetchFilteredProducts(1, hydratedFilters);
    },
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    totalProducts: 0
  });
  const itemsPerPage = 20;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Fetch initial data
  useEffect(() => {
    if (slug) {
      fetchInitialData();
    }
  }, [slug]);
  
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setFilterUrlReady(false);
      const brandRes = await fetch(`/api/brand/${slug}`);
      const brandData = await brandRes.json();
      
      setBrandData({
        ...brandData,
        categoryTree: brandData.categories,
        allCategoryIds: brandData.allCategoryIds || []
      });

      let minPrice = 0;
      let maxPrice = 100000;
      if (brandData.products?.length > 0) {
        const prices = brandData.products.map(p => p.special_price || p.price);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) {
          minPrice = 0;
        }
        setPriceRange([minPrice, maxPrice]);
      }

      const groups = {};
      (brandData.filters || []).forEach(filter => {
        const groupId = filter.filter_group_id || filter.filter_group_name;
        if (groupId) {
          if (!groups[groupId]) {
            groups[groupId] = {
              _id: groupId,
              name: filter.filter_group_name,
              slug: slugifyFilter(filter.filter_group_name),
              filters: []
            };
          }
          groups[groupId].filters.push(normalizeFilterOption(filter));
        }
      });
      setFilterGroups(groups);

      const categoryTree = brandData.categories || [];
      const lookupMaps = buildFilterLookupMaps({
        brands: brandData.brand ? [brandData.brand] : [],
        filterGroups: groups,
        categoryTree,
        subcategoryTree: categoryTree,
      });
      const urlSearch = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const urlFilters = searchParamsToSelectedFilters(
        urlSearch,
        lookupMaps,
        [minPrice, maxPrice]
      );
      const brandId = brandData.brand?._id ? [brandData.brand._id] : [];
      const nextSelected = {
        categories: urlFilters.categories,
        subcategories: urlFilters.subcategories,
        brands: brandId,
        filters: urlFilters.filters,
        price: hasActiveFilterParams(urlSearch)
          ? urlFilters.price
          : { min: minPrice, max: maxPrice },
      };
      setSelectedFilters(nextSelected);
      setFilterCatalog({
        brands: brandData.brand ? [brandData.brand] : [],
        filterGroups: groups,
        categoryTree,
        subcategoryTree: categoryTree,
      });
      await fetchFilteredProducts(1, nextSelected);
    } catch (error) {
      toast.error("Error fetching initial data");
    } finally {
      setLoading(false);
      setFilterUrlReady(true);
    }
  };
  const handleShare = async (product) => {
    const productUrl = `${window.location.origin}/product/${product.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          url: productUrl,
        });
      } else {
        await navigator.clipboard.writeText(productUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  const fetchFilteredProducts = useCallback(async (pageNum = 1, filtersOverride = null) => {
    try {
      if (!brandData.brand?._id) return;
      setIsFiltering(true);
      const activeFilters = filtersOverride || selectedFilters;
      lastFetchedFiltersKeyRef.current =
        selectionKey(activeFilters) +
        "|" +
        sortOption +
        "|" +
        (brandData.brand?._id || "");
      const query = new URLSearchParams();
      query.set('brands', brandData.brand._id);

      if (activeFilters.categories.length > 0) {
        query.set('categoryIds', activeFilters.categories.join(','));
      }
      if (activeFilters.subcategories.length > 0) {
        query.set('subcategoryIds', activeFilters.subcategories.join(','));
      }

      query.set('page', pageNum);
      query.set('limit', itemsPerPage);
      query.set('minPrice', activeFilters.price.min);
      query.set('maxPrice', activeFilters.price.max);

      if (activeFilters.filters.length > 0) {
        query.set('filters', activeFilters.filters.join(','));
      }
      if (sortOption) {
        query.set('sort', sortOption);
      }

      const res = await fetch(`/api/product/filter/brand/main?${query}`);
      const data = await res.json();
      const products = data.products || [];
      const paginationData = data.pagination || {};

      setProducts(products);
      const groups = buildFilterGroupsFromList(data.filters || []);
      setFilterGroups(groups);
      setFilterCatalog((prev) =>
        prev
          ? { ...prev, filterGroups: { ...prev.filterGroups, ...groups } }
          : prev
      );
      setPagination({
        currentPage: paginationData.currentPage || pageNum,
        totalPages: paginationData.totalPages || 1,
        hasNext: Boolean(paginationData.hasNext),
        hasPrev: Boolean(paginationData.hasPrev),
        totalProducts: paginationData.totalProducts || 0
      });

      if (products.length === 0 && pageNum === 1) {
        setNofound(true);
      } else {
        setNofound(false);
      }
    } catch (error) {
      toast.error('Error fetching products'+error);
    } finally {
      setIsFiltering(false);
    }
  }, [selectedFilters, brandData.brand]);
  
  const handleProductClick = (product) => {
    const stored = JSON.parse(localStorage.getItem('recentlyViewed')) || [];

    const alreadyViewed = stored.find((p) => p._id === product._id);

    const updated = alreadyViewed
      ? stored.filter((p) => p._id !== product._id)
      : stored;

    updated.unshift(product); // Add to beginning

    const limited = updated.slice(0, 10); // Limit to 10 recent products

    localStorage.setItem('recentlyViewed', JSON.stringify(limited));
  };
  
  const [brandMap, setBrandMap] = useState([]);
 
  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error) {
        console.error(result.error);
      } else {
        const data = result.data;
   
        // Store as map for quick access
        const map = {};
        data.forEach((b) => {
          map[b._id] = b.brand_name;
        });
        setBrandMap(map);
      }
    } catch (error) {
      console.error(error.message);
    }
  };
 
  useEffect(() => {
    fetchBrand();
  }, []);

  // Sorting functionality
  /* const getSortedProducts = () => {
    const sortedProducts = [...products];
    switch(sortOption) {
      case 'price-low-high':
        return sortedProducts.sort((a, b) => a.special_price - b.special_price);
      case 'price-high-low':
        return sortedProducts.sort((a, b) => b.special_price - a.special_price);
      case 'name-a-z':
        return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-z-a':
        return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return sortedProducts;
    }
  }; */

  const getSortedProducts = () => {
    return sortProductsClient(products, sortOption);
  };
  
  const handleFilterChange = (type, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      const id = value != null ? String(value) : value;
      const hasId = (list, item) =>
        (list || []).some((x) => String(x) === String(item));

      if (type === 'brands') {
        newFilters.brands = hasId(prev.brands, id)
          ? prev.brands.filter(item => String(item) !== id)
          : [...prev.brands, id];
      } else if (type === 'price') {
        newFilters.price = value;
      } else if (type === 'categories') {
        newFilters.categories = hasId(prev.categories, id)
          ? prev.categories.filter(item => String(item) !== id)
          : [...prev.categories, id];
      } else if (type === 'subcategories') {
        newFilters.subcategories = hasId(prev.subcategories, id)
          ? prev.subcategories.filter(item => String(item) !== id)
          : [...prev.subcategories, id];
      } else {
        newFilters.filters = hasId(prev.filters, id)
          ? prev.filters.filter(item => String(item) !== id)
          : [...prev.filters, id];
      }
      return newFilters;
    });
  };

  const handlePriceChange = (nextValues) => {
    const lo = priceRange[0] ?? 0;
    const hi = priceRange[1] ?? 100000;
    let min = Math.min(hi, Math.max(lo, nextValues[0]));
    let max = Math.min(hi, Math.max(lo, nextValues[1]));
    if (min > max) min = max;
    setSelectedFilters((prev) => ({
      ...prev,
      price: { min, max }
    }));
  };
 
  const [values, setValues] = useState([
    selectedFilters.price.min,
    selectedFilters.price.max,
  ]);

  useEffect(() => {
    setValues([selectedFilters.price.min, selectedFilters.price.max]);
  }, [selectedFilters.price.min, selectedFilters.price.max]);

  const categoryTreeForFilters = brandData.categoryTree || brandData.categories || [];

  const findCategoryNode = (nodes, predicate) => {
    for (const node of nodes || []) {
      if (predicate(node)) return node;
      const nested = findCategoryNode(node.subCategories || node.subcategories, predicate);
      if (nested) return nested;
    }
    return null;
  };

  useEffect(() => {
    const catId = selectedFilters.categories?.[0];
    const subId = selectedFilters.subcategories?.[0];
    const catNode = catId
      ? findCategoryNode(categoryTreeForFilters, (n) => String(n._id) === String(catId))
      : null;
    const subNode = subId
      ? findCategoryNode(categoryTreeForFilters, (n) => String(n._id) === String(subId))
      : null;
    setSelectedCategory(catNode?.category_name || "");
    setSelectedSubCategory(subNode?.category_name || "");
  }, [selectedFilters.categories, selectedFilters.subcategories, brandData.categoryTree, brandData.categories]);

  const handleSelectCategory = (name) => {
    setSelectedCategory(name || "");
    setSelectedSubCategory("");
    if (!name) {
      setSelectedFilters((prev) => ({ ...prev, categories: [], subcategories: [] }));
      return;
    }
    const node = findCategoryNode(
      categoryTreeForFilters,
      (n) => n.category_name === name
    );
    setSelectedFilters((prev) => ({
      ...prev,
      categories: node?._id ? [String(node._id)] : [],
      subcategories: [],
    }));
  };

  const handleSelectSubCategory = (name) => {
    setSelectedSubCategory(name || "");
    if (!name) {
      setSelectedFilters((prev) => ({ ...prev, subcategories: [] }));
      return;
    }
    const node = findCategoryNode(
      categoryTreeForFilters,
      (n) => n.category_name === name
    );
    setSelectedFilters((prev) => ({
      ...prev,
      subcategories: node?._id ? [String(node._id)] : [],
    }));
  };

  useEffect(() => {
    if (brandData.brand && filterUrlReady) {
      const key =
        selectionKey(selectedFilters) +
        "|" +
        sortOption +
        "|" +
        (brandData.brand?._id || "");
      if (key === lastFetchedFiltersKeyRef.current) {
        return;
      }
      fetchFilteredProducts(1);
    }
  }, [selectedFilters, brandData.brand, filterUrlReady, sortOption]);

  const clearAllFilters = () => {
    setSelectedFilters({
      categories: [],
      subcategories: [],
      brands: [brandData.brand?._id],
      price: { min: priceRange[0], max: priceRange[1] },
      filters: []
    });
    setSelectedCategory("");
    setSelectedSubCategory("");
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchFilteredProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    const hasPrev = pagination.currentPage > 1;
    const hasNext = pagination.currentPage < pagination.totalPages;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md ${
            pagination.currentPage === i
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex justify-center items-center mt-8 space-x-2">
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!hasPrev}
          className={`p-2 rounded-md ${!hasPrev ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          <ChevronLeft size={16} />
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1 rounded-md bg-white text-gray-700 hover:bg-gray-100"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}
        
        {pages}
        
        {endPage < pagination.totalPages && (
          <>
            {endPage < pagination.totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => handlePageChange(pagination.totalPages)}
              className="px-3 py-1 rounded-md bg-white text-gray-700 hover:bg-gray-100"
            >
              {pagination.totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!hasNext}
          className={`p-2 rounded-md ${!hasNext ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  if ((loading && !filterUrlReady) || (!brandData.brand && !filterUrlReady)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CATEGORY_PAGE_SHELL_CLASS} py-2 pb-3`}>
      {brandData.brand ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {brandData.brand?.image && (
                <div className="w-32 h-12 relative mb-4">
                  <Image
                    src={brandData.brand.image.startsWith('http') ? brandData.brand.image : `/uploads/Brands/${brandData.brand.image}`}
                    alt={brandData.brand.brand_name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div className="lg:col-span-3">
              {/* Sorting and Count */}
              <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-sm text-gray-600">{pagination.totalProducts} products found</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Featured</option>
                    <option value="price-low-high">Price: Low to High</option>
                    <option value="price-high-low">Price: High to Low</option>
                    <option value="name-a-z">Name: A-Z</option>
                    <option value="name-z-a">Name: Z-A</option>
                    <option value="quantity-low-to-high">Quantity: Low to High</option>
                    <option value="quantity-high-to-low">Quantity: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex border-b border-gray-300 bg-gray-100 sticky top-0 z-30 lg:hidden mb-3">
            <button
              className="flex items-center justify-center gap-2 py-4 flex-1 text-sm font-medium text-gray-800 border-r border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setIsSortPanelOpen(true)}
            >
              <FaSortAmountDown className="text-gray-500 text-xs" />
              SORT
            </button>
            <button
              className="flex items-center justify-center gap-2 py-4 flex-1 text-sm font-medium text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setIsFilterPanelOpen(true)}
            >
              <FaSlidersH className="text-gray-500 text-xs" />
              FILTER
            </button>
          </div>

          {isSortPanelOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 lg:hidden">
              <div className="bg-white w-full rounded-t-2xl p-5">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-lg font-semibold">Sort By</h2>
                  <button onClick={() => setIsSortPanelOpen(false)}>✕</button>
                </div>
                <ul className="divide-y divide-gray-200 text-sm">
                  {[
                    ["", "Featured"],
                    ["price-low-high", "Price: Low to High"],
                    ["price-high-low", "Price: High to Low"],
                    ["name-a-z", "Name: A-Z"],
                    ["name-z-a", "Name: Z-A"],
                  ].map(([value, label]) => (
                    <li
                      key={value || "featured"}
                      className={`py-3 cursor-pointer ${sortOption === value ? "text-blue-600 font-semibold" : "text-gray-700"}`}
                      onClick={() => {
                        setSortOption(value);
                        setIsSortPanelOpen(false);
                      }}
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <ProductFilters
              variant="both"
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
              onPriceChange={handlePriceChange}
              brands={brandData.brand ? [brandData.brand] : []}
              filterGroups={filterGroups}
              priceRange={priceRange}
              values={values}
              setValues={setValues}
              categoryTree={categoryTreeForFilters}
              showCategories={categoryTreeForFilters.length > 0}
              showBrands={false}
              selectedCategory={selectedCategory}
              setSelectedCategory={handleSelectCategory}
              selectedSubCategory={selectedSubCategory}
              setSelectedSubCategory={handleSelectSubCategory}
              isFilterPanelOpen={isFilterPanelOpen}
              setIsFilterPanelOpen={setIsFilterPanelOpen}
            />
            {isFiltering && (
              <div className="fixed top-20 right-4 z-40 bg-white shadow px-3 py-2 rounded text-sm text-gray-600 border">
                Updating results...
              </div>
            )}

            {/* Products Section */}
            <div className="flex-1">
              {products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {getSortedProducts().map((product, index) => (
                      <SharedProductCard 
                        key={`${product._id}-${index}`}
                        product={normalizeProduct(product, brandMap)}
                        onProductClick={handleProductClick}
                        compactMobile={true}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {renderPagination()}
                </>
              ) : (
                <div className="text-center py-10">
                  <img 
                    src="/images/no-productbox.png" 
                    alt="No Products" 
                    className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 object-contain" 
                  />
                </div>
              )}

              {isFiltering && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <img 
            src="/images/no-productbox.png" 
            alt="No Products" 
            className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 object-contain" 
          />
        </div>
      )}
      <ToastContainer />
    </div>
  );
}