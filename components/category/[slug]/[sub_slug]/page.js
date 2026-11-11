"use client";
import React, { useState, useEffect, useCallback,useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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
  selectionKey,
} from "@/lib/filterUrl";
import { useCategoryFilterUrl } from "@/hooks/useCategoryFilterUrl";
import ProductFilters from "@/components/filters/ProductFilters";
import { CATEGORY_PAGE_SHELL_CLASS } from "@/lib/categoryPageComponents/layout";
import { sortProductsClient } from "@/lib/productSort";


export default function CategoryPage() {
  const [categoryData, setCategoryData] = useState({
    category: null,
    brands: [],
    filters: []
  });
  
  //console.log(categoryData);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    categories: [],
    brands: [],
    price: { min: 0, max: 100000 },
    filters: []
  });
  const [filterUrlReady, setFilterUrlReady] = useState(false);
  const [filterCatalog, setFilterCatalog] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const filterGroupsRef = useRef({});
  const filterCatalogRef = useRef(null);
  const categoryDataRef = useRef({ category: null, brands: [], filters: [] });
  const skipNextFilterFetch = useRef(true);
  const lastFetchedFiltersKeyRef = useRef("");
  
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSortPanelOpen, setIsSortPanelOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [filterGroups, setFilterGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const { slug,sub_slug } = useParams();
  const [sortOption, setSortOption] = useState('');
  const [wishlist, setWishlist] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [childCategoryTree, setChildCategoryTree] = useState([]);
 
   const selectedChildCategoryRef = useRef("");

  filterGroupsRef.current = filterGroups;
  filterCatalogRef.current = filterCatalog;
  categoryDataRef.current = categoryData;

  useCategoryFilterUrl({
    selectedFilters,
    setSelectedFilters,
    filterCatalog,
    brands: filterCatalog?.brands || categoryData.brands || [],
    filterGroups: filterCatalog?.filterGroups || filterGroups,
    categoryTree: filterCatalog?.categoryTree || childCategoryTree,
    priceRange,
    enabled: true,
    ready: filterUrlReady && !!filterCatalog,
    onApplyUrlFilters: (hydratedFilters) => {
      fetchFilteredProducts(categoryDataRef.current, 1, false, hydratedFilters);
    },
  });

 
  const handleShare = async (product) => {
    const productUrl = `${window.location.origin}/category/${slug}/${sub_slug}/${product.slug}`;
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
  const [nofound,setNofound]=useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter(); // Added router

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    totalProducts: 0
  });
  const itemsPerPage = 24;








  // Fetch initial data
  useEffect(() => {
    if (sub_slug) {
      fetchInitialData();
    }
  }, [sub_slug]);

 const scrollRef = useRef(null);

const scroll = (direction) => {
  const container = scrollRef.current;
  if (!container) return;

  const cardWidth = 320 + 24; // card width + gap
  const visibleCards = 3;
  const scrollAmount = cardWidth * visibleCards;

  if (direction === "left") {
    container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  } else {
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
};



  const fetchInitialData = async () => {
    try {
      const categoryRes = await fetch(
        `/api/categories/${sub_slug}?parent=${encodeURIComponent(slug || "")}`
      );
      if (!categoryRes.ok) {
        router.push("/noproduct");
        return;
      }
      const categoryData = await categoryRes.json();
      if (!categoryData?.main_category) {
        router.push("/noproduct");
        return;
      }
      //console.log('categoryData: ',categoryData);
      setCategoryData({
        ...categoryData,
        categoryTree: categoryData.category,
        allCategoryIds: categoryData.allCategoryIds
      });

      let children = [];
      if (categoryData.category?.length > 0) {
        children = categoryData.category.map(c => ({
          _id: c._id,
          category_name: c.category_name,
          category_slug: c.category_slug,
          allIds: [c._id, ...(c.subCategories || []).map(s => s._id)]
        }));
        setChildCategoryTree(children);
      }

      let minPrice = 0;
      let maxPrice = 100000;
      if (categoryData.products?.length > 0) {
        // ✅ special_price இல்லன்னா price use பண்ணு, இரண்டும் இல்லன்னா 0
        const prices = categoryData.products
          .map(p => Number(p.special_price) > 0 ? Number(p.special_price) : Number(p.price))
          .filter(p => !isNaN(p) && p > 0);

        minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        maxPrice = prices.length > 0 ? Math.max(...prices) : 100000;

        // ✅ min === max buffer
        if (minPrice === maxPrice) {
          minPrice = Math.max(0, minPrice - 100);
          maxPrice = maxPrice + 100;
        }

        // ✅ Final safety check - NaN 
        if (isNaN(minPrice) || isNaN(maxPrice)) {
          minPrice = 0;
          maxPrice = 100000;
        }
      }

      setPriceRange([minPrice, maxPrice]);

      const groups = {};
      (categoryData.filters || []).forEach(filter => {
        const groupId = filter.filter_group_name;
        if (groupId) {
          if (!groups[groupId]) {
            groups[groupId] = {
              _id: groupId,
              name: filter.filter_group_name,
              slug: slugifyFilter(filter.filter_group_name),
              filters: []
            };
          }
          const option = normalizeFilterOption(filter);
          const exists = groups[groupId].filters.some(
            (f) => String(f._id) === String(option._id)
          );
          if (!exists) groups[groupId].filters.push(option);
        }
      });

      setFilterGroups(groups);

      // SEO filter URL → IDs before first product fetch
      const lookupMaps = buildFilterLookupMaps({
        brands: categoryData.brands || [],
        filterGroups: groups,
        categoryTree: children,
      });
      const urlSearch = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const urlFilters = searchParamsToSelectedFilters(
        urlSearch,
        lookupMaps,
        [minPrice, maxPrice]
      );
      const nextSelected = {
        categories: urlFilters.categories,
        brands: urlFilters.brands,
        filters: urlFilters.filters,
        price: hasActiveFilterParams(urlSearch)
          ? urlFilters.price
          : { min: minPrice, max: maxPrice },
      };
      setSelectedFilters(nextSelected);

      const catalogObj = {
        brands: categoryData.brands || [],
        filterGroups: groups,
        categoryTree: children,
      };
      setFilterGroups(groups);
      filterGroupsRef.current = groups;
      setFilterCatalog(catalogObj);
      filterCatalogRef.current = catalogObj;

      if (categoryData.products?.length > 0) {
        await fetchFilteredProducts(categoryData, 1, true, nextSelected);
      } else {
        // Redirect to 404 if no products found
        router.push('/noproduct');
      }
    } catch (error) {
      toast.error("Error fetching initial data");
      // Redirect to 404 on error as well
      router.push('/noproduct');
    } finally {
      setLoading(false);
      setFilterUrlReady(true);
    }
  };
 
  const fetchFilteredProducts = useCallback(async (categoryData, pageNum = 1, initialLoad = false, filtersOverride = null) => {
    try {
      if (!initialLoad) {
      window.scrollTo({ top: 0, behavior: 'instant' }); 
      setIsFiltering(true);
      } else {
      setLoading(true);
      }
      const activeFilters = filtersOverride || selectedFilters;
      lastFetchedFiltersKeyRef.current =
        selectionKey(activeFilters) +
        "|" +
        sortOption +
        "|" +
        selectedChildCategory;
      const query = new URLSearchParams();
      const categoryIds = activeFilters.categories.length > 0
        ? activeFilters.categories
        : categoryData.allCategoryIds;

      if (categoryIds && categoryIds.length > 0) {
        query.set('categoryIds', categoryIds.join(','));
      }
      if (categoryData.main_category?.md5_cat_name) {
        query.set('sub_category_new', categoryData.main_category.md5_cat_name);
      }
       const activeChild = selectedChildCategoryRef.current;
        if (activeChild) {
           const node = childCategoryTree.find(c => c.category_name === activeChild);
          if (node) {
    query.set('categoryIds', node.allIds.join(','));
            }
          }
      query.set('page', pageNum);
      query.set('limit', itemsPerPage);

      if (activeFilters.brands.length > 0) {
        query.set('brands', activeFilters.brands.join(','));
      }
      query.set('minPrice', activeFilters.price.min);
      query.set('maxPrice', activeFilters.price.max);
      
      if (activeFilters.filters.length > 0) {
        // Group filter IDs by their filter group name
        // This enables AND-between-groups, OR-within-group logic in the API
        const filtersByGroup = {};
        const groupsSource = filterCatalogRef.current?.filterGroups || filterGroupsRef.current;
        activeFilters.filters.forEach(filterId => {
          for (const group of Object.values(groupsSource || {})) {
            if (group.filters?.some(f => f._id === filterId || String(f._id) === String(filterId))) {
              if (!filtersByGroup[group.name]) filtersByGroup[group.name] = [];
              filtersByGroup[group.name].push(filterId);
              break;
            }
          }
        });
        if (Object.keys(filtersByGroup).length > 0) {
          query.set('filterGroups', JSON.stringify(filtersByGroup));
        }
        query.set('filters', activeFilters.filters.join(','));
      }

      if (sortOption) {
        query.set('sort', sortOption);
      }

      const res = await fetch(`/api/product/filter/main?${query}`);
     const data = await res.json();
     const { products, pagination: paginationData, brands: filteredBrands } = data;
     const filteredFilters = data.filters || [];
     
       setProducts(products);

      // ✅ Brand update — category based
      if (filteredBrands && filteredBrands.length > 0) {
      setCategoryData(prev => ({
      ...prev,
      brands: filteredBrands,
      }));
      setFilterCatalog((prev) =>
        prev
          ? {
              ...prev,
              brands: (() => {
                const byId = new Map();
                for (const b of [...(prev.brands || []), ...filteredBrands]) {
                  const id = b?._id?.toString?.() || b?._id;
                  if (id) byId.set(String(id), b);
                }
                return [...byId.values()];
              })(),
            }
          : prev
      );
      }
       if (filteredFilters) {
      const groups = {};
      filteredFilters.forEach(filter => {
        const groupId = filter.filter_group_name;
        if (groupId) {
          if (!groups[groupId]) {
            groups[groupId] = {
              _id: groupId,
              name: filter.filter_group_name,
              slug: slugifyFilter(filter.filter_group_name),
              filters: []
            };
          }
          const option = normalizeFilterOption(filter);
          const exists = groups[groupId].filters.some(
            (f) => String(f._id) === String(option._id)
          );
          if (!exists) groups[groupId].filters.push(option);
        }
      });
      setFilterGroups(groups);
      setFilterCatalog((prev) =>
        prev ? { ...prev, filterGroups: { ...prev.filterGroups, ...groups } } : prev
      );
    }  
      // Update pagination state
      setPagination({
        currentPage: paginationData.currentPage,
        totalPages: paginationData.totalPages,
        hasNext: paginationData.hasNext,
        hasPrev: paginationData.hasPrev,
        totalProducts: paginationData.totalProducts
      });
      
      if (products.length === 0 && pageNum === 1) {
        setNofound(true);
      } else {
        setNofound(false);
      }
    } catch (error) {
      toast.error('Error fetching products'+error);
      // Redirect to 404 on error as well
      router.push('/noproduct');
    } finally {
      if (initialLoad) setLoading(false);
      else setIsFiltering(false);
    }
  },  [selectedFilters, selectedChildCategory, childCategoryTree, sortOption]);

 
  
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


    // Sorting functionality
    const getSortedProducts = () => {
      return sortProductsClient(products, sortOption);
    };

   const [brandMap, setBrandMap] = useState([]);
  
  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error || !Array.isArray(result?.data)) {
        if (result.error) console.warn("Brand fetch:", result.error);
      } else {
        const data = result.data;
  
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
      console.warn("Could not fetch brands:", error.message);
    }
  };
  
  useEffect(() => {
    fetchBrand();
  }, []);

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
      } else  if (type === 'categories') {
        newFilters.categories = hasId(prev.categories, id)
          ? prev.categories.filter(item => String(item) !== id)
          : [...prev.categories, id];
      }
       else {
        newFilters.filters = hasId(prev.filters, id)
          ? prev.filters.filter(item => String(item) !== id)
          : [...prev.filters, id];
      }
      return newFilters;
    });
  };


    const handlePriceChange = (values) => {
    let min = Math.max(1, values[0]);     // clamp to >= 1
    let max = Math.max(1, values[1]);   // clamp to <= 100
  
    // Ensure min never exceeds max
    if (min > max) {
      min = max;
    }
  
    setSelectedFilters((prev) => ({
      ...prev,
      price: { min, max }
    }));
  };
  
  const STEP = 100;
    const MIN = priceRange[0];
    const MAX = priceRange[1];
  
    // slider local state
    const [values, setValues] = useState([
      selectedFilters.price.min,
      selectedFilters.price.max,
    ]);
  
     // sync with external filters (e.g. reset button)
      useEffect(() => {
        setValues([selectedFilters.price.min, selectedFilters.price.max]);
      }, [selectedFilters.price.min, selectedFilters.price.max]);


  useEffect(() => {
    if (categoryData.main_category && categoryData.category && filterUrlReady) {
      const key =
        selectionKey(selectedFilters) +
        "|" +
        sortOption +
        "|" +
        selectedChildCategory;
      if (key === lastFetchedFiltersKeyRef.current) {
        return;
      }
      fetchFilteredProducts(categoryData, 1);
    }
  }, [selectedFilters, selectedChildCategory, sortOption, categoryData.main_category, categoryData.category, filterUrlReady]);

  const clearAllFilters = () => {
    setSelectedFilters({
      categories: [],
      brands: [],
      price: { min: priceRange[0], max: priceRange[1] },
      filters: []
    });
    setSelectedChildCategory(""); 
    selectedChildCategoryRef.current = "";
  };


const handlePageChange = (page) => {
  if (page >= 1 && page <= pagination.totalPages) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      fetchFilteredProducts(categoryData, page);
    }, 50);
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

  if ((loading && !filterUrlReady) || (!categoryData.main_category && !filterUrlReady)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
        </div>
      </div>
    );
  }

  if (!categoryData.main_category) {
    return null;
  }


//console.log('categoryData: ',categoryData);

  return (
    <div className={`${CATEGORY_PAGE_SHELL_CLASS} py-2 pb-3`}>
{/* Categories Circle Section - Dynamic based on subcategories */}

{categoryData?.categoryTree?.length > 0 && (
  <div className="relative my-12 px-6">
    {/* Left arrow */}
    <button
      onClick={() => scroll("left")}
      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 p-3 rounded-full shadow-md hidden md:flex items-center justify-center"
    >
      <span className="text-2xl font-bold text-gray-700">{`‹`}</span>
    </button>

    {/* Right arrow */}
    <button
      onClick={() => scroll("right")}
      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 p-3 rounded-full shadow-md hidden md:flex items-center justify-center"
    >
      <span className="text-2xl font-bold text-gray-700">{`›`}</span>
    </button>

    {/* Scroll container */}
    <div
      ref={scrollRef}
      className={`flex ${
        categoryData.categoryTree.length > 3
          ? "overflow-x-auto scroll-smooth hide-scrollbar"
          : "justify-center flex-wrap gap-6"
      } py-4`}
      style={{
        scrollSnapType: "x mandatory",
        scrollPadding: "0 24px",
        gap: "24px",
        maxWidth: "calc((320px * 3) + (24px * 2))",
        margin: "0 auto",
      }}
    >
      {categoryData.categoryTree.map((subcategory) => (
        <Link
          key={subcategory._id}
          href={`/category/${slug}/${sub_slug}/${subcategory.category_slug}`}
          className="flex flex-row items-center flex-shrink-0 w-[320px] h-[264px] border border-gray-200 rounded-xl bg-white hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:bg-gray-50"
          style={{ scrollSnapAlign: "start" }}
        >
          {/* Image section */}
          <div className="flex justify-center items-center w-[150px] h-full ml-4 flex-shrink-0">
            <div className="relative w-[170px] h-[220px] flex items-center justify-center">
              <Image
                src={
                  subcategory.image?.startsWith("http")
                    ? subcategory.image
                    : subcategory.image || "/no-catimg.png"
                }
                alt={subcategory.category_name}
                fill
                className="object-contain object-center"
                unoptimized
              />
            </div>
          </div>

          {/* Content section */}
          <div className="flex flex-col text-left px-3 py-10 w-[150px] h-full">
            <h3
              className={`font-bold text-gray-900 mb-3 ${
                subcategory.category_name.length > 13
                  ? "text-sm text-wrap"
                  : "text-md"
              }`}
            >
              {subcategory.category_name}
            </h3>

            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[40px]">
              {subcategory.content || ""}
            </p>

            <button className="bg-[#2b8ef6] text-white rounded-md px-4 py-2 font-semibold w-fit hover:bg-[#1f77db] transition-colors">
              Explore
            </button>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}



       <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-8">
  <div className="lg:col-span-1 space-y-6">
    <h1 className="text-3xl font-bold mb-3 text-gray-600 pl-1">{categoryData.main_category.category_name}</h1>
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
      {/* ... [Keep all your existing filter and header JSX] ... */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <ProductFilters
              variant="both"
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
              onPriceChange={handlePriceChange}
              brands={categoryData.brands || []}
              filterGroups={filterGroups}
              priceRange={priceRange}
              values={values}
              setValues={setValues}
              categoryTree={childCategoryTree}
              showCategories={false}
              showBrands={true}
              isFilterPanelOpen={isFilterPanelOpen}
              setIsFilterPanelOpen={setIsFilterPanelOpen}
            />
            {isFiltering && (
              <div className="fixed top-20 right-4 z-40 bg-white shadow px-3 py-2 rounded text-sm text-gray-600 border">
                Updating results...
              </div>
            )}

            {!nofound && categoryData.products.length > 0 ? (
            <>
            {/* Products Section */}
           <div className="flex-1">
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {getSortedProducts().map((product, index) => (
                  <SharedProductCard 
                    key={`${product._id}-${index}`}
                    product={normalizeProduct(product, brandMap)}
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
          
        </>
      ) : (
        <div className="text-center py-10 mx-auto">
          <img 
            src="/images/no-productbox.png" 
            alt="No Products" 
            className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 object-contain" 
          />
        </div>
      )}
      <ToastContainer />
      </div>
    </div>
  );
}