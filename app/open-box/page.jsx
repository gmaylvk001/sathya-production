"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "react-feather";
import ProductCard from "@/components/ProductCard";
import Addtocart from "@/components/AddToCart";
import { FaShareAlt, FaSlidersH, FaBoxOpen, FaAward, FaShieldAlt, FaHeadset, FaUndoAlt } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { Range as ReactRange } from "react-range";
import {
  getSortedFilterGroups,
  getVisibleFilterGroups,
  VISIBLE_FILTER_GROUP_LIMIT,
} from "@/lib/filterGroupDefaults";
import { getDiscountInfo } from "@/lib/discountHelper";

const OPEN_BOX_FEATURES = [
  {
    title: "Open Box Products",
    desc: "Display units in excellent condition",
    Icon: FaBoxOpen,
  },
  {
    title: "Verified Quality",
    desc: "Checked by experts for top performance",
    Icon: FaAward,
  },
  {
    title: "Best Price Guaranteed",
    desc: "Unbeatable prices on top brands",
    Icon: FaShieldAlt,
  },
  {
    title: "Installation Support",
    desc: "Expert installation available",
    Icon: FaHeadset,
  },
  {
    title: "Easy Returns",
    desc: "Hassle-free replacement*",
    Icon: FaUndoAlt,
  },
];

const getDiscountPct = (product) => {
  return getDiscountInfo(product?.price, product?.special_price).discountPercent;
};

const getProductImageSrc = (product) => {
  if (!product.images?.[0]) return null;
  const imagepathname = product.images[0];
  return imagepathname.startsWith("http")
    ? imagepathname
    : `/uploads/products/${imagepathname.replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "")}`;
};

const buildCategoryNameMap = (tree) => {
  const map = {};
  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      if (node._id) map[String(node._id)] = node.category_name || "";
      walk(node.subCategories);
    });
  };
  walk(tree);
  return map;
};

const matchApplianceBucket = (product, categoryNameById) => {
  const catText = [
    product.name,
    categoryNameById[String(product.category || "")],
    categoryNameById[String(product.sub_category || "")],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/air.?cond|\bac\b|split.?ac|inverter.?ac|cassette.?ac/.test(catText)) {
    return "ac";
  }
  if (/fridge|refrigerat/.test(catText)) return "fridge";
  if (/\btv\b|television|smart.?tv|led.?tv|oled|qled|uhd/.test(catText)) {
    return "tv";
  }
  if (/washing|washer|laundry|front.?load|top.?load/.test(catText)) {
    return "washing";
  }
  return null;
};

const getEffectivePrice = (product) => {
  if (
    product.special_price > 0 &&
    product.special_price < product.price
  ) {
    return product.special_price;
  }
  return product.price || 0;
};

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Mega Clearance: EOL/FOCUS in stock, high-price pool per category,
 * randomly pick 2–3 products each time page opens.
 */
const pickMegaDeals = (list, categoryTree, perCategory = 3) => {
  const nameMap = buildCategoryNameMap(categoryTree);
  const buckets = { ac: [], fridge: [], tv: [], washing: [] };
  const inStock = list.filter(
    (p) =>
      (p.movement === "EOL" || p.movement === "FOCUS") &&
      (p.quantity || 0) > 0,
  );

  inStock.forEach((p) => {
    const key = matchApplianceBucket(p, nameMap);
    if (key) buckets[key].push(p);
  });

  const order = ["ac", "fridge", "tv", "washing"];
  const result = [];

  for (const key of order) {
    const items = buckets[key];
    if (!items.length) continue;

    // High price first
    const byPrice = [...items].sort(
      (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
    );

    // Top half = high-price candidate pool (min enough for variety)
    const poolSize = Math.max(
      perCategory * 2,
      Math.ceil(byPrice.length * 0.5),
    );
    const highPricePool = byPrice.slice(0, Math.min(poolSize, byPrice.length));

    // Random 2 or 3 from that pool
    const pickCount = Math.min(
      highPricePool.length,
      2 + Math.floor(Math.random() * 2),
    );
    result.push(...shuffleArray(highPricePool).slice(0, pickCount));
  }

  if (result.length === 0) {
    const byPrice = [...inStock].sort(
      (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
    );
    const pool = byPrice.slice(0, Math.min(24, byPrice.length));
    return shuffleArray(pool).slice(0, Math.min(8, pool.length));
  }

  // Mix category order so strip not always AC→fridge→TV→washing
  return shuffleArray(result);
};

const CategoryTreeFilter = ({
  categories,
  level = 0,
  selectedCategory,
  onCategorySelect,
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  // Initialize with all categories expanded
  useEffect(() => {
    const allExpanded = {};
    const expandAll = (cats) => {
      cats.forEach((cat) => {
        if (cat.subCategories?.length > 0) {
          allExpanded[cat._id] = true;
          expandAll(cat.subCategories);
        }
      });
    };
    expandAll(categories);
    setExpandedCategories(allExpanded);
  }, [categories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <div key={category._id}>
          <div
            className={`flex items-center gap-2 ${
              level > 0 ? `ml-${Math.min(level * 4, 8)}` : ""
            }`}
          >
            <label className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="radio"
                name="category"
                checked={selectedCategory === category.category_name}
                onChange={() => onCategorySelect(category.category_name)}
                className="h-4 w-4 text-[#d72828] border-gray-300 rounded focus:ring-red-500"
              />
              <span
                className={`text-sm ${
                  selectedCategory === category.category_name
                    ? "text-[#d72828] font-medium"
                    : "text-gray-700"
                }`}
              >
                {category.category_name}
                {category.hasProducts && (
                  <span className="text-xs text-gray-400 ml-1">
                    (has products)
                  </span>
                )}
              </span>
            </label>

            {category.subCategories?.length > 0 && (
              <button
                type="button"
                onClick={() => toggleCategory(category._id)}
                className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
              >
                {expandedCategories[category._id] ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            )}
          </div>

          {category.subCategories?.length > 0 &&
            expandedCategories[category._id] && (
              <div className={`mt-1 ${level === 0 ? "ml-4" : "ml-6"}`}>
                <CategoryTreeFilter
                  categories={category.subCategories}
                  level={level + 1}
                  selectedCategory={selectedCategory}
                  onCategorySelect={onCategorySelect}
                />
              </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default function OpenBoxPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [loading, setLoading] = useState(true);
  const [nofound, setNofound] = useState(false);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(true);
  const [sortOption, setSortOption] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    brands: [],
    price: { min: 0, max: 100000 },
    category: "",
    subCategory: "",
  });
  const [values, setValues] = useState([0, 100000]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    totalProducts: 0,
  });
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [categoryTree, setCategoryTree] = useState([]);
  const [showcaseProducts, setShowcaseProducts] = useState([]);
  const [showcaseCategoryTree, setShowcaseCategoryTree] = useState([]);
  const [megaDealProducts, setMegaDealProducts] = useState([]);

const [filterDefs, setFilterDefs] = useState([]);
const [filterSummaryRaw, setFilterSummaryRaw] = useState([]);
const [filterGroups, setFilterGroups] = useState({});
const [filterDefMap, setFilterDefMap] = useState({});
const [expandedGroups, setExpandedGroups] = useState({});
const [showAllFilterGroups, setShowAllFilterGroups] = useState(false);
const [selectedProductFilters, setSelectedProductFilters] = useState([]);
const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

const FILTER_LIST_MAX_HEIGHT = "max-h-[7.75rem]";

  const STEP = 100;
  const MIN = priceRange[0];
  const MAX = priceRange[1];

  const isInitialLoad = useRef(true);
  const megaScrollRef = useRef(null);
  const allProductsRef = useRef(null);

  const scrollStrip = (ref, direction) => {
    if (!ref.current) return;
    const amount = Math.max(280, ref.current.clientWidth * 0.75);
    ref.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };


  useEffect(() => {
  if (filterDefs.length === 0) {
    setFilterGroups({});
    setFilterDefMap({});
    return;
  }
  const groups = {};
  const map = {};
  filterDefs.forEach((f) => {
    const group = f.filter_group_name || "Other";
    if (!groups[group]) groups[group] = { _id: group, name: group, filters: [] };
    groups[group].filters.push(f);
    map[String(f._id)] = { name: f.filter_name, group };
  });
  setFilterGroups(groups);
  setFilterDefMap(map);
  setShowAllFilterGroups(false);
}, [filterDefs]);

const toggleProductFilter = (id) => {
  const next = selectedProductFilters.includes(id)
    ? selectedProductFilters.filter((f) => f !== id)
    : [...selectedProductFilters, id];
  setSelectedProductFilters(next);
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

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    fetchProducts(1);
  },[selectedFilters, selectedProductFilters]);
  // Sync slider values
  useEffect(() => {
    setValues([selectedFilters.price.min, selectedFilters.price.max]);
  }, [selectedFilters.price.min, selectedFilters.price.max]);

  const fetchProducts = async (page = 1, initial = false) => {
    try {
      setLoading(true);

      const query = new URLSearchParams();
      query.set("page", page);
      query.set("limit", 20);
      query.set("minPrice", selectedFilters.price.min);
      query.set("maxPrice", selectedFilters.price.max);

      if (selectedFilters.brands.length > 0) {
        query.set("brands", selectedFilters.brands.join(","));
      }
      if (selectedFilters.subCategory) {
        query.set("category", selectedFilters.subCategory);
      } else if (selectedFilters.category) {
        query.set("category", selectedFilters.category);
      }
      if (selectedFilters.categories && selectedFilters.categories.length > 0) {
        query.set("categories", selectedFilters.categories.join(","));
      }
      if (sortOption) {
        query.set("sortBy", sortOption);
      }
      if (selectedProductFilters.length > 0) {
     query.set("filters", selectedProductFilters.join(","));
      }

      const res = await fetch(`/api/open-box?${query}`);
      const data = await res.json();

      if (!data.success) {
        toast.error("Failed to fetch products");
        return;
      }

      setProducts(data.products);
      setBrands(data.brands);
      setCategories(data.categories);
      setCategoryTree(data.categoryTree || []);
      setPagination(data.pagination);
      setFilterSummaryRaw(Array.isArray(data.filterSummary) ? data.filterSummary : []);
      setFilterDefs(Array.isArray(data.filterDefs) ? data.filterDefs : []);

      if (initial) {
        const { minPrice, maxPrice } = data.priceRange;
        let min = minPrice;
        let max = maxPrice;
        if (min === max) {
          min -= 1;
          max += 1;
        }
        setPriceRange([min, max]);
        setSelectedFilters((prev) => ({
          ...prev,
          price: { min, max },
        }));
        setValues([min, max]);
      }

      setNofound(data.products.length === 0);
    } catch (error) {
      toast.error("Error fetching products");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/openboxbanner");
      const data = await res.json();
      if (data.success && data.openBoxBanners) {
        // Active banners மட்டும் filter
        const activeBanners = data.openBoxBanners.banners.filter(
          (b) => b.banner_image && b.status === "Active",
        );
        setBanners(activeBanners);
      }
    } catch (error) {
      console.error("Banner fetch error:", error);
    }
  };

  const fetchShowcaseProducts = async () => {
    try {
      // Wide pool so each appliance category has high-price candidates
      const query = new URLSearchParams({
        page: "1",
        limit: "200",
      });
      const res = await fetch(`/api/open-box?${query}`);
      const data = await res.json();
      if (data.success) {
        setShowcaseProducts(data.products || []);
        setShowcaseCategoryTree(data.categoryTree || []);
        if (data.brands?.length) {
          setBrands((prev) => (prev.length ? prev : data.brands));
        }
      }
    } catch (error) {
      console.error("Showcase fetch error:", error);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchShowcaseProducts();
    fetchProducts(1, true);
  }, []);

  // Sort change
  useEffect(() => {
    if (!isInitialLoad.current) {
      fetchProducts(1);
    }
  }, [sortOption]);

 const handleFilterChange = (type, value) => {
  setSelectedFilters((prev) => {
    const newFilters = { ...prev };
    if (type === "brands") {
      newFilters.brands = prev.brands.includes(value)
        ? prev.brands.filter((id) => id !== value)
        : [...prev.brands, value];
    } else if (type === "price") {
      newFilters.price = value;
    } else if (type === "category") {
      newFilters.category = prev.category === value ? "" : value;
      newFilters.selectedParent = prev.category === value ? "" : value;
      newFilters.subCategory = "";
      setSelectedProductFilters([]); // ✅ புதியது
    } else if (type === "subCategory") {
      newFilters.subCategory = prev.subCategory === value ? "" : value;
      setSelectedProductFilters([]); // ✅ புதியது
    }
    return newFilters;
  });
};

  const handlePriceChange = (vals) => {
    let min = Math.max(1, vals[0]);
    let max = Math.max(1, vals[1]);
    if (min > max) min = max;
    setSelectedFilters((prev) => ({ ...prev, price: { min, max } }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      brands: [],
      price: { min: priceRange[0], max: priceRange[1] },
      category: "",
      subCategory: "",
    });
    setSelectedProductFilters([]);
  };

  const activeFilterCount =
    selectedFilters.brands.length +
    selectedProductFilters.length +
    (selectedFilters.category ? 1 : 0) +
    (selectedFilters.subCategory ? 1 : 0) +
    (selectedFilters.price.min !== priceRange[0] ||
    selectedFilters.price.max !== priceRange[1]
      ? 1
      : 0);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchProducts(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleProductClick = (product) => {
    const stored = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
    const alreadyViewed = stored.find((p) => p._id === product._id);
    const updated = alreadyViewed
      ? stored.filter((p) => p._id !== product._id)
      : stored;
    updated.unshift(product);
    localStorage.setItem(
      "recentlyViewed",
      JSON.stringify(updated.slice(0, 10)),
    );
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    const pages = [];
    const maxVisiblePages = 5;
    const hasPrev = pagination.currentPage > 1;
    const hasNext = pagination.currentPage < pagination.totalPages;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1,
    );
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
              ? "bg-[#d72828] text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          {i}
        </button>,
      );
    }
    return (
      <div className="flex justify-center items-center mt-8 space-x-2">
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!hasPrev}
          className={`p-2 rounded-md ${
            !hasPrev
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
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
            {endPage < pagination.totalPages - 1 && (
              <span className="px-2">...</span>
            )}
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
          className={`p-2 rounded-md ${
            !hasNext
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  // Add this component right after imports and before export default function OpenBoxPage()

  {
    /* Product Grid */
  }
  {
    loading ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border shadow-sm flex flex-col animate-pulse"
          >
            <div className="aspect-square bg-gray-200 rounded-t-lg" />
            <div className="p-3 flex flex-col gap-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-1" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-8 bg-gray-200 rounded w-full mt-1" />
            </div>
          </div>
        ))}
      </div>
    ) : !nofound ? (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {products.map((product) => (
            <div
              key={product._id}
              className="group relative bg-white rounded-lg border hover:border-red-200 transition-all shadow-sm hover:shadow-md flex flex-col h-full"
            >
              {/* Image */}
              <div className="relative aspect-square bg-white">
                {product.images?.[0] && (
                  <Image
                    src={
                      product.images[0].startsWith("http")
                        ? product.images[0]
                        : `/uploads/products/${product.images[0]}`
                    }
                    alt={product.name}
                    fill
                    className="object-contain p-2 md:p-4 transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 33vw, 25vw"
                    unoptimized
                  />
                )}
                {/* Discount Badge */}
                {(() => {
                  const { discountPercent: discPct, showDiscount: hasDisc } = getDiscountInfo(product.price, product.special_price);
                  return hasDisc ? (
                    <span className="absolute top-2 left-2 bg-orange-500 tracking-wider text-white text-xs font-bold px-2 py-1 rounded z-10">
                      -{discPct}%
                    </span>
                  ) : null;
                })()}
                {/* Wishlist */}
                <div className="absolute top-2 right-2">
                  <ProductCard productId={product._id} />
                </div>
              </div>

              {/* Info */}
              <div className="p-2 md:p-4 flex flex-col h-full">
                <Link
                  href={`/product/${product.slug}`}
                  className="block mb-2"
                  onClick={() => handleProductClick(product)}
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-800 hover:text-[#d72828] line-clamp-2 min-h-[40px]">
                    {product.name}
                  </h3>
                </Link>

                {/* Price */}
                {(() => {
                  const { showDiscount: hasDisc } = getDiscountInfo(product.price, product.special_price);
                  return (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base font-semibold text-red-600">
                        ₹
                        {(hasDisc
                          ? Math.round(product.special_price)
                          : Math.round(product.price)
                        ).toLocaleString('en-IN')}
                      </span>
                      {hasDisc && (
                        <span className="text-xs text-gray-500 line-through">
                          ₹{Math.round(product.price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Stock */}
                <div className="mb-2">
                  {product.quantity > 0 ? (
                    <span className="text-xs text-green-600 font-medium">
                      In Stock, {product.quantity} units
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Buttons */}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Addtocart
                    productId={product._id}
                    stockQuantity={product.quantity}
                    special_price={product.special_price}
                    className="w-full text-xs sm:text-sm py-1.5"
                      movement={product.movement}
                   productName={product.name}
                   productSlug={product.slug}
                  />
                  {/* <button
                    type="button"
                    onClick={() => handleShare(product)}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white p-1.5 rounded-full transition-colors duration-300 flex items-center justify-center flex-shrink-0"
                    title="Share this product"
                  >
                    <FaShareAlt className="w-5 h-5" />
                  </button> */}
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderPagination()}
      </>
    ) : (
      <div className="text-center py-10 mx-auto">
        <img
          src="/images/no-productbox.png"
          alt="No Products"
          className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 object-contain"
        />
        <p className="text-gray-500">No Open Box products found</p>
      </div>
    );
  }

  if (values[0] < MIN) values[0] = MIN;
  if (values[1] > MAX) values[1] = MAX;

  const getSortedProducts = () => {
    const sortedProducts = [...products];

    switch (sortOption) {
      case "price-low-high":
        return sortedProducts.sort((a, b) => a.special_price - b.special_price);

      case "price-high-low":
        return sortedProducts.sort((a, b) => b.special_price - a.special_price);

      case "name-a-z":
        return sortedProducts.sort((a, b) => {
          if (a.name.toLowerCase() === "capacity") return -1;
          if (b.name.toLowerCase() === "capacity") return 1;
          return a.name.localeCompare(b.name);
        });

      case "name-z-a":
        return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));

      // ✅ NEW: Quantity Low → High
      case "quantity-low-to-high":
        return sortedProducts.sort(
          (a, b) => (a.quantity || 0) - (b.quantity || 0),
        );

      // ✅ NEW: Quantity High → Low
      case "quantity-high-to-low":
        return sortedProducts.sort(
          (a, b) => (b.quantity || 0) - (a.quantity || 0),
        );

      default:
        return sortedProducts;
    }
  };

  const sortedFilterGroups = getSortedFilterGroups(filterGroups);
  const visibleFilterGroups = getVisibleFilterGroups(
    sortedFilterGroups,
    showAllFilterGroups
  );
  const shouldShowMoreFilters =
    sortedFilterGroups.length > VISIBLE_FILTER_GROUP_LIMIT;

  const treeForShowcase =
    showcaseCategoryTree.length > 0 ? showcaseCategoryTree : categoryTree;

  // Fresh random high-price mix only when showcase data loads (each page open)
  useEffect(() => {
    if (!showcaseProducts.length) {
      setMegaDealProducts([]);
      return;
    }
    setMegaDealProducts(pickMegaDeals(showcaseProducts, treeForShowcase, 3));
  }, [showcaseProducts, showcaseCategoryTree, categoryTree]);

  const scrollToAllProducts = () => {
    allProductsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const getProductBrand = (product) => {
    if (product.brand && typeof product.brand === "object") {
      return product.brand;
    }
    return (
      brands.find((b) => String(b._id) === String(product.brand)) || null
    );
  };

  const getProductBrandImage = (product) => {
    const brand = getProductBrand(product);
    const image = brand?.image;
    if (!image) return null;
    return image.startsWith("http") ? image : `/uploads/Brands/${image}`;
  };

  const getProductBrandName = (product) => {
    const brand = getProductBrand(product);
    if (brand?.brand_name) return brand.brand_name;
    if (product.brand_name) return product.brand_name;
    return "";
  };

  const renderShowcaseCard = (product) => {
    const { discountPercent: discount, showDiscount: hasDiscount } = getDiscountInfo(product.price, product.special_price);
    const imageSrc = getProductImageSrc(product);
    const brandName = getProductBrandName(product);
    const brandImage = getProductBrandImage(product);
    const salePrice = hasDiscount
      ? Math.round(product.special_price)
      : Math.round(product.price || 0);

    return (
      <div
        key={product._id}
        className="min-w-[300px] w-[300px] sm:min-w-[340px] sm:w-[340px] snap-start relative flex bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md overflow-hidden h-[300px]"
      >
        {hasDiscount && (
          <span className="absolute top-3 left-3 z-10 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded">
            {discount}% OFF
          </span>
        )}

        {(brandImage || brandName) && (
          <div className="absolute top-3 right-3 z-10 max-w-[40%] flex items-center justify-end">
            {brandImage ? (
              <Image
                src={brandImage}
                alt={brandName || "Brand"}
                width={110}
                height={40}
                className="object-contain max-h-9 sm:max-h-10 w-auto h-auto"
                unoptimized
              />
            ) : (
              <p className="text-[11px] sm:text-xs font-bold text-[#1E5FA8] uppercase tracking-wide truncate text-right">
                {brandName}
              </p>
            )}
          </div>
        )}

        <div className="relative w-[48%] shrink-0 flex flex-col items-center justify-center p-3 pt-12 pb-3">
          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={product.name}
                width={220}
                height={220}
                className="object-contain max-h-[200px] w-auto h-auto"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded" />
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center flex-1 py-5 pt-12 pr-4 pl-1 min-w-0 gap-2">
          <Link
            href={`/product/${product.slug}`}
            className="block"
            onClick={() => handleProductClick(product)}
          >
            <h3 className="text-sm sm:text-[15px] font-semibold text-[#1E5FA8] leading-snug line-clamp-4 hover:underline">
              {product.name}
            </h3>
          </Link>
          <div className="mt-1">
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through block leading-none mb-1">
                ₹{Math.round(product.price).toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-xl sm:text-2xl font-bold text-[#1E5FA8] leading-tight">
              ₹{salePrice.toLocaleString('en-IN')}
            </span>
          </div>
          <Link
            href={`/product/${product.slug}`}
            onClick={() => handleProductClick(product)}
            className="mt-3 inline-flex items-center justify-center self-start rounded-md bg-[#1E5FA8] hover:bg-[#174a86] text-white text-xs sm:text-sm font-bold tracking-wide px-6 py-2.5 transition-colors"
          >
            SHOP NOW
          </Link>
        </div>
      </div>
    );
  };

  const renderProductStrip = ({
    title,
    products,
    scrollRef,
    showViewAll = false,
  }) => {
    if (!products.length) return null;
    return (
      <section className="mb-10">
        <div className="relative flex items-center justify-center mb-5">
          <div className="flex items-center gap-3">
            <span className="hidden sm:block h-px w-10 bg-[#F7941D]" />
            <h2 className="text-lg sm:text-xl font-bold tracking-wide text-[#1E5FA8] uppercase text-center">
              {title}
            </h2>
            <span className="hidden sm:block h-px w-10 bg-[#F7941D]" />
          </div>
          {showViewAll && (
            <button
              type="button"
              onClick={scrollToAllProducts}
              className="absolute right-0 text-sm font-semibold text-[#1E5FA8] hover:underline"
            >
              View All Deals &gt;
            </button>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollStrip(scrollRef, "left")}
            className="absolute -left-1 sm:-left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-red-100 shadow text-[#1E5FA8] flex items-center justify-center hover:bg-red-50"
          >
            <ChevronLeft size={18} />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-1 scrollbar-hide"
          >
            {products.map((product) => renderShowcaseCard(product))}
          </div>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollStrip(scrollRef, "right")}
            className="absolute -right-1 sm:-right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-red-100 shadow text-[#1E5FA8] flex items-center justify-center hover:bg-red-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="container mx-auto px-4 py-2 pb-3 max-w-[1400px]">
      {/* Banner, then feature bar below (no overlap) */}
      <div className="mb-6">
        {banners.length > 0 && (
          <div className="relative w-full overflow-hidden rounded-xl">
            <div
              className="relative w-full cursor-pointer overflow-hidden rounded-xl"
              onClick={() => {
                const url = banners[currentBannerIndex]?.redirect_url;
                if (url) window.location.href = url;
              }}
            >
              <Image
                src={banners[currentBannerIndex].banner_image}
                alt={`Open Box Banner ${currentBannerIndex + 1}`}
                width={1920}
                height={600}
                className="w-full h-auto object-cover rounded-xl"
                unoptimized
              />
            </div>

            {banners.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBannerIndex((prev) =>
                      prev === 0 ? banners.length - 1 : prev - 1,
                    );
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBannerIndex((prev) =>
                      prev === banners.length - 1 ? 0 : prev + 1,
                    );
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                {banners.map((_, index) => (
                  <label
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIndex(index);
                    }}
                    className="cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        index === currentBannerIndex
                          ? "bg-white border-white"
                          : "bg-transparent border-white/70"
                      }`}
                    >
                      {index === currentBannerIndex && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d72828]"></span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={`bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(30,95,168,0.12)] px-3 py-4 sm:px-5 sm:py-5 ${
            banners.length > 0 ? "mt-4" : "mt-0"
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {OPEN_BOX_FEATURES.map(({ title, desc, Icon }) => (
              <div
                key={title}
                className="flex items-center gap-2.5 sm:gap-3 px-1"
              >
                <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#1E5FA8]/30 text-[#1E5FA8] flex items-center justify-center">
                  <Icon className="text-lg sm:text-xl" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800 leading-tight">
                    {title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {renderProductStrip({
        title: "Mega Clearance Deals",
        products: megaDealProducts,
        scrollRef: megaScrollRef,
        showViewAll: true,
      })}

      {/* Header — all EOL & FOCUS (qty 0…n) */}
      <div ref={allProductsRef} className="mb-6 scroll-mt-4">
        <h1 className="text-3xl font-bold text-gray-700">Open Box Products</h1>
      </div>

      <button
        type="button"
        onClick={() => setIsFilterPanelOpen(true)}
        className="md:hidden w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-[#d72828] font-semibold text-sm shadow-sm"
      >
        <FaSlidersH className="text-[#d72828] text-sm" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#d72828] text-white text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Mobile backdrop */}
        {isFilterPanelOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsFilterPanelOpen(false)}
          />
        )}

        {/* Sidebar — desktop always visible; mobile slides from left */}
        <div
          className={`${
            isFilterPanelOpen
              ? "fixed left-0 top-0 w-4/5 h-full bg-white shadow-lg z-50 flex flex-col md:static md:z-auto md:w-[250px] md:h-auto md:shadow-none md:block"
              : "hidden md:block md:w-[250px] shrink-0"
          }`}
        >
          {/* Mobile panel header */}
          <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-white md:hidden">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 md:p-0 md:overflow-visible md:space-y-0">
          {/* Active Filters */}
          {(selectedFilters.brands.length > 0 ||
            selectedFilters.price.min !== priceRange[0] ||
            selectedFilters.price.max !== priceRange[1] ||
            selectedFilters.category !== "" ||
            selectedFilters.subCategory !== "") && (
            <div className="bg-white p-4 rounded shadow mb-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Active Filters</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-[#d72828] text-sm hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFilters.brands.map((brandId) => {
                  const brand = brands.find((b) => b._id === brandId);
                  return brand ? (
                    <span
                      key={brandId}
                      className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {brand.brand_name}
                      <button
                        onClick={() => handleFilterChange("brands", brandId)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
                {(selectedFilters.price.min !== priceRange[0] ||
                  selectedFilters.price.max !== priceRange[1]) && (
                  <span className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center">
                    ₹{selectedFilters.price.min} - ₹{selectedFilters.price.max}
                    <button
                      onClick={() =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          price: { min: priceRange[0], max: priceRange[1] },
                        }))
                      }
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                )}

                {/* Category tag */}
                {selectedFilters.category && (
                  <span className="bg-red-50 border border-red-200 px-2 py-1 rounded text-sm flex items-center text-[#d72828]">
                    {selectedFilters.category}
                    <button
                      onClick={() =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          category: "",
                          subCategory: "",
                        }))
                      }
                      className="ml-1 text-[#d72828] hover:text-[#d72828]"
                    >
                      ×
                    </button>
                  </span>
                )}

                {/* SubCategory tag */}
                {selectedFilters.subCategory && (
                  <span className="bg-green-50 border border-green-200 px-2 py-1 rounded text-sm flex items-center text-green-700">
                    {selectedFilters.subCategory}
                    <button
                      onClick={() =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          subCategory: "",
                        }))
                      }
                      className="ml-1 text-green-400 hover:text-green-600"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-3">
            <h3 className="text-base font-semibold mb-4 text-gray-700">
              Price Range
            </h3>
            <ReactRange
              values={values}
              step={STEP}
              min={MIN}
              max={MAX}
              onChange={(newValues) => setValues(newValues)}
              onFinalChange={(newValues) => handlePriceChange(newValues)}
              renderTrack={({ props, children }) => (
                <div
                  {...props}
                  className="w-full h-2 rounded-lg bg-gray-200 relative"
                >
                  <div
                    className="absolute h-2 bg-gray-500 rounded-lg"
                    style={{
                      left: `${((values[0] - MIN) / (MAX - MIN)) * 100}%`,
                      width: `${
                        ((values[1] - values[0]) / (MAX - MIN)) * 100
                      }%`,
                    }}
                  />
                  {children}
                </div>
              )}
              renderThumb={({ props, index }) => {
                const { key, ...rest } = props;
                return (
                  <div
                    key={key}
                    {...rest}
                    className={`w-4 h-4 rounded-full border-2 border-black shadow cursor-pointer relative ${
                      index === 0 ? "bg-[#d72828] z-10" : "bg-green-500 z-20"
                    }`}
                  />
                );
              }}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-6">
              <span>₹{values[0].toLocaleString('en-IN')}</span>
              <span>₹{values[1].toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Categories — subcategories */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-3">
            <div className="flex items-center justify-between pb-2 bg-gray-300 p-2">
              <h3 className="text-base font-semibold text-gray-700">
                Categories
              </h3>
              <button
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              >
                {isCategoriesExpanded ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
            </div>

            {isCategoriesExpanded && (
              <ul className={`mt-2 ${FILTER_LIST_MAX_HEIGHT} overflow-y-auto pr-2`}>
                <li>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={
                        selectedFilters.subCategory === "" &&
                        selectedFilters.category === ""
                      }
                    onChange={() => {
                      setSelectedFilters((prev) => ({
                      ...prev,
                       category: "",
                       subCategory: "",
                        }));
                      setSelectedProductFilters([]);
                         }}
                      className="h-4 w-4 text-[#d72828]"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      All Categories
                    </span>
                  </label>
                </li>

                {categoryTree.flatMap((topCat) =>
                  topCat.subCategories?.length > 0
                    ? topCat.subCategories.map((sub) => (
                        <li key={sub._id}>
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="radio"
                              name="category"
                              checked={
                                selectedFilters.category === sub.category_name
                              }
                              onChange={() =>
                                setSelectedFilters((prev) => ({
                                  ...prev,
                                  category: sub.category_name,
                                  subCategory: "",
                                }))
                              }
                              className="h-4 w-4 text-[#d72828]"
                            />
                            <span
                              className={`text-sm ${
                                selectedFilters.category === sub.category_name
                                  ? "text-[#d72828] font-medium"
                                  : "text-gray-600"
                              }`}
                            >
                              {sub.category_name}
                            </span>
                          </label>
                        </li>
                      ))
                    : [],
                )}
              </ul>
            )}
          </div>

          {/* Children — category select */}
          {selectedFilters.category &&
            (() => {
              let children = [];
              for (const topCat of categoryTree) {
                const found = topCat.subCategories?.find(
                  (s) => s.category_name === selectedFilters.category,
                );
                if (found) {
                  children = found.subCategories || [];
                  break;
                }
              }

              if (children.length === 0) return null;

              return (
                <div className="bg-white p-4 rounded-lg shadow-sm border mb-3">
                  <div className="bg-gray-300 p-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-700">
                      {selectedFilters.category}
                    </h3>
                  </div>
                  <ul className={`mt-2 ${FILTER_LIST_MAX_HEIGHT} overflow-y-auto pr-2`}>
                    <li>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="radio"
                          name="subcategory"
                          checked={selectedFilters.subCategory === ""}
                          onChange={() =>
                            setSelectedFilters((prev) => ({
                              ...prev,
                              subCategory: "",
                            }))
                          }
                          className="h-4 w-4 text-[#d72828]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          All {selectedFilters.category}
                        </span>
                      </label>
                    </li>
                    {children.map((child) => (
                      <li key={child._id}>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="radio"
                            name="subcategory"
                            checked={
                              selectedFilters.subCategory ===
                              child.category_name
                            }
                            onChange={() =>
                              setSelectedFilters((prev) => ({
                                ...prev,
                                subCategory: child.category_name,
                              }))
                            }
                            className="h-4 w-4 text-[#d72828]"
                          />
                          <span
                            className={`text-sm ${
                              selectedFilters.subCategory ===
                              child.category_name
                                ? "text-[#d72828] font-medium"
                                : "text-gray-600"
                            }`}
                          >
                            {child.category_name}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

          {/* Brands */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-3">
            <div className="flex items-center justify-between pb-2 bg-gray-300 p-2">
              <h3 className="text-base font-semibold text-gray-700">Brands</h3>
              <button
                onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isBrandsExpanded ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
            </div>
            {isBrandsExpanded && (
              <ul className={`mt-2 ${FILTER_LIST_MAX_HEIGHT} overflow-y-auto pr-2`}>
                {brands.map((brand) => (
                  <li key={brand._id} className="flex items-center">
                    <label className="flex items-center space-x-2 w-full cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedFilters.brands.includes(brand._id)}
                        onChange={() => handleFilterChange("brands", brand._id)}
                        className="mr-2 h-4 w-4 text-[#d72828] border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600">
                        {brand.brand_name} ({brand.count})
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
               {Object.keys(filterGroups).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-3">
          <h3 className="text-base font-semibold text-gray-700 mb-2">Product Filters</h3>
          <div className="space-y-4">
          {visibleFilterGroups.map((g) => (
         <div key={g._id} className="border-b last:border-0 pb-2">
        <button
          onClick={() =>
          setExpandedGroups((prev) => ({ ...prev, [g._id]: !prev[g._id] }))
          }
          className="flex justify-between w-full items-center text-sm font-medium text-gray-700"
          >
          <span>{g.name}</span>
            <ChevronDown
              className={expandedGroups[g._id] ? "transform rotate-180" : ""}
            />
          </button>

          {expandedGroups[g._id] && (
            <ul className={`mt-2 ${FILTER_LIST_MAX_HEIGHT} overflow-y-auto pr-2`}>
              {g.filters.map((f) => {
                return (
                  <li key={f._id} className="py-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProductFilters.includes(String(f._id))}
                        onChange={() => toggleProductFilter(String(f._id))}
                      />
                      <span className="text-sm text-gray-700">
                        {f.filter_name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
      {shouldShowMoreFilters && (
        <button
          type="button"
          className="mt-2 text-[#d72828] text-sm hover:underline"
          onClick={() => setShowAllFilterGroups((v) => !v)}
        >
          {showAllFilterGroups ? "Show less" : "More filters"}
        </button>
      )}
    </div>
  </div>
)}
          </div>

          {/* Mobile panel footer */}
          <div className="p-4 border-t flex-shrink-0 bg-white md:hidden">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="w-full bg-[#d72828] text-white py-2 rounded-md"
            >
              Apply Filters
            </button>
          </div>
        </div>
        {/* Products */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-gray-600">
              {pagination.totalProducts} products found
            </p>
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
                <option value="quantity-low-to-high">
                  Quantity: Low to High
                </option>
                <option value="quantity-high-to-low">
                  Quantity: High to Low
                </option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {!nofound ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {getSortedProducts().map((product) => (
                  <div
                    key={product._id}
                    className="group relative bg-white rounded-lg border hover:border-red-200 transition-all shadow-sm hover:shadow-md flex flex-col h-full"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-white">
                      {product.images?.[0] && (
                        <Image
                          src={
                            product.images[0].startsWith("http")
                              ? product.images[0]
                              : `/uploads/products/${product.images[0]}`
                          }
                          alt={product.name}
                          fill
                          className="object-contain p-2 md:p-4 transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 33vw, 25vw"
                          unoptimized
                        />
                      )}
                      {/* Discount Badge */}

                    {(product.movement === "EOL" || product.movement === "FOCUS") && (
                         <span className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 animate-pulse tracking-wide uppercase">
                       🏷️ Clearance Sale
                         </span>
                            )}

                      {(() => {
                        const { discountPercent: discPct, showDiscount: hasDisc } = getDiscountInfo(product.price, product.special_price);
                        return hasDisc ? (
                          <span className="absolute top-2 left-2 bg-orange-500 tracking-wider text-white text-xs font-bold px-2 py-1 rounded z-10">
                            -{discPct}%
                          </span>
                        ) : null;
                      })()}

                      {/* Wishlist */}
                      <div className="absolute top-2 right-2">
                        <ProductCard productId={product._id} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2 md:p-4 flex flex-col h-full">
                      <Link
                        href={`/product/${product.slug}`}
                        className="block mb-2"
                        onClick={() => handleProductClick(product)}
                      >
                        <h3 className="text-xs sm:text-sm font-medium text-gray-800 hover:text-[#d72828] line-clamp-2 min-h-[40px]">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Price */}
                      {(() => {
                        const { showDiscount: hasDisc } = getDiscountInfo(product.price, product.special_price);
                        return (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base font-semibold text-red-600">
                              ₹
                              {(hasDisc
                                ? Math.round(product.special_price)
                                : Math.round(product.price)
                              ).toLocaleString('en-IN')}
                            </span>
                            {hasDisc && (
                              <span className="text-xs text-gray-500 line-through">
                                ₹{Math.round(product.price).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="mb-2">
                        {product.quantity > 0 ? (
                          <span className="text-xs text-green-600 font-medium">
                            In Stock, {product.quantity} units
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      {/* Buttons */}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <Addtocart
                          productId={product._id}
                          stockQuantity={product.quantity}
                          special_price={product.special_price}
                          className="w-full text-xs sm:text-sm py-1.5"
                           movement={product.movement}
                        productName={product.name}
                         productSlug={product.slug}
                        />
                        {/* <button
                          type="button"
                          onClick={() => handleShare(product)}
                          className="bg-[#d72828] hover:bg-[#d72828] text-white p-1.5 rounded-full transition-colors duration-300 flex items-center justify-center flex-shrink-0"
                          title="Share this product"
                        >
                          <FaShareAlt className="w-5 h-5" />
                        </button> */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="text-center py-10 mx-auto">
              <img
                src="/images/no-productbox.png"
                alt="No Products"
                className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 object-contain"
              />
              <p className="text-gray-500">No Open Box products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
