"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { FaSortAmountDown, FaSlidersH, FaShareAlt } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from "react-feather";
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

export default function CategoryBrandComponent({ categorySlug, brandSlug }) {
  const [categoryData, setCategoryData] = useState({
    category: null,
    brand: null,
    categories: [],
    filters: [],
    allCategoryIds: []
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSortPanelOpen, setIsSortPanelOpen] = useState(false);
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
  const [filterUrlReady, setFilterUrlReady] = useState(false);
  const [filterCatalog, setFilterCatalog] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const skipNextFilterFetch = useRef(true);
  const lastFetchedFiltersKeyRef = useRef("");
  const resolvedSlugsRef = useRef({ categorySlug, brandSlug, brandId: null });
  const [sortOption, setSortOption] = useState('');
  const [wishlist, setWishlist] = useState([]); 
  const [nofound, setNofound] = useState(false);
  const [brandMap, setBrandMap] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  useCategoryFilterUrl({
    selectedFilters,
    setSelectedFilters,
    filterCatalog,
    brands: filterCatalog?.brands || (categoryData.brand ? [categoryData.brand] : []),
    filterGroups: filterCatalog?.filterGroups || filterGroups,
    categoryTree: filterCatalog?.categoryTree || categoryData.categories || [],
    subcategoryTree: filterCatalog?.subcategoryTree || categoryData.categories || [],
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
  const itemsPerPage = 12;


  // Fetch initial data
  useEffect(() => {
    //alert('ssss');
    if (categorySlug && brandSlug) {
      fetchInitialData();
      fetchBrand();
    }
  }, [categorySlug, brandSlug]);
  
  const fetchInitialData = async () => {
 
    try {
      setLoading(true);
      setFilterUrlReady(false);
      const res = await fetch(`/api/brand/categories/${categorySlug}/brand/${brandSlug}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setProducts([]);
        setNofound(true);
        setLoading(false);
        setFilterUrlReady(true);
        return;
      }
      if (data.category?.category_slug && data.brand?.brand_slug) {
        resolvedSlugsRef.current = {
          categorySlug: data.category.category_slug,
          brandSlug: data.brand.brand_slug,
          brandId: data.brand._id,
        };
      }
      setCategoryData({
        ...data,
        allCategoryIds: data.allCategoryIds || []
      });

      let minPrice = 0;
      let maxPrice = 100000;
      if (data.products?.length > 0) {
        const prices = data.products.map(p => p.special_price || p.price);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
        if(minPrice === maxPrice) {
          minPrice = 0; // Ensure a range
        }
        setPriceRange([minPrice, maxPrice]);
      }

      const groups = {};
      (data.filters || []).forEach(filter => {
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

      const lookupMaps = buildFilterLookupMaps({
        brands: data.brand ? [data.brand] : [],
        filterGroups: groups,
        categoryTree: data.categories || [],
        subcategoryTree: data.categories || [],
      });
      const urlSearch = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const urlFilters = searchParamsToSelectedFilters(
        urlSearch,
        lookupMaps,
        [minPrice, maxPrice]
      );
      const brandId = data.brand?._id ? [data.brand._id] : [];
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
        brands: data.brand ? [data.brand] : [],
        filterGroups: groups,
        categoryTree: data.categories || [],
        subcategoryTree: data.categories || [],
      });
      await fetchFilteredProducts(1, nextSelected);
    } catch (error) {
      toast.error("Error fetching initial data");
    } finally {
      setLoading(false);
      setFilterUrlReady(true);
    }
  };
   const fetchFilteredProducts = useCallback(async (pageNum = 1, filtersOverride = null) => {
  try {
    setIsFiltering(true);
    const activeFilters = filtersOverride || selectedFilters;
    lastFetchedFiltersKeyRef.current =
      selectionKey(activeFilters) +
      "|" +
      sortOption +
      "|" +
      (categoryData.brand?._id || "") +
      "|" +
      categorySlug +
      "|" +
      brandSlug;
    const query = new URLSearchParams();

    const activeCatSlug = resolvedSlugsRef.current.categorySlug || categoryData.category?.category_slug || categorySlug;
    const activeBrSlug = resolvedSlugsRef.current.brandSlug || categoryData.brand?.brand_slug || brandSlug;
    const currentBrandId = resolvedSlugsRef.current.brandId || categoryData.brand?._id;

    // ✅ Always restrict by brand
    if (currentBrandId) {
      query.set('brands', currentBrandId);
    }

    if (activeFilters.categories.length > 0) {
      query.set('categoryIds', activeFilters.categories.join(','));
    }

    if (activeFilters.subcategories.length > 0) {
      query.set('subcategoryIds', activeFilters.subcategories.join(','));
    }

    query.set('categorySlug', activeCatSlug);
    query.set('brandSlug', activeBrSlug);

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
    const res = await fetch(`/api/product/filter/category-brand/main?${query}`);
    const { products, pagination: paginationData, filters } = await res.json();
    setProducts(products || []);
    const groups = buildFilterGroupsFromList(filters || []);
    setFilterGroups(groups);
    setFilterCatalog((prev) =>
      prev
        ? { ...prev, filterGroups: { ...prev.filterGroups, ...groups } }
        : prev
    );

    if ((!products || products.length === 0) && pageNum === 1) {
      setNofound(true);
    } else {
      setNofound(false);
    }

    if (paginationData) {
      setPagination({
        currentPage: paginationData.currentPage || 1,
        totalPages: paginationData.totalPages || 1,
        hasNext: paginationData.hasNext || false,
        hasPrev: paginationData.hasPrev || false,
        totalProducts: paginationData.totalProducts || 0
      });
    }
  } catch (error) {
    toast.error('Error fetching products: ' + error.message);
  } finally {
    setIsFiltering(false);
  }
}, [selectedFilters, categoryData.brand, categorySlug, brandSlug]);

  // const fetchFilteredProducts = useCallback(async (pageNum = 1) => {
  //   try {
  //     setLoading(true);
  //     const query = new URLSearchParams();
      
  //     // Filter by the current brand
  //     if (categoryData.brand?._id) {
  //       query.set('brands', categoryData.brand._id);
  //     }
      
  //     // Add category filters
  //     if (selectedFilters.categories.length > 0) {
  //       query.set('categoryIds', selectedFilters.categories.join(','));
  //     } else if (categoryData.allCategoryIds?.length > 0) {
  //       query.set('categoryIds', categoryData.allCategoryIds.join(','));
  //     }
      
  //     // Add subcategory filters if any
  //     if (selectedFilters.subcategories.length > 0) {
  //       query.set('subcategoryIds', selectedFilters.subcategories.join(','));
  //     }
      
  //     query.set('page', pageNum);
  //     query.set('limit', itemsPerPage);
  //     query.set('minPrice', selectedFilters.price.min);
  //     query.set('maxPrice', selectedFilters.price.max);
      
  //     if (selectedFilters.filters.length > 0) {
  //       query.set('filters', selectedFilters.filters.join(','));
  //     }

  //     const res = await fetch(`/api/product/filter/category-brand/main?${query}`);
  //     const { products, pagination: paginationData } = await res.json();

  //     setProducts(products || []);
      
  //     // Update pagination state
  //     if (paginationData) {
  //       setPagination({
  //         currentPage: paginationData.currentPage || 1,
  //         totalPages: paginationData.totalPages || 1,
  //         hasNext: paginationData.hasNext || false,
  //         hasPrev: paginationData.hasPrev || false,
  //         totalProducts: paginationData.totalProducts || 0
  //       });
  //     }
      
  //     if ((!products || products.length === 0) && pageNum === 1) {
  //       setNofound(true);
  //     } else {
  //       setNofound(false);
  //     }
  //   } catch (error) {
  //     toast.error('Error fetching products: ' + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [selectedFilters, categoryData]);
  
  const handleProductClick = (product) => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
      const alreadyViewed = stored.find((p) => p._id === product._id);
      const updated = alreadyViewed
        ? stored.filter((p) => p._id !== product._id)
        : stored;

      updated.unshift(product); // Add to beginning
      const limited = updated.slice(0, 10); // Limit to 10 recent products
      localStorage.setItem('recentlyViewed', JSON.stringify(limited));
    } catch (error) {
      console.error("Error saving to recently viewed:", error);
    }
  };

  // Sorting functionality
  /* const getSortedProducts = () => {
    const sortedProducts = [...products];
    switch(sortOption) {
      case 'price-low-high':
        return sortedProducts.sort((a, b) => (a.special_price || a.price) - (b.special_price || b.price));
      case 'price-high-low':
        return sortedProducts.sort((a, b) => (b.special_price || b.price) - (a.special_price || a.price));
      case 'name-a-z':
        return sortedProducts.sort((a, b) => { if (a.name.toLowerCase() === 'capacity') return -1; if (b.name.toLowerCase() === 'capacity') return 1; return a.name.localeCompare(b.name); });
      case 'name-z-a':
        return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return sortedProducts;
    }
  }; */

      const getSortedProducts = () => {
        return sortProductsClient(products, sortOption);
      };

  const sortFilterValues = (a, b) => {
    const extractNum = (str) => {
      const match = str.match(/[\d.]+/);
      if (!match) return null;
      let num = parseFloat(match[0]);
      if (/TB/i.test(str)) num *= 1024;
      else if (/MB/i.test(str)) num /= 1024;
      if (/^(below|up to|upto|less than|under)/i.test(str)) return num - 0.5;
      if (/^(above|more than|over)/i.test(str)) return num + 0.5;
      return num;
    };
    const numA = extractNum(a.filter_name);
    const numB = extractNum(b.filter_name);
    if (numA !== null && numB !== null) return numA - numB;
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return a.filter_name.localeCompare(b.filter_name);
  };

  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error || (!Array.isArray(result?.data) && !Array.isArray(result))) {
        if (result.error) console.warn("Brand fetch:", result.error);
      } else {
        const data = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
        // Store as map for quick access
        const map = {};
        data.forEach((b) => {
          if (b?._id) {
            map[b._id] = b.brand_name;
          }
        });
        setBrandMap(map);
      }
    } catch (error) {
      console.warn("Could not fetch brand:", error.message);
    }
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

    // ###### B2125 ###### //
    // if (min >= max) {
    //   max = min + 1;
    // }

    setSelectedFilters((prev) => ({
      ...prev,
      price: { min, max }
    }));
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

  const STEP = 100;
  const MIN = priceRange[0] || 0;
  const MAX = priceRange[1] || 100000;

  // slider local state
  const [values, setValues] = useState([
    selectedFilters.price.min,
    selectedFilters.price.max,
  ]);

  // sync with external filters (e.g. reset button)
  useEffect(() => {
    setValues([selectedFilters.price.min, selectedFilters.price.max]);
  }, [selectedFilters.price.min, selectedFilters.price.max]);

  const categoryTreeForFilters = categoryData.categories || [];

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
  }, [selectedFilters.categories, selectedFilters.subcategories, categoryData.categories]);

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
    if (categoryData.brand && filterUrlReady) {
      const key =
        selectionKey(selectedFilters) +
        "|" +
        sortOption +
        "|" +
        (categoryData.brand?._id || "") +
        "|" +
        categorySlug +
        "|" +
        brandSlug;
      if (key === lastFetchedFiltersKeyRef.current) {
        return;
      }
      fetchFilteredProducts(1);
    }
  }, [selectedFilters, categoryData.brand, filterUrlReady, sortOption, categorySlug, brandSlug]);

  const clearAllFilters = () => {
    setSelectedFilters({
      categories: [],
      subcategories: [],
      brands: [categoryData.brand?._id], // Keep the current brand selected
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
              ? 'bg-[#d72828] text-white'
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

  if ((loading && !filterUrlReady) || (!categoryData.brand && pagination.currentPage === 1 && !filterUrlReady)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CATEGORY_PAGE_SHELL_CLASS} py-2 pb-3`}>
      {/* Breadcrumb */}
    

      {categoryData.brand ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {categoryData.brand?.image && (
                <div className="w-32 h-12 relative mb-4">
                  <Image
                    src={categoryData.brand.image.startsWith('http') ? categoryData.brand.image : `/uploads/Brands/${categoryData.brand.image}`}
                    alt={categoryData.brand.brand_name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div className="lg:col-span-3">
    {/* Mobile: Products count at top */}
    <div className="sm:hidden mb-4">
      <p className="text-sm text-gray-600">{pagination.totalProducts} products found</p>
    </div>
    
    {/* Desktop: Products count and sort together */}
    <div className="hidden sm:flex justify-between items-center mb-3">
      <p className="text-sm text-gray-600">{pagination.totalProducts} products found</p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Sort by:</span>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="px-4 py-2 border rounded-md text-sm bg-white shadow-sm focus:ring-2 focus:ring-red-500 focus:border-[#d72828]"
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

           {/* Mobile Sort + Filter Buttons */}
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

               {/* Mobile Sort Modal */}
          {isSortPanelOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 lg:hidden">
              <div className="bg-white w-full rounded-t-2xl p-5">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-lg font-semibold">Sort By</h2>
                  <button onClick={() => setIsSortPanelOpen(false)}>✕</button>
                </div>

                <div className="space-y-4">
                  {/* <label className="block text-gray-600 text-sm font-medium mb-2">Sort by</label> */}
                <ul className="divide-y divide-gray-200 text-sm">
            <li
              className={`py-3 cursor-pointer ${sortOption === '' ? 'text-[#d72828] font-semibold' : 'text-gray-700'}`}
              onClick={() => {
                setSortOption('');
                setIsSortPanelOpen(false);
              }}
            >
              Featured
            </li>
            <li
              className={`py-3 cursor-pointer ${sortOption === 'price-low-high' ? 'text-[#d72828] font-semibold' : 'text-gray-700'}`}
              onClick={() => {
                setSortOption('price-low-high');
                setIsSortPanelOpen(false);
              }}
            >
              Price: Low to High
            </li>
            <li
              className={`py-3 cursor-pointer ${sortOption === 'price-high-low' ? 'text-[#d72828] font-semibold' : 'text-gray-700'}`}
              onClick={() => {
                setSortOption('price-high-low');
                setIsSortPanelOpen(false);
              }}
            >
              Price: High to Low
            </li>
            <li
              className={`py-3 cursor-pointer ${sortOption === 'name-a-z' ? 'text-[#d72828] font-semibold' : 'text-gray-700'}`}
              onClick={() => {
                setSortOption('name-a-z');
                setIsSortPanelOpen(false);
              }}
            >
              Name: A-Z
            </li>
            <li
              className={`py-3 cursor-pointer ${sortOption === 'name-z-a' ? 'text-[#d72828] font-semibold' : 'text-gray-700'}`}
              onClick={() => {
                setSortOption('name-z-a');
                setIsSortPanelOpen(false);
              }}
            >
              Name: Z-A
            </li>
          </ul>

                </div>
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
              brands={[]}
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

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
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
      
    </div>
  );
}