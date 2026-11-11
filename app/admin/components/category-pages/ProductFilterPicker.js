"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Icon } from "@iconify/react";

function productImageSrc(product) {
  const img = product?.images?.[0];
  if (!img) return "";
  return img.startsWith("http") ? img : `/uploads/products/${img}`;
}

export default function ProductFilterPicker({
  selected = [],
  onAddProduct,
  onAddMultipleProducts,
  defaultCategoryId = "",
  ownerType = "category",
  brandId = "",
  searchApiBase = "/api/category-product-carousel/search",
  filterOptionsApiBase = "/api/category-product-carousel/filter-options",
}) {
  // Filter Options State
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Active Filter Selections
  const [selectedCategory, setSelectedCategory] = useState(defaultCategoryId || "");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedChildCategory, setSelectedChildCategory] = useState("");
  const [selectedMovement, setSelectedMovement] = useState("");
  const [query, setQuery] = useState("");

  // Product Results State
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const searchTimer = useRef(null);

  // Set of already selected product IDs
  const selectedIdSet = useMemo(() => {
    return new Set((selected || []).map((p) => String(p._id || p.id)));
  }, [selected]);

  // Sync defaultCategoryId when it changes
  useEffect(() => {
    if (defaultCategoryId && !selectedCategory) {
      setSelectedCategory(defaultCategoryId);
    }
  }, [defaultCategoryId, selectedCategory]);

  // 1. Fetch Filter Options on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        setLoadingOptions(true);
        const res = await fetch(filterOptionsApiBase);
        const data = await res.json();
        if (data.success && isMounted) {
          setCategories(data.categories || []);
          setSubCategories(data.subCategories || []);
          setChildCategories(data.childCategories || []);
          setMovements(data.movements || []);
        }
      } catch (err) {
        console.error("Failed to load product filter options:", err);
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [filterOptionsApiBase]);

  // 2. Cascading available Sub Categories based on selected Category
  const availableSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const catObj = categories.find(
      (c) => String(c._id) === String(selectedCategory) || c.slug === selectedCategory
    );
    const catId = catObj ? String(catObj._id) : String(selectedCategory);
    const catMd5 = catObj?.md5 ? String(catObj.md5).trim() : "";

    return subCategories.filter(
      (s) =>
        String(s.parentId) === catId ||
        (catMd5 && String(s.parentId).trim() === catMd5)
    );
  }, [selectedCategory, categories, subCategories]);

  // 3. Cascading available Child Categories based on selected Sub Category
  const availableChildCategories = useMemo(() => {
    if (!selectedSubCategory) return [];
    const subObj = subCategories.find(
      (s) => String(s._id) === String(selectedSubCategory) || s.slug === selectedSubCategory
    );
    const subId = subObj ? String(subObj._id) : String(selectedSubCategory);
    const subMd5 = subObj?.md5 ? String(subObj.md5).trim() : "";

    return childCategories.filter(
      (c) =>
        String(c.parentId) === subId ||
        (subMd5 && String(c.parentId).trim() === subMd5)
    );
  }, [selectedSubCategory, subCategories, childCategories]);

  // 4. Fetch Products whenever filters, query, or refreshIndex change
  useEffect(() => {
    clearTimeout(searchTimer.current);

    // If no filter and no query, don't run query
    const hasAnyFilter =
      Boolean(selectedCategory) ||
      Boolean(selectedSubCategory) ||
      Boolean(selectedChildCategory) ||
      Boolean(selectedMovement) ||
      Boolean(query.trim()) ||
      ownerType === "brand";

    if (!hasAnyFilter) {
      setProducts([]);
      setSearching(false);
      setFetchError("");
      return;
    }

    // Debounce when user is typing text, but fetch immediately on dropdown changes
    const delay = query.trim() ? 250 : 0;

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setFetchError("");
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.set("categoryId", selectedCategory);
        if (selectedSubCategory) params.set("subCategoryId", selectedSubCategory);
        if (selectedChildCategory) params.set("childCategoryId", selectedChildCategory);
        if (selectedMovement) params.set("movement", selectedMovement);
        if (query.trim()) params.set("q", query.trim());
        if (ownerType) params.set("ownerType", ownerType);
        if (brandId) params.set("brandId", brandId);

        const res = await fetch(`${searchApiBase}?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.products || []);
        } else {
          setProducts([]);
          setFetchError(data.message || `Server returned ${res.status}`);
        }
      } catch (err) {
        console.error("Product search error:", err);
        setProducts([]);
        setFetchError(err.message || "Failed to load products");
      } finally {
        setSearching(false);
      }
    }, delay);

    return () => clearTimeout(searchTimer.current);
  }, [
    selectedCategory,
    selectedSubCategory,
    selectedChildCategory,
    selectedMovement,
    query,
    ownerType,
    brandId,
    searchApiBase,
    refreshIndex,
  ]);

  // Handler for category change: resets lower cascades
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedSubCategory("");
    setSelectedChildCategory("");
    setCheckedIds(new Set());
  };

  // Handler for subcategory change: resets child cascade
  const handleSubCategoryChange = (e) => {
    setSelectedSubCategory(e.target.value);
    setSelectedChildCategory("");
    setCheckedIds(new Set());
  };

  // Handler for child category change
  const handleChildCategoryChange = (e) => {
    setSelectedChildCategory(e.target.value);
    setCheckedIds(new Set());
  };

  // Handler for movement change
  const handleMovementChange = (e) => {
    setSelectedMovement(e.target.value);
    setCheckedIds(new Set());
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory(defaultCategoryId || "");
    setSelectedSubCategory("");
    setSelectedChildCategory("");
    setSelectedMovement("");
    setQuery("");
    setCheckedIds(new Set());
  };

  // Toggle single item checkbox
  const toggleCheck = (productId) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Toggle select all eligible items
  const toggleSelectAll = () => {
    const unselectedProducts = products.filter((p) => !selectedIdSet.has(String(p._id)));
    if (checkedIds.size === unselectedProducts.length && unselectedProducts.length > 0) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(unselectedProducts.map((p) => String(p._id))));
    }
  };

  // Bulk add checked items
  const handleAddChecked = () => {
    if (checkedIds.size === 0) return;
    const toAdd = products.filter((p) => checkedIds.has(String(p._id)));
    if (onAddMultipleProducts) {
      onAddMultipleProducts(toAdd);
    } else {
      toAdd.forEach((p) => onAddProduct?.(p));
    }
    setCheckedIds(new Set());
  };

  // Single add
  const handleAddSingle = (product) => {
    onAddProduct?.(product);
  };

  const getMovementBadgeStyle = (movement) => {
    if (!movement) return "bg-gray-100 text-gray-600";
    const m = movement.toLowerCase();
    if (m.startsWith("fast") || m === "focus") {
      return "bg-amber-100 text-amber-800 border-amber-200 font-semibold";
    }
    if (m === "slow") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (m === "eol" || m === "obsolete") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-[#ED1C24]">
            <Icon icon="mdi:filter-variant" className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-gray-900 leading-tight">
              Filter & Select Products
            </h4>
            <p className="text-[11px] text-gray-500">
              Filter by Category, Movement type, or search by keyword (Latest added first)
            </p>
          </div>
        </div>

        {(selectedCategory || selectedSubCategory || selectedChildCategory || selectedMovement || query) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Icon icon="mdi:refresh" className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Cascading Filter Controls Bar - 2 per row (2 rows) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Category */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            disabled={loadingOptions}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#ED1C24] cursor-pointer"
          >
            <option value="">-- All Categories --</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Sub Category */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Sub Category
          </label>
          <select
            value={selectedSubCategory}
            onChange={handleSubCategoryChange}
            disabled={!selectedCategory || availableSubCategories.length === 0}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#ED1C24] disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          >
            <option value="">
              {!selectedCategory
                ? "Select category first"
                : availableSubCategories.length === 0
                ? "No subcategories found"
                : "-- All Sub Categories --"}
            </option>
            {availableSubCategories.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Child Category */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Child Category
          </label>
          <select
            value={selectedChildCategory}
            onChange={handleChildCategoryChange}
            disabled={!selectedSubCategory || availableChildCategories.length === 0}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#ED1C24] disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          >
            <option value="">
              {!selectedSubCategory
                ? "Select subcategory first"
                : availableChildCategories.length === 0
                ? "No child categories"
                : "-- All Child Categories --"}
            </option>
            {availableChildCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Movement Type */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <Icon icon="mdi:lightning-bolt" className="w-3.5 h-3.5 text-amber-500" />
            Movement Type
          </label>
          <select
            value={selectedMovement}
            onChange={handleMovementChange}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#ED1C24] cursor-pointer"
          >
            <option value="">-- All Movements --</option>
            <optgroup label="Fast Movements">
              <option value="FAST">⚡ All Fast Movement (Fast-* & Focus)</option>
              {movements
                .filter(
                  (m) =>
                    m.toLowerCase().startsWith("fast") || m.toLowerCase() === "focus"
                )
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Other Movements">
              {movements
                .filter(
                  (m) =>
                    !m.toLowerCase().startsWith("fast") && m.toLowerCase() !== "focus"
                )
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Keyword Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name, item code, or model within chosen filters…"
          className="w-full rounded-lg border border-gray-300 pl-8 pr-8 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#ED1C24]"
        />
        <Icon
          icon="mdi:magnify"
          className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <Icon icon="mdi:close-circle" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status & Bulk Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 pt-1">
        <div className="flex items-center gap-2">
          {searching ? (
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              Fetching latest products…
            </span>
          ) : fetchError ? (
            <div className="flex items-center gap-1.5 text-red-600 font-medium">
              <Icon icon="mdi:alert-circle" className="w-4 h-4" />
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={() => setRefreshIndex((k) => k + 1)}
                className="ml-1 text-xs text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : products.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-700">
                Found <strong className="text-gray-900">{products.length}</strong> products
                <span className="text-gray-400 ml-1.5">(Showing newest first)</span>
              </span>
              <button
                type="button"
                onClick={() => setRefreshIndex((k) => k + 1)}
                title="Refresh product list"
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer"
              >
                <Icon icon="mdi:refresh" className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (selectedCategory || selectedSubCategory || selectedChildCategory || selectedMovement || query) ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-amber-700 font-medium">
                No active products found matching the chosen filters.
              </span>
              {selectedChildCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedChildCategory("")}
                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium text-[11px] cursor-pointer"
                >
                  View All Subcategory Products
                </button>
              )}
              {selectedMovement && (
                <button
                  type="button"
                  onClick={() => setSelectedMovement("")}
                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium text-[11px] cursor-pointer"
                >
                  Clear Movement Filter
                </button>
              )}
              <button
                type="button"
                onClick={() => setRefreshIndex((k) => k + 1)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
              >
                <Icon icon="mdi:refresh" className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <span className="text-gray-400">
              Select a category or movement to browse latest products.
            </span>
          )}
        </div>

        {products.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
            >
              {checkedIds.size > 0 &&
              checkedIds.size ===
                products.filter((p) => !selectedIdSet.has(String(p._id))).length
                ? "Deselect All"
                : "Select All Available"}
            </button>

            {checkedIds.size > 0 && (
              <button
                type="button"
                onClick={handleAddChecked}
                className="px-3 py-1 text-xs font-bold text-white bg-[#ED1C24] hover:bg-red-700 rounded-md transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
                Add Checked ({checkedIds.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results List / Grid */}
      {products.length > 0 && (
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg bg-gray-50/30">
          {products.map((p) => {
            const isAlreadyAdded = selectedIdSet.has(String(p._id));
            const isChecked = checkedIds.has(String(p._id));
            const imgSrc = productImageSrc(p);

            return (
              <div
                key={p._id}
                className={`p-2.5 flex items-center gap-3 transition-colors ${
                  isAlreadyAdded
                    ? "bg-gray-50/80 opacity-60"
                    : isChecked
                    ? "bg-red-50/40"
                    : "hover:bg-white bg-white/50"
                }`}
              >
                {/* Multi-select checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isAlreadyAdded}
                  onChange={() => toggleCheck(String(p._id))}
                  className="w-4 h-4 text-[#ED1C24] rounded border-gray-300 focus:ring-[#ED1C24] cursor-pointer disabled:cursor-not-allowed"
                />

                {/* Product Thumbnail */}
                <div className="w-10 h-10 shrink-0 bg-white border border-gray-200 rounded p-1 flex items-center justify-center">
                  {imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgSrc}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Icon icon="mdi:image-outline" className="w-5 h-5 text-gray-300" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                      {p.name}
                    </p>
                    {p.movement && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border ${getMovementBadgeStyle(
                          p.movement
                        )}`}
                      >
                        {p.movement}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                    {p.item_code && <span>SKU: {p.item_code}</span>}
                    {p.price && (
                      <span className="font-semibold text-gray-800">
                        ₹{Number(p.special_price || p.price).toLocaleString("en-IN")}
                      </span>
                    )}
                    {p.createdAt && (
                      <span className="text-[10px] text-gray-400">
                        Added: {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                  {isAlreadyAdded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                      <Icon icon="mdi:check" className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddSingle(p)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-[#ED1C24] hover:bg-red-700 rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
