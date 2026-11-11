"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactPaginate from "react-paginate";
import { FaPlus, FaMinus, FaEdit } from "react-icons/fa";
import DateRangePicker from '@/components/DateRangePicker';
import EditProductModal from "./EditProductModal";
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { ToastContainer, toast } from "react-toastify";

export default function CategoryComponent() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("search") || "";
    }
    return "";
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("search") || "";
    }
    return "";
  });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [SelectedProduct, setSelectedProduct] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState({});

  // Filters
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("status") || "";
    }
    return "";
  });
  const [categoryFilter, setCategoryFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("category") || "";
    }
    return "";
  });
  const [subCategoryFilter, setSubCategoryFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("sub_category") || "";
    }
    return "";
  });
  const [brandFilter, setBrandFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("brand") || "";
    }
    return "";
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });
  const [stockFilter, setStockFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("stock") || "";
    }
    return "";
  });
  const [showAlert, setShowAlert] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Unilet products state
  const [uniletProductsList, setUniletProductsList] = useState([]);
  const [uniletModalOpen, setUniletModalOpen] = useState(false);
  const [selectedUniletProduct, setSelectedUniletProduct] = useState(null);
  const [uniletForm, setUniletForm] = useState({
    price: '',
    offer_price: '',
    stock: 10,
    stock_status: 'In Stock',
    vendor_item_code: '',
    region: 'karnataka',
    is_active: true,
    delivery_days: 1,
  });
  const [isSavingUnilet, setIsSavingUnilet] = useState(false);
  
  const fetchUniletList = async () => {
    try {
      const res = await fetch('/api/admin/owner-product');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUniletProductsList(data.data);
      }
    } catch (err) {
      console.error('Error fetching unilet records:', err);
    }
  };

  const isProductInUnilet = (product) => {
    if (!product || !Array.isArray(uniletProductsList)) return false;
    const prodId = product._id ? product._id.toString() : '';
    const itemCode = product.item_code || '';
    return uniletProductsList.some((u) => {
      const uProdId = u.product_id?._id
        ? u.product_id._id.toString()
        : u.product_id
          ? u.product_id.toString()
          : '';
      const uItemCode = u.product_item_code || u.product_id?.item_code || '';
      return (prodId && uProdId && prodId === uProdId) || (itemCode && uItemCode && itemCode === uItemCode);
    });
  };

  const [checkingUniletStore, setCheckingUniletStore] = useState(false);

  const handleAddToUnilet = async (product) => {
    if (checkingUniletStore) return;
    try {
      setCheckingUniletStore(true);
      const res = await fetch('/api/store_owners/unilet-exists');
      const data = await res.json();
      if (data?.exists) {
        handleOpenUniletModal(product);
      } else {
        toast.error('Unilet store not found. Please create the Unilet store first.');
        window.location.href = '/admin/store-owners?add=unilet';
      }
    } catch (err) {
      toast.error('Unable to check Unilet store. Please try again.');
    } finally {
      setCheckingUniletStore(false);
    }
  };

  const handleOpenUniletModal = (product) => {
    setSelectedUniletProduct(product);
    const defaultVendorCode = product.item_code ? `${product.item_code}_U` : '';
    setUniletForm({
      price: product.price || '',
      offer_price: product.special_price || 0,
      stock: product.quantity || 10,
      stock_status: (product.quantity || 0) > 0 ? 'In Stock' : 'Out of Stock',
      vendor_item_code: defaultVendorCode,
      region: 'karnataka',
      is_active: true,
      delivery_days: 1,
    });
    setUniletModalOpen(true);
  };

  const handleSaveUniletFromProductList = async (e) => {
    e.preventDefault();
    if (!selectedUniletProduct) return;

    const priceNum = Number(uniletForm.price);
    const offerPriceNum = Number(uniletForm.offer_price);
    const stockNum = Number(uniletForm.stock);

    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Price must be a valid non-negative number');
      return;
    }
    if (isNaN(offerPriceNum) || offerPriceNum < 0) {
      toast.error('Offer price must be a valid non-negative number');
      return;
    }
    if (offerPriceNum > 0 && offerPriceNum > priceNum) {
      toast.error('Offer price cannot exceed standard price');
      return;
    }

    try {
      setIsSavingUnilet(true);
      const res = await fetch('/api/admin/owner-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          product_id: selectedUniletProduct._id,
          product_item_code: selectedUniletProduct.item_code || '',
          vendor_item_code: uniletForm.vendor_item_code,
          vendor_product_name: selectedUniletProduct.name || '',
          price: priceNum,
          offer_price: offerPriceNum,
          stock: stockNum,
          stock_status: stockNum > 0 ? uniletForm.stock_status : 'Out of Stock',
          is_active: uniletForm.is_active,
          delivery_days: Number(uniletForm.delivery_days) || 1,
          region: uniletForm.region || 'karnataka',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Product successfully added to Unilet!');
        setUniletModalOpen(false);
        fetchUniletList();
      } else {
        toast.error(data.message || 'Failed to save to Unilet');
      }
    } catch (err) {
      toast.error(err.message || 'Error saving to Unilet');
    } finally {
      setIsSavingUnilet(false);
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const searchTimeoutRef = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(val);
      setCurrentPage(0);
      syncUrlParams(0, val, statusFilter, categoryFilter, subCategoryFilter, brandFilter, stockFilter);
      fetchProducts(0, { search: val });
    }, 400);
  };

  // Sync state to URL bar on explicit user interactions only (never on refresh!)
  const syncUrlParams = (pageVal, searchVal, statusVal, catVal, subCatVal, brandVal, stockVal) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (pageVal > 0) params.set("page", (pageVal + 1).toString());
    if (searchVal && searchVal.trim()) params.set("search", searchVal.trim());
    if (statusVal) params.set("status", statusVal);
    if (catVal) params.set("category", catVal);
    if (subCatVal) params.set("sub_category", subCatVal);
    if (brandVal) params.set("brand", brandVal);
    if (stockVal) params.set("stock", stockVal);

    const queryStr = params.toString();
    const newUrl = `${window.location.pathname}${queryStr ? '?' + queryStr : ''}`;
    window.history.replaceState(null, "", newUrl);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    syncUrlParams(newPage, debouncedSearchQuery, statusFilter, categoryFilter, subCategoryFilter, brandFilter, stockFilter);
    fetchProducts(newPage);
  };
  
  // Add this useEffect to fetch filter groups
  useEffect(() => {
    const fetchFilterGroups = async () => {
      try {
        const response = await fetch("/api/filter_group/all");
        const result = await response.json();

        // 👇 adjust according to API shape
        const groupsArray = Array.isArray(result)
          ? result
          : result.data || result.groups || [];

        const groupsMap = {};
        groupsArray.forEach(group => {
          groupsMap[group._id] = group.filtergroup_name;
        });

        setFilterGroups(groupsMap);
        console.log("Filter groups loaded:", groupsMap);
      } catch (error) {
        console.error("Error fetching filter groups:", error);
      }
    };

    fetchFilterGroups();
  }, []);


  // Fetch products, categories and brands from API
   const fetchProducts = async (page = currentPage, overrides = {}) => {
    try {
      setIsLoading(true);

      const targetSearch = overrides.search !== undefined ? overrides.search : debouncedSearchQuery;
      const targetStatus = overrides.status !== undefined ? overrides.status : statusFilter;
      const targetCategory = overrides.category !== undefined ? overrides.category : categoryFilter;
      const targetSubCategory = overrides.sub_category !== undefined ? overrides.sub_category : subCategoryFilter;
      const targetBrand = overrides.brand !== undefined ? overrides.brand : brandFilter;
      const targetStock = overrides.stock !== undefined ? overrides.stock : stockFilter;

      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: itemsPerPage.toString(),
      });
      if (targetSearch && targetSearch.trim()) params.append("search", targetSearch.trim());
      if (targetStatus) params.append("status", targetStatus);
      if (targetCategory) params.append("category", targetCategory);
      if (targetSubCategory) params.append("sub_category", targetSubCategory);
      if (targetBrand) params.append("brand", targetBrand);
      if (targetStock) params.append("stock", targetStock);

      const res = await fetch(`/api/admin/product?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        setTotalProducts(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const [subcategories, setSubcategories] = useState([]);
  const fetchSubcategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setSubcategories(Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brand/get");
      const data = await response.json();
      if (data.success) {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  // Fetch initial master lists on mount + parse URL params + listen to browser back/forward buttons
  useEffect(() => {
    let initialPage = 0;
    let initialSearch = "";
    let initialStatus = "";
    let initialCategory = "";
    let initialSubCategory = "";
    let initialBrand = "";
    let initialStock = "";

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pageParam = parseInt(params.get("page") || "1", 10);
      if (!isNaN(pageParam) && pageParam > 1) {
        initialPage = pageParam - 1;
        setCurrentPage(initialPage);
        setTotalPages((prev) => Math.max(prev, pageParam));
      }
      if (params.get("search")) {
        initialSearch = params.get("search");
        setSearchQuery(initialSearch);
        setDebouncedSearchQuery(initialSearch);
      }
      if (params.get("status")) {
        initialStatus = params.get("status");
        setStatusFilter(initialStatus);
      }
      if (params.get("category")) {
        initialCategory = params.get("category");
        setCategoryFilter(initialCategory);
      }
      if (params.get("sub_category")) {
        initialSubCategory = params.get("sub_category");
        setSubCategoryFilter(initialSubCategory);
      }
      if (params.get("brand")) {
        initialBrand = params.get("brand");
        setBrandFilter(initialBrand);
      }
      if (params.get("stock")) {
        initialStock = params.get("stock");
        setStockFilter(initialStock);
      }
    }

    fetchCategories();
    fetchBrands();
    fetchSubcategories();
    fetchUniletList();

    // Fetch initial products for the exact URL page (URL is 100% untouched on refresh!)
    fetchProducts(initialPage, {
      search: initialSearch,
      status: initialStatus,
      category: initialCategory,
      sub_category: initialSubCategory,
      brand: initialBrand,
      stock: initialStock,
    });

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pageParam = parseInt(params.get("page") || "1", 10);
      const p = !isNaN(pageParam) && pageParam > 1 ? pageParam - 1 : 0;
      const s = params.get("search") || "";
      const st = params.get("status") || "";
      const cat = params.get("category") || "";
      const sub = params.get("sub_category") || "";
      const br = params.get("brand") || "";
      const stk = params.get("stock") || "";

      setCurrentPage(p);
      setSearchQuery(s);
      setDebouncedSearchQuery(s);
      setStatusFilter(st);
      setCategoryFilter(cat);
      setSubCategoryFilter(sub);
      setBrandFilter(br);
      setStockFilter(stk);

      fetchProducts(p, {
        search: s,
        status: st,
        category: cat,
        sub_category: sub,
        brand: br,
        stock: stk,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Search debounce is handled purely by handleSearchChange on user input




  // const exportToExcel = () => {
  //   // Prepare data in the exact requested format
  //   const dataForExport = filteredProducts.map(product => ({
  //     'Item No.': product.item_code,
  //     'Product Name': product.name,
  //     'StockQty': product.quantity,
  //     'Category': product.category?.category_name || product.category || 'No Category',
  //     'Subcategory': product.sub_category || 'No Subcategory',
  //     'Brand': product.brand?.brand_name || product.brand || 'No Brand',
  //     'Size': product.filter?.size || '',
  //     'Star': product.featured_products?.star_rating || '',
  //     'Movement': product.stock_status === "In Stock" ? "In Stock" : "Out of Stock",
  //     'MRP PRICE': product.price,
  //     'Special Price': product.special_price,
  //     'Description': product.description || '',
  //     'Key Features': product.key_specifications || '',
  //     'image1': product.images?.[0] || '',
  //     'image2': product.images?.[1] || '',
  //     'image3': product.images?.[2] || '',
  //     'overview images': product.overview_image?.join(", ") || '',
  //     'overview_description': product.overviewdescription || '',
  //     'variants': product.hasVariants ? JSON.stringify(product.variants) : '',
  //     'Status': product.status
  //   }));

  //   // Create worksheet with the exact column order
  //   const worksheet = XLSX.utils.json_to_sheet(dataForExport, {
  //     header: [
  //       'Item No.',
  //       'Product Name',
  //       'StockQty',
  //       'Category',
  //       'Subcategory',
  //       'Brand',
  //       'Size',
  //       'Star',
  //       'Movement',
  //       'MRP PRICE',
  //       'Special Price',
  //       'Description',
  //       'Key Features',
  //       'image1',
  //       'image2',
  //       'image3',
  //       'overview images',
  //       'overview_description',
  //       'variants',
  //       'Status'
  //     ]
  //   });

  //   // Create workbook
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  //   // Generate file and trigger download
  //   XLSX.writeFile(workbook, `products_export_${new Date().toISOString().slice(0,10)}.xlsx`);
  // };

  // Export to Excel function
  // const exportToExcel = () => {
  //   const dataForExport = filteredProducts.map(product => ({
  //     'Item Code': product.item_code,
  //     'Name': product.name,
  //     'Price': product.price,
  //     'Special Price': product.special_price,
  //     'Quantity': product.quantity,
  //     'Status': product.status,
  //     'Brand': product.brand?.brand_name || 'No Brand',
  //     'Category': product.category?.category_name || 'No Category',
  //     'Created At': new Date(product.createdAt).toLocaleDateString()
  //   }));

  //   const worksheet = XLSX.utils.json_to_sheet(dataForExport);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  //   XLSX.writeFile(workbook, `products_export_${new Date().toISOString().slice(0,10)}.xlsx`);
  // };

  // const exportToExcel = () => {
  //   // Create mapping objects for faster lookup
  //   const categoryMap = {};
  //   categories.forEach(cat => {
  //     categoryMap[cat._id] = cat.category_name;
  //   });

  //   const brandMap = {};
  //   brands.forEach(brand => {
  //     const brandId = brand._id || brand.id;
  //     if (brandId) {
  //       brandMap[brandId] = brand.brand_name || brand.name;
  //     }
  //   });

  //   // Prepare data with names instead of IDs
  //   const dataForExport = filteredProducts.map(product => {
  //     // console.log("Check for product category::",product);
  //     // Resolve category name
  //     // let categoryName = 'No Category';
  //     /* if (product.category) {
  //       if (typeof product.category === 'object') {
  //         categoryName = product.category.category_name;
  //       } else if (categoryMap[product.category]) {
  //         categoryName = categoryMap[product.category];
  //       }
  //     } */

  //    /*    if (product.sub_category_new_name) {

  //   const parts = product.sub_category_new_name
  //     .split('##')
  //     .map(p => p.trim())
  //     .filter(Boolean);

  //   if (parts.length >= 3) {
  //     categoryName = parts[1]; // parent
  //   } else if (parts.length === 2) {
  //     categoryName = parts[0]; // main
  //   } else if (parts.length === 1) {
  //     categoryName = parts[0]; // only one
  //   }

  // } */


  // /* if (product.sub_category_new_name) {

  //   const parts = product.sub_category_new_name
  //     .split('##')
  //     .map(p => p.trim())
  //     .filter(Boolean);

  //   if (parts.length >= 3) {
  //     categoryName = parts[1]; // ✅ parent
  //   } else if (parts.length === 2) {
  //     categoryName = parts[0]; // ✅ main
  //   } else if (parts.length === 1) {
  //     categoryName = parts[0]; // ✅ single
  //   }

  // } */

  // /*     // ✅ CASE 2: fallback to category_new
  // else if (product.category_new) {
  //   if (categoryMap[product.category_new]) {
  //     categoryName = categoryMap[product.category_new];
  //   } else {
  //     categoryName = product.category_new; // fallback if mapping missing
  //   }
  // } */



  //   /* let categoryName = 'No Category';

  // // ✅ CASE 1: sub_category_new_name (priority)
  // if (typeof product.sub_category_new_name === 'string' && product.sub_category_new_name.trim()) {

  //   const parts = product.sub_category_new_name
  //     .split('##')
  //     .map(p => p.trim())
  //     .filter(Boolean);

  //   if (parts.length >= 3) {
  //     categoryName = parts[1]; // parent
  //   } else if (parts.length === 2) {
  //     categoryName = parts[0]; // main
  //   } else if (parts.length === 1) {
  //     categoryName = parts[0];
  //   }
  // }

  // // ✅ CASE 2: fallback → category (object)
  // else if (product.category && typeof product.category === 'object') {
  //   categoryName = product.category.category_name || 'No Category';
  // }

  // // ✅ CASE 3: fallback → category ID map
  // else if (product.category && categoryMap[product.category]) {
  //   categoryName = categoryMap[product.category];
  // }

  // // ✅ CASE 4: fallback → category_new
  // else if (product.category_new && categoryMap[product.category_new]) {
  //   categoryName = categoryMap[product.category_new];
  // }

  // // ✅ LAST fallback (optional)
  // else if (product.category_new) {
  //   categoryName = product.category_new;
  // }

  //  */


  // let categoryName = 'No Category';

  // // ✅ STEP 1: take available hierarchy string
  // let categorySource =
  //   product.sub_category_new_name ||
  //   product.sub_category_name ||   // ✅ THIS FIX
  //   '';

  // // ✅ STEP 2: extract required level
  // if (typeof categorySource === 'string' && categorySource.trim()) {

  //   const parts = categorySource
  //     .split('##')
  //     .map(p => p.trim())
  //     .filter(Boolean);

  //   if (parts.length >= 3) {
  //     categoryName = parts[1]; // ✅ parent (your requirement)
  //   } else if (parts.length === 2) {
  //     categoryName = parts[0];
  //   } else if (parts.length === 1) {
  //     categoryName = parts[0];
  //   }
  // }

  // // ✅ STEP 3: fallback → category object
  // else if (product.category && typeof product.category === 'object') {
  //   categoryName = product.category.category_name || 'No Category';
  // }

  // // ✅ STEP 4: fallback → category map
  // else if (product.category && categoryMap[product.category]) {
  //   categoryName = categoryMap[product.category];
  // }

  // // ✅ STEP 5: fallback → category_new map
  // else if (product.category_new && categoryMap[product.category_new]) {
  //   categoryName = categoryMap[product.category_new];
  // }

  // // ❌ DON'T SHOW ID
  // // remove this:
  // // else if (product.category_new) {
  // //   categoryName = product.category_new;
  // // }

  //     // Resolve subcategory name
  //     let subcategoryName = 'No Subcategory';
  //     if (product.sub_category) {
  //       if (typeof product.sub_category === 'object') {
  //         subcategoryName = product.sub_category.category_name;
  //       } else if (categoryMap[product.sub_category]) {
  //         subcategoryName = categoryMap[product.sub_category];
  //       }
  //     }

  //     // Resolve brand name
  //     let brandName = 'No Brand';
  //     if (product.brand) {
  //       if (typeof product.brand === 'object') {
  //         brandName = product.brand.brand_name || product.brand.name || 'No Brand Namee';
  //       } else {
  //         brandName = brandMap[product.brand] || 'Brand not found';
  //       }
  //     }

  //     // Process filters with group names
  //   let filterString = '';

  // if (product.filterDetails && product.filterDetails.length > 0) {
  //   const formattedFilters = product.filterDetails.map(filter => {
  //     let groupName = 'Other';

  //     // CASE 1: filter_group is populated object
  //     if (filter.filter_group && typeof filter.filter_group === 'object') {
  //       groupName = filter.filter_group.filtergroup_name || 'Other';
  //     }

  //     // CASE 2: filter_group is ID → lookup from filterGroups map
  //     else if (filter.filter_group && typeof filter.filter_group === 'string') {
  //       groupName = filterGroups[filter.filter_group] || 'Other';
  //     }

  //     // CASE 3: backend already sends group name
  //     else if (filter.filter_group_name) {
  //       groupName = filter.filter_group_name;
  //     }

  //     return `${groupName}: ${filter.filter_name}`;
  //   });

  //   filterString = formattedFilters.join(', ');
  // }

  //     // Separate size filters if you want them in their own column
  //     let sizeFilter = '';
  //     if (product.sizeFilterDetails && product.sizeFilterDetails.length > 0) {
  //       const sizeFilters = product.sizeFilterDetails.map(filter => {
  //         let groupName = 'Size';
  //         if (filter.filter_group && typeof filter.filter_group === 'object') {
  //           groupName = filter.filter_group.filtergroup_name || 'Size';
  //         }
  //         return `${groupName}: ${filter.filter_name}`;
  //       });
  //       sizeFilter = sizeFilters.join(', ');
  //     }

  //     const plainText = product.description ? product.description.replace(/<[^>]*>/g, '') : '';
  // const getSpecsForExcel = (specs) => {
  //   if (!specs || !Array.isArray(specs)) return [];

  //   // Step 1: take first string
  //   const fullText = specs[0];

  //   if (!fullText) return [];

  //   // Step 2: split using newline (correct way)
  //   return fullText
  //     .split('\n')
  //     .map(item => item.trim().replace(/,$/, '')) // remove ending comma
  //     .filter(item => item.includes(':'))
  //     .map(item => {
  //       const [key, ...rest] = item.split(':');

  //       return {
  //         Key: key.trim(),
  //         Value: rest.join(':').trim()
  //       };
  //     });
  // };
  // const specsArray = getSpecsForExcel(product.key_specifications);
  // const formattedSpecs = specsArray
  //   .map(item => `${item.Key}: ${item.Value}`)
  //   .join('\n');
  //     return {
  //       'Item No.': product.item_code,
  //       'Product Name': product.name,
  //       'StockQty': product.quantity,
  //       'Category': categoryName.toUpperCase(),
  //       'Subcategory': subcategoryName.toUpperCase(),
  //       'Brand': brandName,
  //       'Size': sizeFilter, // Size with group name
  //       'Filters': filterString, // All filters with group names
  //       'Star': product.star || '',
  //       'Movement': product.movement || '',
  //       'MRP PRICE': product.price,
  //       'Special Price': product.special_price,
  //       // 'Description': product.description || '',
  //       'Description': plainText || '',
  //       // 'Key Features': product.key_specifications || '',
  //       'Key Features': formattedSpecs || '',
  //       'image1': product.images?.[0] || '',
  //       'image2': product.images?.[1] || '',
  //       'image3': product.images?.[2] || '',
  //       'overview images': product.overview_image?.join(", ") || '',
  //       'overview_description': product.overviewdescription || '',
  //       'variants': product.hasVariants ? JSON.stringify(product.variants) : '',
  //       'Status': product.status
  //     };
  //   });

  //   // Create worksheet with the exact column order
  //   const worksheet = XLSX.utils.json_to_sheet(dataForExport, {
  //     header: [
  //       'Item No.',
  //       'Product Name',
  //       'StockQty',
  //       'Category',
  //       'Subcategory',
  //       'Brand',
  //       'Size',
  //       'Filters',
  //       'Star',
  //       'Movement',
  //       'MRP PRICE',
  //       'Special Price',
  //       'Description',
  //       'Key Features',
  //       'image1',
  //       'image2',
  //       'image3',
  //       'overview images',
  //       'overview_description',
  //       'variants',
  //       'Status'
  //     ]
  //   });

  //   // Create workbook
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  //   // Generate file and trigger download
  //   XLSX.writeFile(workbook, `products_export_${new Date().toISOString().slice(0,10)}.xlsx`);
  // };


  //NEW EXPORT EXCEL WITH CHILD CATEGORY
  const exportToExcel = async () => {
    const XLSX = await import("xlsx");

    /* ---------- CATEGORY MAP ---------- */
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id] = cat.category_name;
    });

    const categoryMd5Map = {};

    categories.forEach(cat => {
      if (cat.md5_cat_name) {
        categoryMd5Map[cat.md5_cat_name] = cat.category_name;
      }
    });


    /* ---------- BRAND MAP ---------- */
    const brandMap = {};
    brands.forEach(brand => {
      const brandId = brand._id || brand.id;
      if (brandId) {
        brandMap[brandId] = brand.brand_name || brand.name;
      }
    });


    // ✅ GET ALL IDS
    /* const allIds = filteredProducts.flatMap(product => [
      ...(product.featured_products || []),
      ...(product.related_products || []),
      ...(product.add_ons || [])
    ]); */

    const allIds = filteredProducts.flatMap(product => [
      ...(Array.isArray(product.featured_products)
        ? product.featured_products
        : []),

      ...(Array.isArray(product.related_products)
        ? product.related_products
        : []),

      ...(Array.isArray(product.add_ons)
        ? product.add_ons
        : [])
    ]);

    // ✅ UNIQUE IDS
    const uniqueIds = [...new Set(allIds.map(id => id.toString()))];

    // ✅ CREATE MAP FROM PRODUCTS STATE
    const productMap = {};

    products.forEach(p => {
      if (p._id && p.item_code) {
        productMap[p._id.toString()] = p.item_code;
      }
    });


    /* ---------- MAIN EXPORT ---------- */
    const dataForExport = filteredProducts.map(product => {
      /* let mainCategory = 'No Category';
      let subCategory = 'No Subcategory';
      let childCategory = 'No Childcategory';
  
      // ✅ STEP 1: take hierarchy string
      let categorySource =
        product.sub_category_new_name ||
        product.sub_category_name ||
        '';
  
      // ✅ STEP 2: split using ##
      if (typeof categorySource === 'string' && categorySource.trim()) {
        const parts = categorySource
          .split('##')
          .map(p => p.trim())
          .filter(Boolean);
  
        // ✅ IMPORTANT CHANGE
        if (parts.length >= 3) {
          mainCategory = parts[0];   // 👈 MAIN
          subCategory = parts[1];    // 👈 SUB
          childCategory = parts[2];  // 👈 CHILD
        } else if (parts.length === 2) {
          mainCategory = parts[0];
          subCategory = parts[1];
        } else if (parts.length === 1) {
          mainCategory = parts[0];
        }
      } */

      /* =========================================================
         🔥 CHANGE START HERE (CATEGORY SPLIT LOGIC)
      ========================================================== */

      let mainCategory = 'No Category';
      let subCategory = 'No Subcategory';
      let childCategory = 'No Childcategory';

      let categorySource =
        product.sub_category_new ||
        // product.sub_category_new_name ||
        // product.sub_category_name ||
        '';

      if (typeof categorySource === 'string' && categorySource.trim()) {
        const parts = categorySource
          .split('##')
          .map(p => p.trim())
          .filter(Boolean);

        // ✅ MAIN
        if (parts[0] && categoryMd5Map[parts[0]]) {
          mainCategory = categoryMd5Map[parts[0]];
        }

        // ✅ SUB
        if (parts[1] && categoryMd5Map[parts[1]]) {
          subCategory = categoryMd5Map[parts[1]];
        }

        // ✅ CHILD
        if (parts[2] && categoryMd5Map[parts[2]]) {
          childCategory = categoryMd5Map[parts[2]];
        }
      }

      /* =========================================================
         🔥 CHANGE END HERE
      ========================================================== */


      /* ---------- BRAND ---------- */
      let brandName = 'No Brand';
      if (product.brand) {
        if (typeof product.brand === 'object') {
          brandName =
            product.brand.brand_name ||
            product.brand.name ||
            'No Brand';
        } else {
          brandName = brandMap[product.brand] || 'Brand not found';
        }
      }

      /* ---------- FILTERS ---------- */
      let filterString = '';

      if (product.filterDetails && product.filterDetails.length > 0) {
        const formattedFilters = product.filterDetails.map(filter => {
          let groupName = 'Other';

          if (filter.filter_group && typeof filter.filter_group === 'object') {
            groupName = filter.filter_group.filtergroup_name || 'Other';
          } else if (filter.filter_group && typeof filter.filter_group === 'string') {
            groupName = filterGroups[filter.filter_group] || 'Other';
          } else if (filter.filter_group_name) {
            groupName = filter.filter_group_name;
          }

          return `${groupName}: ${filter.filter_name}`;
        });

        filterString = formattedFilters.join(', ');
      }

      /* ---------- SIZE ---------- */
      let sizeFilter = '';
      if (product.sizeFilterDetails && product.sizeFilterDetails.length > 0) {
        const sizeFilters = product.sizeFilterDetails.map(filter => {
          let groupName = 'Size';
          if (filter.filter_group && typeof filter.filter_group === 'object') {
            groupName = filter.filter_group.filtergroup_name || 'Size';
          }
          return `${groupName}: ${filter.filter_name}`;
        });
        sizeFilter = sizeFilters.join(', ');
      }

      /* ---------- DESCRIPTION CLEAN ---------- */
      const plainText = product.description
        ? product.description.replace(/<[^>]*>/g, '')
        : '';

      /* ---------- KEY FEATURES ---------- */
      /* const getSpecsForExcel = (specs) => {
        if (!specs || !Array.isArray(specs)) return [];
  
        const fullText = specs[0];
        if (!fullText) return [];
  
        return fullText
          .split('\n')
          .map(item => item.trim().replace(/,$/, ''))
          .filter(item => item.includes(':'))
          .map(item => {
            const [key, ...rest] = item.split(':');
            return {
              Key: key.trim(),
              Value: rest.join(':').trim()
            };
          });
      }; */
      /* ---------- KEY FEATURES ---------- */
      const getSpecsForExcel = (specs) => {
        if (!specs || !Array.isArray(specs)) return [];

        const firstItem = specs[0];
        if (!firstItem) return [];

        // ✅ CASE: Comma separated string
        if (typeof firstItem === "string") {
          return firstItem
            .split(',') // split by comma
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .map(item => ({
              Key: item,   // no separate key/value
              Value: ""
            }));
        }

        return [];
      };
      // const specsArray = getSpecsForExcel(product.key_specifications);
      const specsArray = getSpecsForExcel(product.key_specifications);
      const formattedSpecs = specsArray
        .map(item => item.Key) // only Key since no Value
        .join('\n');

      /*   const formattedSpecs = specsArray
          .map(item => `${item.Key}: ${item.Value}`)
          .join('\n'); */

      /* ---------- FINAL RETURN ---------- */
      return {
        'Item No.': product.item_code,
        'Product Name': product.name,
        'StockQty': product.quantity,

        // ✅ UPDATED CATEGORY OUTPUT
        'Category': mainCategory.toUpperCase(),
        'Subcategory': subCategory.toUpperCase(),
        'Childcategory': childCategory.toUpperCase(),

        'Brand': brandName,
        'Size': sizeFilter,
        'Filters': filterString,

        'Star': product.star || '',
        'Movement': product.movement || '',
        'MRP PRICE': product.price,
        'Special Price': product.special_price,

        'Description': plainText || '',
        'Key Features': formattedSpecs || '',

        'image1': product.images?.[0] || '',
        'image2': product.images?.[1] || '',
        'image3': product.images?.[2] || '',

        // 🔥 FIX HERE (important)
        'overview images': product.overview_images?.join(", ") || '',

        'overview_description': product.overviewdescription || '',

        'variants': product.hasVariants
          ? JSON.stringify(product.variants)
          : '',

        'featured_products': (Array.isArray(product.featured_products)
          ? product.featured_products
          : [])
          .map(id => productMap[id.toString()])
          .filter(Boolean)
          .join(','),

        'related_products': (Array.isArray(product.related_products)
          ? product.related_products
          : [])
          .map(id => productMap[id.toString()])
          .filter(Boolean)
          .join(','),

        'add_ons': (Array.isArray(product.add_ons)
          ? product.add_ons
          : [])
          .map(id => productMap[id.toString()])
          .filter(Boolean)
          .join(','),

        'Status': product.status
      };
    });

    /* ---------- SHEET ---------- */
    const worksheet = XLSX.utils.json_to_sheet(dataForExport, {
      header: [
        'Item No.',
        'Product Name',
        'StockQty',
        'Category',
        'Subcategory',
        'Childcategory', // ✅ ADDED
        'Brand',
        'Size',
        'Filters',
        'Star',
        'Movement',
        'MRP PRICE',
        'Special Price',
        'Description',
        'Key Features',
        'image1',
        'image2',
        'image3',
        'overview images',
        'overview_description',
        'variants',
        'Status'
      ]
    });

    /* ---------- EXPORT ---------- */
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    XLSX.writeFile(
      workbook,
      `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };


  const exportFilterDataToExcel = async () => {
    const XLSX = await import("xlsx");
    const exportRows = [];

    filteredProducts.forEach(product => {
      if (product.filterDetails && product.filterDetails.length > 0) {
        product.filterDetails.forEach(filter => {
          let groupName = "Other";

          // 1️⃣ populated object
          if (filter.filter_group && typeof filter.filter_group === "object") {
            groupName = filter.filter_group.filtergroup_name || "Other";
          }
          // 2️⃣ ID lookup
          else if (typeof filter.filter_group === "string") {
            groupName = filterGroups[filter.filter_group] || "Other";
          }
          // 3️⃣ already sent name
          else if (filter.filter_group_name) {
            groupName = filter.filter_group_name;
          }

          exportRows.push({
            "Item Code": product.item_code,
            "Filter Group": groupName,
            "Filter Value": filter.filter_name
          });
        });
      }
    });

    if (exportRows.length === 0) {
      toast.error("No filter data available to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ["Item Code", "Filter Group", "Filter Value"]
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Filters");

    XLSX.writeFile(
      workbook,
      `product_filters_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  
  const [isBulkUploadModel, setIsBulkUploadModel] = useState({
    isOpen: false,
    type: null,
  });

  const OpenModelBulk = (type_val) => {
    if (type_val == "movement") {
      setIsBulkUploadModel({
        isOpen: true,
        type: type_val,
      });
    } else {
      setIsBulkUploadModel({
        isOpen: true,
        type: type_val,
      });
    }
  };

  const CloseModal = (type_val) => {
    if (type_val == "movement") {
      setIsBulkUploadModel({
        isOpen: false,
        type: type_val,
      });
    } else {
      setIsBulkUploadModel({
        isOpen: false,
        type: type_val,
      });
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
    setEditingProduct(product._id);
  };

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleDateChange = ({ startDate, endDate }) => {
    const normalizedStartDate = startDate ? new Date(startDate) : null;
    const normalizedEndDate = endDate ? new Date(endDate) : null;

    setDateFilter({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate
    });
    setCurrentPage(0);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch("/api/product/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Product deleted successfully.");
        setShowSuccessModal(true);
        setProducts((prev) => prev.filter((p) => p._id !== productId));
      } else {
        console.error("Error:", result.error);
        alert("Failed to delete product.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred.");
    } finally {
      setShowConfirmationModal(false);
      setProductToDelete(null);
    }
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: null,
      endDate: null
    });
    setCurrentPage(0);
  };

  const flattenProducts = (products, level = 0, result = []) => {
    products.forEach((product) => {
      if (product.item_code !== 'none') {
        result.push({ ...product, level });
      }
    });
    return result;
  };

  const renderCategoryOptions = () => {
    const catList = Array.isArray(categories) ? categories : [];
    const mainCategories = catList.filter(cat => cat && cat.parentid === "none").slice() // prevent mutating original
      .sort((a, b) => a.category_name.localeCompare(b.category_name)); // ✅ sort ascending A–Z;
    const options = [];

    options.push(
      <option key="all" value="">
        All Categories
      </option>
    );

    mainCategories.forEach(mainCat => {
      options.push(
        <option
          key={mainCat._id}
          value={mainCat._id.toString()}
        >
          {mainCat.category_name}
        </option>
      );
    });

    return options;
  };

  /* const renderSubCategoryOptions = () => {
    let filteredSubCats = categories;
  
    // 👉 Category selectedனா மட்டும் filter
    if (categoryFilter) {
      filteredSubCats = categories.filter(
        (cat) => cat.parentid === categoryFilter
      );
    }
  
    // 👉 இல்லனா ALL subcategories (parent இல்லாததை skip)
    else {
      filteredSubCats = categories.filter(
        (cat) => cat.parentid !== "none"
      );
    }
  
    return [
      <option key="all" value="">
        All Sub Categories
      </option>,
      ...filteredSubCats.map((sub) => (
        <option key={sub._id} value={sub._id}>
          {sub.category_name}
        </option>
      )),
    ];
  }; */

  const renderSubCategoryOptions = () => {
    const catList = Array.isArray(categories) ? categories : [];
    let filteredSubCats = [];

    // Category Filter (Main) இருந்தால் மட்டும்
    if (categoryFilter) {
      // 1. அந்த மெயின் கேட்டகிரியின் நேரடி சப்-கேட்டகிரிகள்
      // 2. மற்றும் அந்த மெயின் கேட்டகிரியின் கீழ் வரும் அனைத்து குழந்தைகளும் (Recursive)
      const allChildIds = getAllChildIds(categoryFilter, categories);

      filteredSubCats = catList.filter(cat =>
        cat.parentid === categoryFilter || allChildIds.includes(cat._id.toString())
      );
    } else {
      // மெயின் கேட்டகிரியே இல்லை என்றால், 'none' இல்லாத அனைத்தையும் காட்டலாம்
      filteredSubCats = catList.filter(cat => cat && cat.parentid !== "none");
    }

    // பெயர்கள் குழப்பமில்லாமல் இருக்க A-Z வரிசைப்படுத்துகிறோம்
    const sortedSubCats = [...filteredSubCats].sort((a, b) =>
      a.category_name.localeCompare(b.category_name)
    );

    return [
      <option key="all" value="">All Property</option>,
      ...sortedSubCats.map((sub) => (
        <option key={sub._id} value={sub._id}>
          {sub.category_name}
        </option>
      )),
    ];
  };

  const renderBrandOptions = () => {
    return [
      <option key="all" value="">
        All Brands
      </option>,
      ...(Array.isArray(brands) ? brands : []).slice() // create a shallow copy so you don't mutate the original array
        .sort((a, b) => a.brand_name.localeCompare(b.brand_name)).map(brand => (
          <option
            key={brand.id}
            value={brand.id}
          >
            {brand.brand_name}
          </option>



        ))
    ];
  };

  /*   const getFilteredProducts = () => {
      const flattenedProducts = flattenProducts(products);
     
      return flattenedProducts.filter((product) => {
        // Search filter
        const matchesSearch = debouncedSearchQuery === "" ||
          product.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          product.slug?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          product.item_code?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
   
        // Status filter
        const matchesStatus = statusFilter === "" ||
          product.status?.toLowerCase() === statusFilter.toLowerCase();
   
        // Date filter
        let matchesDate = true;
        if (dateFilter.startDate && dateFilter.endDate && product.createdAt) {
          const productDate = new Date(product.createdAt);
          const startDate = new Date(dateFilter.startDate);
          const endDate = new Date(dateFilter.endDate);
   
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
   
          matchesDate = productDate >= startDate && productDate <= endDate;
        }
   
        // Category filter
        let matchesCategory = true;
        if (categoryFilter) {
          if (product.category && typeof product.category === 'object') {
            const productCategoryId = product.category._id.toString();
            const selectedCategory = categories.find(cat => cat._id.toString() === categoryFilter);
           
            if (selectedCategory.parentid === "none") {
              const subCategoryIds = categories
                .filter(cat => cat.parentid === categoryFilter)
                .map(cat => cat._id.toString());
             
              matchesCategory = productCategoryId === categoryFilter ||
                              subCategoryIds.includes(productCategoryId);
            } else {
              matchesCategory = productCategoryId === categoryFilter;
            }
          } else if (product.category) {
            const productCategoryId = product.category.toString();
            const selectedCategory = categories.find(cat => cat._id.toString() === categoryFilter);
           
            if (selectedCategory.parentid === "none") {
              const subCategoryIds = categories
                .filter(cat => cat.parentid === categoryFilter)
                .map(cat => cat._id.toString());
             
              matchesCategory = productCategoryId === categoryFilter ||
                              subCategoryIds.includes(productCategoryId);
            } else {
              matchesCategory = productCategoryId === categoryFilter;
            }
          } else {
            matchesCategory = false;
          }
        }
   
        // Brand filter
        let matchesBrand = true;
        if (brandFilter) {
          if (product.brand && typeof product.brand === 'object') {
            matchesBrand = product.brand._id.toString() === brandFilter;
          } else if (product.brand) {
            matchesBrand = product.brand.toString() === brandFilter;
          } else {
            matchesBrand = false;
          }
        }
   
   
       let matchesStock = true;
  if (stockFilter) {
    matchesStock = product.stock_status?.toLowerCase() === stockFilter.toLowerCase();
  }
   
   
        return matchesSearch && matchesStatus && matchesDate && matchesCategory && matchesBrand && matchesStock;
      });
    }; */


  // 1. இந்த helper function-ஐ getFilteredProducts-க்கு வெளியே (Component-க்குள்) சேர்க்கவும்
  /* const getAllChildIds = (parentId, allCategories) => {
    let childIds = [];
    if (!Array.isArray(allCategories)) return childIds;
    const children = allCategories.filter(cat => cat && cat.parentid === parentId);
    children.forEach(child => {
      childIds.push(child._id.toString());
      // அடுத்த நிலையில் உள்ள Child-களையும் தேடும் (Recursion)
      childIds = [...childIds, ...getAllChildIds(child._id.toString(), allCategories)];
    });
    return childIds;
  }; */

  const getAllChildIds = (parentId, allCategories) => {
    let childIds = [];
    if (!Array.isArray(allCategories)) return childIds;
    const children = allCategories.filter(cat => cat && cat.parentid === parentId);
    children.forEach(child => {
      childIds.push(child._id.toString());
      childIds = [...childIds, ...getAllChildIds(child._id.toString(), allCategories)];
    });
    return childIds;
  };

  /*   const getFilteredProducts = () => {
    const flattenedProducts = flattenProducts(products);
  
  
    return flattenedProducts.filter((product) => {
      // Search Filter
      const matchesSearch =
        debouncedSearchQuery === "" ||
        product.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        product.item_code?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
  
      // Status Filter
      const matchesStatus =
        statusFilter === "" ||
        product.status?.toLowerCase() === statusFilter.toLowerCase();
  
      // Main Category Filter
      let matchesCategory = true;
      if (categoryFilter) {
        const prodCatId = product.category?._id?.toString() || product.category?.toString();
        const childCategoryIds = [categoryFilter, ...getAllChildIds(categoryFilter, categories)];
        matchesCategory = childCategoryIds.includes(prodCatId);
      }
  
      // Sub & Child Category Filter (FIXED)
     let matchesSubCategory = true;
      if (subCategoryFilter) {
        const prodCatId = product.category?._id?.toString() || product.category?.toString();
        const prodSubCatId = product.sub_category?._id?.toString() || product.sub_category?.toString();
        const prodNewCatId = product.category_new?.toString();
  
        // நாம் தேர்ந்தெடுத்த Sub-category-ன் கீழ் உள்ள அனைத்து Child ID-களையும் எடுக்கிறோம்
        const allRelatedIds = [subCategoryFilter, ...getAllChildIds(subCategoryFilter, categories)];
  
        // Product-ல் இருக்கும் ஏதோ ஒரு ID, நாம் தேடும் ID list-ல் இருக்கிறதா என்று பார்க்கிறோம்
        matchesSubCategory = 
          allRelatedIds.includes(prodCatId) || 
          allRelatedIds.includes(prodSubCatId) || 
          allRelatedIds.includes(prodNewCatId);
      } 
     // Sub & Child Category Filter
      // ... getFilteredProducts உள்ளே ...
  
  let matchesSubCategory = true;
  if (subCategoryFilter && subCategoryFilter !== "") {
      const prodCatId = product.category?._id?.toString() || product.category?.toString();
      const prodSubCatId = product.sub_category?._id?.toString() || product.sub_category?.toString();
      const prodNewCatId = product.category_new?.toString();
  
      // குறிப்பிட்ட சப்-கேட்டகிரி மற்றும் அதன் கிளைகளை எடுக்கிறோம்
      const allRelatedIds = [subCategoryFilter, ...getAllChildIds(subCategoryFilter, categories)];
  
      matchesSubCategory = 
        allRelatedIds.includes(prodCatId) || 
        allRelatedIds.includes(prodSubCatId) || 
        allRelatedIds.includes(prodNewCatId);
  } else {
      // subCategoryFilter காலியாக இருந்தால் (All Sub Categories), 
      // இந்த பில்டர் 'true' ஆகிவிடும். இதனால் CategoryFilter மட்டும் வேலை செய்யும்.
      matchesSubCategory = true;
  }
  
      // Brand Filter
      let matchesBrand = true;
      if (brandFilter) {
        const prodBrandId = product.brand?._id?.toString() || product.brand?.toString();
        matchesBrand = prodBrandId === brandFilter;
      }
  
      let matchesStock = true;
  if (stockFilter) {
    matchesStock = product.stock_status?.toLowerCase() === stockFilter.toLowerCase();
  } 
  let matchesStock = true;
      if (stockFilter === "In Stock" || stockFilter === "Out of Stock") {
        matchesStock =
          product.stock_status?.toLowerCase() === stockFilter.toLowerCase();
      }
  
      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesSubCategory && // இது இப்போது Sub மற்றும் Child இரண்டிற்கும் வேலை செய்யும்
        matchesBrand &&
        matchesStock
      );
  
       // ✅ STOCK SORTING
    if (stockFilter === "stock_low_high") {
      filteredProducts.sort((a, b) => Number(a.quantity ?? 0) - Number(b.quantity ?? 0));
    }
  
    if (stockFilter === "stock_high_low") {
      filteredProducts.sort((a, b) => Number(b.quantity ?? 0) - Number(a.quantity ?? 0));
    }
  
    return filteredProducts;
    
    });
  
   
  }; */

  const getFilteredProducts = () => {
    const flattenedProducts = flattenProducts(products);

    // 1. Process search query tokens once (support trim & multi-word matching across fields)
    const rawQuery = (debouncedSearchQuery || "").trim().toLowerCase();
    const queryTokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    // 2. Precompute Category filter IDs once (instead of recalculating inside the loop for every single product)
    let categoryRelatedIds = null;
    let categoryRelatedMd5 = null;
    if (categoryFilter) {
      const allChildIds = getAllChildIds(categoryFilter, categories);
      categoryRelatedIds = new Set([categoryFilter, ...allChildIds]);
      categoryRelatedMd5 = [categoryFilter, ...allChildIds]
        .map((id) => (Array.isArray(categories) ? categories : []).find((cat) => cat._id?.toString() === id)?.md5_cat_name)
        .filter(Boolean)
        .map((m) => m.toLowerCase());
    }

    // 3. Precompute SubCategory filter IDs once
    let subCategoryRelatedIds = null;
    if (subCategoryFilter && subCategoryFilter !== "") {
      const allSubChildIds = getAllChildIds(subCategoryFilter, categories);
      subCategoryRelatedIds = new Set([subCategoryFilter, ...allSubChildIds]);
    }

    const filteredProducts = flattenedProducts.filter((product) => {
      // Search Filter: match all query tokens across Name, Item Code, Slug, Model Number, and Brand
      if (queryTokens.length > 0) {
        const prodName = product.name?.toLowerCase() || "";
        const prodItemCode = product.item_code?.toLowerCase() || "";
        const prodSlug = product.slug?.toLowerCase() || "";
        const prodModel = product.model_number?.toLowerCase() || "";
        const prodBrand = (typeof product.brand === "string" ? product.brand : product.brand?.brand_name || product.brand?.name || "").toLowerCase();

        const matchesAllTokens = queryTokens.every(
          (token) =>
            prodName.includes(token) ||
            prodItemCode.includes(token) ||
            prodSlug.includes(token) ||
            prodModel.includes(token) ||
            prodBrand.includes(token)
        );

        if (!matchesAllTokens) return false;
      }

      // Status Filter
      if (statusFilter && product.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Main Category Filter
      if (categoryRelatedIds) {
        const prodCatId = product.category?._id?.toString() || product.category?.toString();
        const matchesById = prodCatId && categoryRelatedIds.has(prodCatId);
        const productCatMd5 = product.sub_category_new?.toLowerCase() || "";
        const matchesByMd5 = categoryRelatedMd5 && categoryRelatedMd5.some((md5) => productCatMd5.includes(md5));
        if (!matchesById && !matchesByMd5) return false;
      }

      // Sub Category Filter
      if (subCategoryRelatedIds) {
        const prodCatId = product.category?._id?.toString() || product.category?.toString();
        const prodSubCatId = product.sub_category?._id?.toString() || product.sub_category?.toString();
        const prodNewCatId = product.category_new?.toString();

        const matchesSub =
          (prodCatId && subCategoryRelatedIds.has(prodCatId)) ||
          (prodSubCatId && subCategoryRelatedIds.has(prodSubCatId)) ||
          (prodNewCatId && subCategoryRelatedIds.has(prodNewCatId));

        if (!matchesSub) return false;
      }

      // Brand Filter
      if (brandFilter) {
        const prodBrandId = product.brand?._id?.toString() || product.brand?.toString();
        if (prodBrandId !== brandFilter) return false;
      }

      // Stock Filter
      if (stockFilter === "In Stock" || stockFilter === "Out of Stock") {
        if (product.stock_status?.toLowerCase() !== stockFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // Stock Sorting
    if (stockFilter === "stock_low_high") {
      filteredProducts.sort((a, b) => Number(a.quantity ?? 0) - Number(b.quantity ?? 0));
    }

    if (stockFilter === "stock_high_low") {
      filteredProducts.sort((a, b) => Number(b.quantity ?? 0) - Number(a.quantity ?? 0));
    }

    return filteredProducts;
  };

  // const getFilteredProducts = () => {
  //   const flattenedProducts = flattenProducts(products);

  //   return flattenedProducts.filter((product) => {
  //     // Search filter
  //     const matchesSearch = debouncedSearchQuery === "" || 
  //       product.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
  //       product.slug?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
  //       product.item_code?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

  //     // Status filter
  //     const matchesStatus = statusFilter === "" || 
  //       product.status?.toLowerCase() === statusFilter.toLowerCase();

  //     // Date filter
  //     let matchesDate = true;
  //     if (dateFilter.startDate && dateFilter.endDate && product.createdAt) {
  //       const productDate = new Date(product.createdAt);
  //       const startDate = new Date(dateFilter.startDate);
  //       const endDate = new Date(dateFilter.endDate);

  //       startDate.setHours(0, 0, 0, 0);
  //       endDate.setHours(23, 59, 59, 999);

  //       matchesDate = productDate >= startDate && productDate <= endDate;
  //     }

  //     // Category filter
  //     let matchesCategory = true;
  //     if (categoryFilter) {
  //       if (product.category && typeof product.category === 'object') {
  //         const productCategoryId = product.category._id.toString();
  //         const selectedCategory = categories.find(cat => cat._id.toString() === categoryFilter);

  //         if (selectedCategory.parentid === "none") {
  //           const subCategoryIds = categories
  //             .filter(cat => cat.parentid === categoryFilter)
  //             .map(cat => cat._id.toString());

  //           matchesCategory = productCategoryId === categoryFilter || 
  //                           subCategoryIds.includes(productCategoryId);
  //         } else {
  //           matchesCategory = productCategoryId === categoryFilter;
  //         }
  //       } else if (product.category) {
  //         const productCategoryId = product.category.toString();
  //         const selectedCategory = categories.find(cat => cat._id.toString() === categoryFilter);

  //         if (selectedCategory.parentid === "none") {
  //           const subCategoryIds = categories
  //             .filter(cat => cat.parentid === categoryFilter)
  //             .map(cat => cat._id.toString());

  //           matchesCategory = productCategoryId === categoryFilter || 
  //                           subCategoryIds.includes(productCategoryId);
  //         } else {
  //           matchesCategory = productCategoryId === categoryFilter;
  //         }
  //       } else {
  //         matchesCategory = false;
  //       }
  //     }

  //     // Brand filter
  //     let matchesBrand = true;
  //     if (brandFilter) {
  //       if (product.brand && typeof product.brand === 'object') {
  //         matchesBrand = product.brand._id.toString() === brandFilter;
  //       } else if (product.brand) {
  //         matchesBrand = product.brand.toString() === brandFilter;
  //       } else {
  //         matchesBrand = false;
  //       }
  //     }

  //     return matchesSearch && matchesStatus && matchesDate && matchesCategory && matchesBrand;
  //   });
  // };

  // Server-Side: Products are already paginated and filtered by MongoDB
  const pageCount = totalPages;
  const paginatedProducts = Array.isArray(products) ? products : [];
  const filteredProducts = products;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/sample_bulk_upload.xlsx?t=${Date.now()}`;
    link.download = 'item_code_movement.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateFile = (file, allowedExtensions) => {
    if (!file) return false;
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some((ext) => fileName.endsWith(ext));
  };

  const [excelFile, setExcelFile] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFile(excelFile, ['.xlsx', '.csv'])) {
      toast.error("Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("excel", excelFile);

    try {
      const response = await fetch('/api/product/bulk-upload', {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }

    } catch (error) {
      toast.error(error);
    } finally {
      setIsLoading(false);
    }

    if (type_val == "movement") {
      setIsBulkUploadModel({
        isOpen: false,
        type: type_val,
      });
    } else {
      setIsBulkUploadModel({
        isOpen: false,
        type: type_val,
      });
    }

  }


  return (
    <div className="w-full">
      {showAlert && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4">
          {alertMessage}
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">Product List</h2>

        <div className="flex items-center gap-4">
          {/* <button onClick={() => OpenModelBulk("movement")} className="bg-[#d72828] hover:bg-[#d72828] text-white px-4 py-2 rounded-md flex items-center gap-2" >
            <Icon icon="mdi:upload" className="text-lg" /> Bulk uploads one
          </button>

          <button onClick={() => OpenModelBulk("size")} className="bg-[#d72828] hover:bg-[#d72828] text-white px-4 py-2 rounded-md flex items-center gap-2" >
            <Icon icon="mdi:upload" className="text-lg" /> Bulk uploads two
          </button> */}
          <button
            onClick={exportFilterDataToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Icon icon="mdi:microsoft-excel" className="text-lg" />
            Export Filters
          </button>




          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Icon icon="mdi:microsoft-excel" className="text-lg" />
            Export to Excel
          </button>

                    <Link href="/admin/product/create" className="bg-red-500 text-white px-4 py-2 rounded-md">
            + Add Product
          </Link>
        </div>
      </div>





      <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto rounded-xl border border-gray-200">
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search Product..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                setCurrentPage(0);
                syncUrlParams(0, debouncedSearchQuery, val, categoryFilter, subCategoryFilter, brandFilter, stockFilter);
                fetchProducts(0, { status: val });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryFilter(val);
                setSubCategoryFilter("");
                setCurrentPage(0);
                syncUrlParams(0, debouncedSearchQuery, statusFilter, val, "", brandFilter, stockFilter);
                fetchProducts(0, { category: val, sub_category: "" });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              {renderCategoryOptions()}
            </select>
          </div>

          {/* Sub Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property
            </label>
            <select
              value={subCategoryFilter}
              onChange={(e) => {
                const selectedSub = e.target.value;
                setSubCategoryFilter(selectedSub);
                const selectedSubCat = categories.find((cat) => cat._id === selectedSub);
                const parentCat = selectedSubCat ? selectedSubCat.parentid : categoryFilter;
                if (selectedSubCat) setCategoryFilter(parentCat);
                setCurrentPage(0);
                syncUrlParams(0, debouncedSearchQuery, statusFilter, parentCat, selectedSub, brandFilter, stockFilter);
                fetchProducts(0, { category: parentCat, sub_category: selectedSub });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              {renderSubCategoryOptions()}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => {
                const val = e.target.value;
                setBrandFilter(val);
                setCurrentPage(0);
                syncUrlParams(0, debouncedSearchQuery, statusFilter, categoryFilter, subCategoryFilter, val, stockFilter);
                fetchProducts(0, { brand: val });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              {renderBrandOptions()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
            <select
              value={stockFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStockFilter(val);
                setCurrentPage(0);
                syncUrlParams(0, debouncedSearchQuery, statusFilter, categoryFilter, subCategoryFilter, brandFilter, val);
                fetchProducts(0, { stock: val });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Stock</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="stock_low_high">Stock Low → High</option>
              <option value="stock_high_low">Stock High → Low</option>
            </select>
          </div>
          {/* Date Range Picker */}
          {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateRangePicker 
                onChange={handleDateChange}
                onClear={clearDateFilter}
              />
            </div> */}
        </div>

        <hr className="border-t border-gray-200 mb-4" />

        {/* Products Table */}
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Item Code</th>
              <th className="p-2">Image</th>
              <th className="p-2">Name</th>
              <th className="p-2 whitespace-nowrap">Unilet</th>
              <th className="p-2">Price</th>
              <th className="p-2 whitespace-nowrap">Spl Price</th>
              <th className="p-2">Quantity</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" className="text-center p-6">
                  <div className="flex justify-center items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-[#d72828]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span className="text-gray-600 font-medium">
                      Loading products...
                    </span>
                  </div>
                </td>
              </tr>
            ) : paginatedProducts.length > 0 ? (
              paginatedProducts.map((product) => {
                const isRecentlyUpdated = recentlyUpdatedId && product._id?.toString() === recentlyUpdatedId;
                return (
                <tr
                  key={product._id}
                  className={`text-center border-b transition-all duration-700 ${
                    isRecentlyUpdated ? "bg-green-100 ring-2 ring-green-500 shadow-md" : ""
                  }`}
                >
                  {/* Item Code Column */}
                  <td className="p-2 text-center align-middle">
                    {product.item_code}
                  </td>

                  {/* Image Column */}
                  <td className="p-2">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={`/uploads/products/${product.images[0]}`}
                        alt={product.name}
                        className="w-12 h-12 object-contain mx-auto"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/no-image.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto">
                        <span className="text-xs text-gray-400">No Image</span>
                      </div>
                    )}
                  </td>

                  {/* Name Column */}
                  <td className="p-2 text-center align-middle">
                    <a
                      href={`/product/${product.slug}`}
                      className="block mx-auto text-center truncate max-w-xs text-sm hover:underline"
                      title={product.name}
                    >
                      {product.name}
                    </a>
                    {isRecentlyUpdated && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-bold bg-green-600 text-white rounded-full animate-bounce shadow">
                        ✓ Updated
                      </span>
                    )}
                  </td>

                  {/* Unilet Column */}
                  <td className="p-2 text-center align-middle whitespace-nowrap">
                    {!isProductInUnilet(product) ? (
                      <button
                        onClick={() => handleAddToUnilet(product)}
                        disabled={checkingUniletStore}
                        className="inline-flex items-center space-x-1 bg-[#d72828] hover:bg-red-700 text-white text-xs font-medium px-2.5 py-1 rounded shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        title="Add to Unilet"
                      >
                        <Icon icon="mdi:plus" className="text-sm" />
                        <span>Add to Unilet</span>
                      </button>
                    ) : (
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600"
                        title="Already mapped to Unilet"
                        aria-label="Already mapped to Unilet"
                      >
                        <Icon icon="mdi:check-bold" className="text-lg" />
                      </span>
                    )}
                  </td>

                  {/* Price Column */}
                  <td className="p-2">{product.price}</td>

                  {/* Special Price Column */}
                  <td className="p-2">{product.special_price}</td>

                  {/* Quantity Column */}
                  <td className="p-2">{product.quantity}</td>

                  {/* Status Column */}
                  <td className="p-2 font-semibold">
                    {product.status === "Active" ? (
                      <span className="bg-green-100 text-green-600 px-6 py-1.5 rounded-full font-medium text-sm">Active</span>
                    ) : (
                      <span className="bg-red-100 text-red-600 px-6 py-1.5 rounded-full font-medium text-sm">Inactive</span>
                    )}
                  </td>

                  {/* Action Column */}
                  <td>
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                        title="Edit"
                      >
                        <FaEdit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setProductToDelete(product._id);
                          setShowConfirmationModal(true);
                        }}
                        className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center"
                        title="Delete"
                      >
                        <Icon icon="mingcute:delete-2-line" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td colSpan="9" className="text-center p-4 text-gray-500">
                  No Products found
                </td>
              </tr>
            )}
          </tbody>

        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
          <div className="text-sm text-gray-600">
            Showing {totalProducts === 0 ? 0 : currentPage * itemsPerPage + 1} to{" "}
            {Math.min((currentPage + 1) * itemsPerPage, totalProducts)} of{" "}
            {totalProducts} entries
          </div>

          <div className="pagination flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 0))}
              disabled={currentPage === 0}
              className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-black bg-white hover:bg-gray-100"
                }`}
              aria-label="Previous page"
            >
              «
            </button>

            {Array.from({ length: pageCount }, (_, i) => {
              const isFirst = i === 0;
              const isLast = i === pageCount - 1;
              const isNearCurrent = Math.abs(currentPage - i) <= 1;

              if (isFirst || isLast || isNearCurrent) {
                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === i
                        ? "bg-red-500 text-white"
                        : "text-black bg-white hover:bg-gray-100"
                      }`}
                    aria-label={`Page ${i + 1}`}
                    aria-current={currentPage === i ? "page" : undefined}
                  >
                    {i + 1}
                  </button>
                );
              }

              if (
                (i === currentPage - 2 && i > 1) ||
                (i === currentPage + 2 && i < pageCount - 2)
              ) {
                return (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
                    ...
                  </span>
                );
              }

              return null;
            })}

            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, pageCount - 1))}
              disabled={currentPage === pageCount - 1}
              className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === pageCount - 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-black bg-white hover:bg-gray-100"
                }`}
              aria-label="Next page"
            >
              »
            </button>
          </div>
        </div>
      </div>


      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Delete Product</h2>
            <p className="mb-4">Are you sure you want to delete this Product?</p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={() => handleDeleteProduct(productToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Success</h2>
            <p className="mb-4">{successMessage}</p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && SelectedProduct && (
        <EditProductModal
          product={SelectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
            setSelectedProduct(null);
          }}
          onSuccess={(updatedProduct) => {
            setShowEditModal(false);
            setEditingProduct(null);
            setSelectedProduct(null);
            const targetId = updatedProduct?._id || SelectedProduct?._id;
            const prodName = updatedProduct?.name || SelectedProduct?.name || "Product";
            setSuccessMessage(`"${prodName}" updated successfully!`);
            setShowSuccessModal(true);
            toast.success("Product updated successfully!");

            if (targetId) {
              setRecentlyUpdatedId(targetId.toString());
              setTimeout(() => {
                setRecentlyUpdatedId(null);
              }, 6000);
            }
            if (updatedProduct) {
              setProducts((prev) =>
                prev.map((p) =>
                  p._id === (updatedProduct._id || SelectedProduct._id)
                    ? { ...p, ...updatedProduct }
                    : p
                )
              );
            }
          }}
        />
      )}

      {/* {isBulkUploadModel.isOpen && isBulkUploadModel.type == "movement" ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-[70vw]">
            <div className="flex mt-5 justify-between">
              <h2 className="text-xl font-semibold mb-4">Bulk Upload (item_code and movement)</h2>
              <button onClick={() => CloseModal("movement")} className="text-gray-500 hover:text-gray-800 text-xl">✕</button>  
            </div>
            <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel/CSV File
                </h3>
                <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
              </div>
              <div className="space-y-4">
                <input type="file" accept=".xlsx,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
              </div>

              <button type="button" onClick={handleDownload} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors" >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample Format
              </button>
            </div>
            <div className="flex mt-5 justify-between">
              
               <button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit} className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload'
              )}
            </button>

              <button onClick={() => CloseModal("movement")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md" >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-[70vw]">
          <div className="flex mt-5 justify-between">
          <h2 className="text-xl font-semibold mb-4">Bulk Upload (item_code and movement)</h2>
          <button onClick={() => CloseModal("size")} className="text-gray-500 hover:text-gray-800 text-xl">✕</button>  
            </div>
            <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel/CSV File
                </h3>
                <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
              </div>
              <div className="space-y-4">
                <input type="file" accept=".xlsx,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
              </div>

              <button type="button" onClick={handleDownload} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors" >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample Format
              </button>
            </div>
            <div className="flex mt-5 justify-between">
              
               <button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit} className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload'
              )}
            </button>

              <button onClick={() => CloseModal("size")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md" >
                Close
              </button>
            </div>
          </div>
        </div>
      )} */}

      {isBulkUploadModel.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-[70vw]">
            <div className="flex mt-5 justify-between">
              <h2 className="text-xl font-semibold mb-4">
                Bulk Upload (item_code and movement)
              </h2>
              <button onClick={CloseModal} className="text-gray-500 hover:text-gray-800 text-xl">✕</button>
            </div>

            {/* Shared modal content */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel/CSV File
                </h3>
                <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
              </div>
              <div className="space-y-4">
                <input type="hidden" name="uploadType" value={isBulkUploadModel.type}></input>
                <input type="file" accept=".xlsx,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
              </div>

              <button type="button" onClick={handleDownload} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors" >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample Format
              </button>
            </div>

            <div className="flex mt-5 justify-between">
              <button
                type="submit"
                disabled={isLoading}
                onClick={handleSubmit}
                className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  'Upload'
                )}
              </button>

              <button onClick={CloseModal} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ADD PRODUCT TO UNILET MODAL */}
      {uniletModalOpen && selectedUniletProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Product to Unilet</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Link this product and set Karnataka / Unilet pricing &amp; stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUniletModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUniletFromProductList} className="p-6 space-y-4">
              {/* Product Info (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product</label>
                <div className="text-xs bg-gray-100 p-2.5 rounded-md text-gray-800 font-medium">
                  {selectedUniletProduct.name}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-1">
                  Item Code: {selectedUniletProduct.item_code || 'N/A'} | Default Sathya MRP: ₹{selectedUniletProduct.price}
                </div>
              </div>

              {/* Vendor Item Code Input Box */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vendor Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uniletForm.vendor_item_code}
                  onChange={(e) => setUniletForm({ ...uniletForm, vendor_item_code: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  placeholder="e.g. IP17E512SOFPINKMHU34_U"
                />
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unilet Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={uniletForm.price}
                    onChange={(e) => setUniletForm({ ...uniletForm, price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unilet Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={uniletForm.offer_price}
                    onChange={(e) => setUniletForm({ ...uniletForm, offer_price: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. 45000"
                  />
                </div>
              </div>

              {/* Quantity Select Dropdown & Stock Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={uniletForm.stock}
                    onChange={(e) => setUniletForm({ ...uniletForm, stock: Number(e.target.value) })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500].map((qty) => (
                      <option key={qty} value={qty}>
                        {qty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Status</label>
                  <select
                    value={uniletForm.stock_status}
                    onChange={(e) => setUniletForm({ ...uniletForm, stock_status: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Location & Active Status */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Location</label>
                  <select
                    value={uniletForm.region}
                    onChange={(e) => setUniletForm({ ...uniletForm, region: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white capitalize focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="karnataka">Karnataka</option>
                    <option value="tamilnadu">Tamil Nadu</option>
                    <option value="andhra">Andhra Pradesh</option>
                    <option value="telangana">Telangana</option>
                    <option value="kerala">Kerala</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="checkbox"
                      id="unilet_prod_active_flag"
                      checked={uniletForm.is_active}
                      onChange={(e) => setUniletForm({ ...uniletForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="unilet_prod_active_flag" className="text-xs text-gray-700 font-medium">
                      Active (Visible to Karnataka)
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setUniletModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUnilet}
                  className="px-5 py-2 bg-[#d72828] hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSavingUnilet && <Icon icon="eos-icons:loading" className="text-sm animate-spin" />}
                  <span>{isSavingUnilet ? 'Adding...' : 'Add to Unilet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
}