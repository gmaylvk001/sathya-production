"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { FaSpinner, FaSlidersH, FaSearch } from "react-icons/fa";
import Addtocart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import SharedProductCard from "@/components/product/ProductCard";
import { normalizeProduct } from "@/lib/normalizeProduct";
import ProductFilters from "@/components/filters/ProductFilters";
import { useCategoryFilterUrl } from "@/hooks/useCategoryFilterUrl";
import {
  buildFilterLookupMaps,
  searchParamsToSelectedFilters,
  hasActiveFilterParams,
  buildFilterGroupsFromList,
  selectionKey,
  slugifyFilter,
} from "@/lib/filterUrl";
import { CATEGORY_PAGE_SHELL_CLASS } from "@/lib/categoryPageComponents/layout";
import { humanLabel } from "@/lib/humanLabel";
import { sortProductsClient } from "@/lib/productSort";
import { useRegion } from "@/context/RegionContext";

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const searchQuery = (params.get("query") || params.get("q") || "").replace(/\+/g, " ").trim();
  const { region, isInitialized } = useRegion();

  useEffect(() => {
    if (!searchQuery) router.push("/");
  }, [searchQuery, router]);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [brandMap, setBrandMap] = useState({});
  const [brands, setBrands] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [filterGroups, setFilterGroups] = useState({});
  const [filterCatalog, setFilterCatalog] = useState(null);
  const [filterUrlReady, setFilterUrlReady] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [page, setPage] = useState(1);
  const skipNextFilterFetch = useRef(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const [selectedFilters, setSelectedFilters] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    price: { min: 0, max: 500000 },
    filters: [],
  });
  const [values, setValues] = useState([0, 500000]);

  useCategoryFilterUrl({
    selectedFilters,
    setSelectedFilters,
    filterCatalog,
    brands: filterCatalog?.brands || brands,
    filterGroups: filterCatalog?.filterGroups || filterGroups,
    categoryTree: filterCatalog?.categoryTree || categoryTree,
    subcategoryTree: filterCatalog?.subcategoryTree || categoryTree,
    priceRange,
    enabled: true,
    ready: filterUrlReady && !!filterCatalog,
    keepParams: ["query", "q", "category", "categoryIds", "subcategoryIds"],
    onApplyUrlFilters: (hydratedFilters) => {
      fetchResults(1, false, hydratedFilters);
    },
  });

  useEffect(() => {
    setValues([selectedFilters.price.min, selectedFilters.price.max]);
  }, [selectedFilters.price.min, selectedFilters.price.max]);

  const findCategoryNode = (nodes, predicate) => {
    for (const node of nodes || []) {
      if (predicate(node)) return node;
      const nested = findCategoryNode(
        node.subCategories || node.subcategories,
        predicate
      );
      if (nested) return nested;
    }
    return null;
  };

  useEffect(() => {
    const catId = selectedFilters.categories?.[0];
    const subId = selectedFilters.subcategories?.[0];
    const catNode = catId
      ? findCategoryNode(categoryTree, (n) => String(n._id) === String(catId))
      : null;
    const subNode = subId
      ? findCategoryNode(categoryTree, (n) => String(n._id) === String(subId))
      : null;
    setSelectedCategory(catNode?.category_name || "");
    setSelectedSubCategory(subNode?.category_name || "");
  }, [selectedFilters.categories, selectedFilters.subcategories, categoryTree]);

  const handleSelectCategory = (name) => {
    setSelectedCategory(name || "");
    setSelectedSubCategory("");
    if (!name || name === "All Categories" || name === "All Category") {
      setSelectedFilters((prev) => ({
        ...prev,
        categories: [],
        subcategories: [],
      }));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("category");
        url.searchParams.delete("categoryIds");
        url.searchParams.delete("subcategoryIds");
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + (url.search ? url.search : "")
        );
      }
      return;
    }
    const node = findCategoryNode(
      categoryTree,
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
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("subcategoryIds");
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + (url.search ? url.search : "")
        );
      }
      return;
    }
    const node = findCategoryNode(
      categoryTree,
      (n) => n.category_name === name
    );
    setSelectedFilters((prev) => ({
      ...prev,
      subcategories: node?._id ? [String(node._id)] : [],
    }));
  };

  const handleFilterChange = (type, value) => {
    setSelectedFilters((prev) => {
      const id = value != null ? String(value) : value;
      const hasId = (list, item) =>
        (list || []).some((x) => String(x) === String(item));
      const next = { ...prev };
      if (type === "brands") {
        next.brands = hasId(prev.brands, id)
          ? prev.brands.filter((item) => String(item) !== id)
          : [...prev.brands, id];
      } else if (type === "filters") {
        next.filters = hasId(prev.filters, id)
          ? prev.filters.filter((item) => String(item) !== id)
          : [...prev.filters, id];
      } else if (type === "categories") {
        next.categories = hasId(prev.categories, id)
          ? prev.categories.filter((item) => String(item) !== id)
          : [...prev.categories, id];
      } else if (type === "subcategories") {
        next.subcategories = hasId(prev.subcategories, id)
          ? prev.subcategories.filter((item) => String(item) !== id)
          : [...prev.subcategories, id];
      } else if (type === "price") {
        next.price = value;
      }
      return next;
    });
    setPage(1);
  };

  const handlePriceChange = (nextValues) => {
    const lo = priceRange[0] ?? 0;
    const hi = priceRange[1] ?? 500000;
    let min = Math.min(hi, Math.max(lo, nextValues[0]));
    let max = Math.min(hi, Math.max(lo, nextValues[1]));
    if (min > max) min = max;
    setSelectedFilters((prev) => ({ ...prev, price: { min, max } }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      categories: [],
      subcategories: [],
      brands: [],
      price: { min: priceRange[0], max: priceRange[1] },
      filters: [],
    });
    setSelectedCategory("");
    setSelectedSubCategory("");
    setPage(1);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("category");
      url.searchParams.delete("categoryIds");
      url.searchParams.delete("subcategoryIds");
      url.searchParams.delete("brand");
      url.searchParams.delete("brands");
      url.searchParams.delete("min-price");
      url.searchParams.delete("max-price");
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + (url.search ? url.search : "")
      );
    }
  };

  const lastFetchedFiltersKeyRef = useRef("");

  const fetchResults = useCallback(
    async (pageNum = 1, bootstrap = false, filtersOverride = null) => {
      if (!searchQuery) return;
      try {
        if (bootstrap) setLoading(true);
        else setIsFiltering(true);
        const activeFilters = filtersOverride || selectedFilters;
        lastFetchedFiltersKeyRef.current =
          selectionKey(activeFilters) + "|" + pageNum + "|" + searchQuery;
        const qs = new URLSearchParams();
        qs.set("query", searchQuery);
        qs.set("page", String(pageNum));
        qs.set("limit", "12");
        if (region) qs.set("region", region);

        const urlSearch =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : params;
        const urlCategory = urlSearch?.get("category");
        if (
          urlCategory &&
          urlCategory !== "All Categories" &&
          urlCategory !== "All Category"
        ) {
          qs.set("category", urlCategory);
        }

        const activeCatIds = activeFilters.categories.length
          ? activeFilters.categories
          : urlSearch?.get("categoryIds")
          ? urlSearch.get("categoryIds").split(",").filter(Boolean)
          : [];
        if (activeCatIds.length) {
          qs.set("categoryIds", activeCatIds.join(","));
        }

        const activeSubCatIds = activeFilters.subcategories.length
          ? activeFilters.subcategories
          : urlSearch?.get("subcategoryIds")
          ? urlSearch.get("subcategoryIds").split(",").filter(Boolean)
          : [];
        if (activeSubCatIds.length) {
          qs.set("subcategoryIds", activeSubCatIds.join(","));
        }

        if (activeFilters.brands.length) {
          qs.set("brands", activeFilters.brands.join(","));
        } else if (
          bootstrap &&
          (urlSearch?.get("brands") || urlSearch?.get("brand"))
        ) {
          qs.set("brands", urlSearch.get("brands") || urlSearch.get("brand"));
        }

        if (activeFilters.filters.length) {
          qs.set("filters", activeFilters.filters.join(","));
        }

        if (!bootstrap || filtersOverride) {
          qs.set("minPrice", String(activeFilters.price.min));
          qs.set("maxPrice", String(activeFilters.price.max));
        } else if (urlSearch?.get("min-price") || urlSearch?.get("minPrice")) {
          qs.set(
            "minPrice",
            urlSearch.get("min-price") || urlSearch.get("minPrice")
          );
          if (urlSearch.get("max-price") || urlSearch.get("maxPrice")) {
            qs.set(
              "maxPrice",
              urlSearch.get("max-price") || urlSearch.get("maxPrice")
            );
          }
        }

        const { data } = await axios.get(`/api/search?${qs}`);
        const rawList = Array.isArray(data.products) ? data.products : [];
        setProducts(sortProductsClient(rawList));
        setPagination(data.pagination || null);

        const nextBrands = (data.brandSummary || [])
          .map((b) => {
            const id = String(b.brandId ?? b._id ?? "");
            const name = humanLabel(
              b.brand_name,
              b.name,
              brandMap[id],
              brandMap[String(b.brandId || "")]
            );
            if (!id || !name) return null;
            return {
              _id: id,
              brand_name: name,
              brand_slug: b.brand_slug || "",
            };
          })
          .filter(Boolean);
        setBrands(nextBrands);

        const groups = buildFilterGroupsFromList(data.filterDefs || []);
        setFilterGroups(groups);
        setCategoryTree(Array.isArray(data.categories) ? data.categories : []);

        setFilterCatalog((prev) => ({
          brands: (() => {
            const byId = new Map();
            for (const b of [...(prev?.brands || []), ...nextBrands]) {
              const id = b?._id?.toString?.() || b?._id;
              if (!id) continue;
              const incoming = humanLabel(b.brand_name, b.name);
              const existing = byId.get(String(id));
              if (!existing || (incoming && !humanLabel(existing.brand_name))) {
                byId.set(String(id), {
                  ...existing,
                  ...b,
                  _id: String(id),
                  brand_name: incoming || existing?.brand_name,
                });
              }
            }
            return [...byId.values()];
          })(),
          filterGroups: { ...(prev?.filterGroups || {}), ...groups },
          categoryTree: Array.isArray(data.categories)
            ? data.categories
            : prev?.categoryTree || [],
          subcategoryTree: Array.isArray(data.categories)
            ? data.categories
            : prev?.subcategoryTree || [],
        }));

        if (bootstrap) {
          const lookupMaps = buildFilterLookupMaps({
            brands: nextBrands,
            filterGroups: groups,
            categoryTree: data.categories || [],
            subcategoryTree: data.categories || [],
          });
          const urlSearch = new URLSearchParams(window.location.search);
          const urlFilters = searchParamsToSelectedFilters(
            urlSearch,
            lookupMaps,
            [priceRange[0], priceRange[1]]
          );
          const nextSelected = {
            categories: urlFilters.categories,
            subcategories: urlFilters.subcategories,
            brands: urlFilters.brands,
            filters: urlFilters.filters,
            price: hasActiveFilterParams(urlSearch)
              ? urlFilters.price
              : { min: priceRange[0], max: priceRange[1] },
          };
          setSelectedFilters(nextSelected);
          setFilterUrlReady(true);

          if (hasActiveFilterParams(urlSearch)) {
            await fetchResults(1, false, nextSelected);
          }
        }
      } catch (err) {
        console.error("Search API error", err);
        setProducts([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setIsFiltering(false);
      }
    },
    [searchQuery, selectedFilters, brandMap, priceRange, region]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/brand");
        const json = await res.json();
        const arr = json?.data || [];
        const map = {};
        arr.forEach((b) => {
          const id = b?._id != null ? String(b._id) : "";
          const name = humanLabel(b.brand_name, b.name);
          if (id && name) map[id] = name;
        });
        if (mounted) setBrandMap(map);
      } catch (err) {
        console.error("Failed to load brand master", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    skipNextFilterFetch.current = true;
    setFilterUrlReady(false);
    fetchResults(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, region, isInitialized]);

  useEffect(() => {
    if (!filterUrlReady) return;
    const key =
      selectionKey(selectedFilters) + "|" + page + "|" + searchQuery;
    if (key === lastFetchedFiltersKeyRef.current) {
      return;
    }
    fetchResults(page, false);
  }, [selectedFilters, page, filterUrlReady, fetchResults, searchQuery]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    const pages = [];
    if (currentPage > 3) {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
    }
    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div className="flex justify-center items-center gap-2 my-6">
        <button
          disabled={!hasPrev}
          onClick={() => handlePageChange(currentPage - 1)}
          className={`px-3 py-2 rounded ${
            hasPrev
              ? "bg-gray-100 hover:bg-gray-200"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Prev
        </button>
        {pages.map((num, idx) =>
          num === "..." ? (
            <span key={`dots-${idx}`} className="px-3 py-2">
              …
            </span>
          ) : (
            <button
              key={num}
              onClick={() => handlePageChange(num)}
              className={`px-3 py-2 rounded ${
                num === currentPage
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {num}
            </button>
          )
        )}
        <button
          disabled={!hasNext}
          onClick={() => handlePageChange(currentPage + 1)}
          className={`px-3 py-2 rounded ${
            hasNext
              ? "bg-gray-100 hover:bg-gray-200"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const searchTerm = (searchInput || "").trim();
    if (!searchTerm) return;
    router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className={`${CATEGORY_PAGE_SHELL_CLASS} py-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Search Results {searchQuery && <span>for &lsquo;{searchQuery}&rsquo;</span>}
          {selectedCategory && (
            <span className="text-sm md:text-base font-normal text-gray-500 block sm:inline sm:ml-2">
              in <strong className="text-red-600 font-semibold">{selectedCategory}</strong>
            </span>
          )}
        </h1>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-80">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="w-full h-10 pl-4 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="absolute right-2 p-1.5 text-gray-500 hover:text-red-600"
            aria-label="Submit search"
          >
            <FaSearch className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex border-b border-gray-300 bg-gray-100 sticky top-0 z-30 lg:hidden mb-3">
        <button
          className="flex items-center justify-center gap-2 py-4 flex-1 text-sm font-medium text-gray-800"
          onClick={() => setIsFilterPanelOpen(true)}
        >
          <FaSlidersH className="text-gray-500 text-xs" />
          FILTER
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <ProductFilters
          variant="both"
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
          onPriceChange={handlePriceChange}
          brands={brands}
          filterGroups={filterGroups}
          priceRange={priceRange}
          values={values}
          setValues={setValues}
          categoryTree={categoryTree}
          showCategories={categoryTree.length > 0}
          showBrands={brands.length > 0}
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

        <div className="flex-1">
          <div className="flex justify-between items-center mb-3">
            <div className="text-gray-600">
              {pagination?.total ?? products.length} result
              {(pagination?.total ?? products.length) !== 1 ? "s" : ""} found
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {products.map((p, index) => (
                <SharedProductCard 
                  key={`${p._id}-${index}`} 
                  product={normalizeProduct(p, brandMap)} 
                  compactMobile={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <img
                src="/images/no-productbox.png"
                alt="No products found"
                className="mx-auto mb-6 w-48 h-48"
              />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                No Products Found
              </h2>
              <p className="text-gray-600">
                Try different search terms or browse our categories
              </p>
            </div>
          )}
          {renderPagination()}
        </div>
      </div>
    </div>
  );
}
