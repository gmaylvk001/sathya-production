"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FaPlus, FaMinus, FaEdit } from "react-icons/fa";
import { Icon } from "@iconify/react";
import DateRangePicker from "@/components/DateRangePicker";
import dynamic from "next/dynamic";
import Link from "next/link";
import AdminLoader from "@/app/admin/components/AdminLoader";
import { components } from "react-select";
import { Check } from "react-feather";
const Select = dynamic(() => import("react-select"), { ssr: false });

// ✅ Custom Option with tick symbol
const CustomOption = (props) => (
  <components.Option {...props}>
    <div className="flex items-center justify-between">
      <span>{props.label}</span>
      {props.isSelected && <Check size={16} className="text-green-600" />}
    </div>
  </components.Option>
);
export default function CategoryComponent() {
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [filters, setFilters] = useState([]);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateAlertMessage, setUpdateAlertMessage] = useState("");
  const [updateErrorMessage, setUpdateErrorMessage] = useState("");
  const [updateImageError, setUpdateImageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState(""); // "active" | "inactive" | ""
  const [searchQuery, setSearchQuery] = useState("");
  const [imageError, setImageError] = useState("");
  const [newCategory, setNewCategory] = useState({
    category_name: "",
    meta_title: "",
    meta_description: "",
    meta_keyword: "",
    parentid: "none",
    status: "Active",
    image: null,
    navImage: null,
    selectedFilters: [],
    content: "", 
    icon_image: null,
  });
  const [categoryToUpdate, setCategoryToUpdate] = useState({
    _id: "",
    category_name: "",
    meta_title: "",
    meta_description: "",
    meta_keyword: "",
    parentid: "none",
    status: "Active",
    image: null,
    existingImage: null,
    navImage: null,
    existingNavImage: null,
    selectedFilters: [],
    existingFilters: [],
    content: "", 
    existingContent: "", 
    icon_image: null,
    existingIconImage: null,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null,
  });

  const clearDateFilter = () => {
    setDateFilter({
      startDate: null,
      endDate: null,
    });
    setCurrentPage(0);
  };

  const [imagePreview, setImagePreview] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const broadcastCategoryChange = () => {
    try {
      localStorage.removeItem("categories_raw_cache_v3");
      localStorage.removeItem("categories_nested_cache_v3");
      localStorage.removeItem("categories_raw_cache_v2");
      localStorage.removeItem("categories_nested_cache_v2");
      localStorage.removeItem("headerCategories");
      localStorage.removeItem("cache_footer_categories_v2");
      localStorage.setItem("sathya_category_sync_timestamp", String(Date.now()));
    } catch (_) {}
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("sathya_category_sync");
        channel.postMessage({ type: "CATEGORIES_UPDATED", timestamp: Date.now() });
        channel.close();
      } catch (_) {}
    }
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories/get", { cache: "no-store" });
      const json = await response.json();
      // API returns { data: [...] }; keep fallbacks for a raw array or { categories: [...] }
      const list = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.categories)
            ? json.categories
            : [];
      setCategories(list);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
      setIsLoading(false);
    }
  };

  // Fetch filters from API - same as product page
  const fetchFilter = async () => {
    try {
      const response = await fetch("/api/filter");
      const result = await response.json();

      if (result.error) {
        console.error("Error fetching filters:", result.error);
        return;
      }

      const data = result.data;

      // Group filters by filter_group name
      const groupedFilters = {};

      data.forEach((filter) => {
        const groupName = filter.filter_group_name || "Other Filters";
        if (!groupedFilters[groupName]) groupedFilters[groupName] = [];

        groupedFilters[groupName].push({
          value: filter._id,
          label: filter.filter_name,
          groupLabel: groupName, // Add groupLabel for search
        });
      });

      // Convert grouped data into format React-Select can understand
      const filterOptions = Object.entries(groupedFilters).map(
        ([group, options]) => ({
          label: group,
          options,
        }),
      );

      setFilters(filterOptions);
    } catch (error) {
      console.error("Error fetching filters:", error.message);
    }
  };

  // Add this function after your fetchFilter function
  const fetchCategoryFilters = async (categoryId) => {
    try {
      console.log("Fetching filters for category:", categoryId);

      const response = await fetch(
        `/api/categories/filters?categoryId=${categoryId}`,
      );
      const result = await response.json();

      console.log("API Response:", result);

      let selectedFilterObjects = [];

      if (result.success && result.filters && result.filters.length > 0) {
        console.log("Raw filter IDs from DB:", result.filters);

        // Flatten all filter options from grouped filters
        const allFilterOptions = filters.flatMap(
          (group) => group.options || [],
        );
        console.log("Available filter options:", allFilterOptions);

        // Find the filter objects that match the filter IDs from database
        selectedFilterObjects = allFilterOptions.filter((option) =>
          result.filters.includes(option.value),
        );

        console.log("Selected filter objects:", selectedFilterObjects);
      } else {
        console.log("No filters found for this category");
      }

      return selectedFilterObjects;
    } catch (error) {
      console.error("Error fetching category filters:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchFilter();
  }, []);

  // Export categories to Excel
  const exportCategories = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();

      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);

      if (dateFilter.startDate && dateFilter.endDate) {
        params.append("startDate", dateFilter.startDate);
        params.append("endDate", dateFilter.endDate);
      }

      const res = await fetch(`/api/categories/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to export categories");
      }

      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `categories_export_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error.message || "Failed to export categories");
    } finally {
      setIsExporting(false);
    }
  };

  // When opening update modal, populate existing filters
  // When opening update modal, populate existing filters
  const handleEditClick = async (category) => {
    try {
      console.log(
        "Opening edit modal for category:",
        category._id,
        category.category_name,
      );
      console.log("category object:", category);
      console.log("navImage value:", category.navImage);
      console.log("Full category data:", JSON.stringify(category, null, 2));

      // First set the basic category data
      setCategoryToUpdate({
        ...category,
        existingImage: category.image?.replace(/^https?:\/\/[^/]+/, "") || null,
        existingNavImage: category.navImage?.replace(/^https?:\/\/[^/]+/, "") || null,
        selectedFilters: [], // Initialize as empty
        existingFilters: [],
        content: category.content || "", 
        existingContent: category.content || "", 
        icon_image: null,
        existingIconImage: category.icon_url || null,
      });

      setIsUpdateModalOpen(true);

      // Then fetch and set the filters asynchronously
      const existingFilters = await fetchCategoryFilters(category._id);
      console.log("Setting filters for update:", existingFilters);

      setCategoryToUpdate((prev) => ({
        ...prev,
        selectedFilters: existingFilters,
        existingFilters: existingFilters,
      }));
    } catch (error) {
      console.error("Error in handleEditClick:", error);
      // Ensure modal opens even if filters fail
      if (!isUpdateModalOpen) {
        setIsUpdateModalOpen(true);
      }
    }
  };

  // Handle filter selection for new category
  const handleFilterChange = (selectedOptions) => {
    setNewCategory({ ...newCategory, selectedFilters: selectedOptions });
  };

  // Handle filter selection for update category
  const handleUpdateFilterChange = (selectedOptions) => {
    setCategoryToUpdate({
      ...categoryToUpdate,
      selectedFilters: selectedOptions,
    });
  };

  // Toggle subcategories
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Handle input change
  const handleInputChange = (e) => {
    setNewCategory({ ...newCategory, [e.target.name]: e.target.value });
  };

  // Handle image upload
  // const handleImageChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     setNewCategory((prev) => ({ ...prev, image: file }));
  //     setImagePreview(URL.createObjectURL(file));
  //   }
  // };
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImageError("");

    // AFTER (Optional):
    if (!file) {
      // No file selected - this is allowed now
      setNewCategory((prev) => ({ ...prev, image: null }));
      setImagePreview(null);
      return;
    }

    // Check image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = function () {
      if (this.width !== 260 || this.height !== 240) {
        setImageError("Image must be exactly 260px width and 240px height");
        setNewCategory((prev) => ({ ...prev, image: null }));
        setImagePreview(null);
      } else {
        setNewCategory((prev) => ({ ...prev, image: file }));
        setImagePreview(img.src);
      }
    };

    img.onerror = function () {
      setImageError("Invalid image file");
    };
  };
  // Check if category name already exists
  const isCategoryNameExists = (categoryName) => {
    return categories.some(
      (category) =>
        category.category_name.toLowerCase() === categoryName.toLowerCase(),
    );
  };

  // Handle category submission
  const handleAddCategory = async (e) => {
    e.preventDefault();

    // Reset error messages
    setImageError("");
    setErrorMessage("");

    // Check if image is provided
    // if (!newCategory.image) {
    //   setImageError("Image is required and must be 260px width and 240px height");
    //   return;
    // }

    // AFTER (Optional - removed the required check):

    // Trim and check if category name is empty
    const trimmedCategoryName = newCategory.category_name.trim();
    if (!trimmedCategoryName) {
      setErrorMessage("Category name cannot be empty!");
      return;
    }

    // Check if category name already exists
    if (isCategoryNameExists(trimmedCategoryName)) {
      setErrorMessage("Category name already exists!");
      return;
    }

    const formData = new FormData();
    formData.append("category_name", trimmedCategoryName);
    formData.append("parentid", newCategory.parentid);
    formData.append("status", newCategory.status);
    formData.append("meta_title", newCategory.meta_title);
    formData.append("meta_description", newCategory.meta_description);
    formData.append("meta_keyword", newCategory.meta_keyword);

    if (newCategory.image instanceof File) {
      formData.append("image", newCategory.image);
    }

    if (newCategory.navImage instanceof File) {
      formData.append("navImage", newCategory.navImage);
    }

    if (newCategory.icon_image instanceof File) {
      formData.append("icon_image", newCategory.icon_image);
    }

    // Send selected filters as JSON string
    formData.append(
      "selectedFilters",
      JSON.stringify(newCategory.selectedFilters.map((filter) => filter.value)),
    );

    formData.append("content", newCategory.content);

    try {
      const response = await fetch("/api/categories/add", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchCategories();

        // Reset form
        setNewCategory({
          category_name: "",
          meta_title: "",
          meta_description: "",
          meta_keyword: "",
          parentid: "none",
          status: "Active",
          image: null,
          navImage: null,
          selectedFilters: [],
          content: "",
          icon_image: null,
        });
        setImagePreview(null);

        broadcastCategoryChange();
        // Show success alert (if you still want this as an alert)
        setAlertMessage("Category added successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        // Small delay optional
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setErrorMessage(result.error || "Failed to add category");
        console.error("Error adding category:", result.error);
      }
    } catch (error) {
      setErrorMessage("Failed to add category. Please try again.");
      console.error("Error:", error);
    }
  };

  // Handle category update
  // const handleUpdateCategory = async (e) => {
  //   e.preventDefault();

  //   const formData = new FormData();
  //   formData.append("_id", categoryToUpdate._id);
  //   formData.append("category_name", categoryToUpdate.category_name);
  //   formData.append("parentid", categoryToUpdate.parentid);
  //   formData.append("status", categoryToUpdate.status);
  //   // if (categoryToUpdate.image instanceof File) {
  //   //   formData.append("image", categoryToUpdate.image);
  //   // }
  //    if (categoryToUpdate.image instanceof File) {
  //   const img = new Image();
  //   img.src = URL.createObjectURL(categoryToUpdate.image);

  //   await new Promise((resolve) => {
  //     img.onload = function() {
  //       if (this.width !== 96 || this.height !== 89) {
  //         setAlertMessage("Image must be exactly 96px width and 89px height");
  //         setShowAlert(true);
  //         setTimeout(() => setShowAlert(false), 3000);
  //         resolve(false);
  //       } else {
  //         resolve(true);
  //       }
  //     };

  //     img.onerror = function() {
  //       setAlertMessage("Invalid image file");
  //       setShowAlert(true);
  //       setTimeout(() => setShowAlert(false), 3000);
  //       resolve(false);
  //     };
  //   });
  // }

  //   formData.append("existingImage", categoryToUpdate.existingImage || "");

  //   try {
  //     const response = await fetch("/api/categories/update", {
  //       method: "PUT",
  //       body: formData,
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setIsUpdateModalOpen(false);
  //       fetchCategories();
  //       setAlertMessage("Category updated successfully!");
  //       setShowAlert(true);
  //       setTimeout(() => setShowAlert(false), 3000);
  //     } else {
  //       console.error("Error updating category:", result.error);
  //       setAlertMessage(result.error || "Failed to update category");
  //       setShowAlert(true);
  //       setTimeout(() => setShowAlert(false), 3000);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //     setAlertMessage("Failed to update category");
  //     setShowAlert(true);
  //     setTimeout(() => setShowAlert(false), 3000);
  //   }
  // };
  const handleUpdateCategory = async (e) => {
    e.preventDefault();

    // Reset error messages
    setUpdateImageError("");
    setUpdateErrorMessage("");

    // Trim and check if category name is empty
    const trimmedCategoryName = categoryToUpdate.category_name.trim();
    if (!trimmedCategoryName) {
      setErrorMessage("Category name cannot be empty!");
      return;
    }

    // Check if category name already exists
    // if (isCategoryNameExists(trimmedCategoryName)) {
    //   setErrorMessage("Category name already exists!");
    //   return;
    // }
    const formData = new FormData();
    formData.append("_id", categoryToUpdate._id);
    formData.append("category_name", trimmedCategoryName);
    formData.append("parentid", categoryToUpdate.parentid);
    formData.append("status", categoryToUpdate.status);
    formData.append("meta_title", categoryToUpdate.meta_title);
    formData.append("meta_description", categoryToUpdate.meta_description);
    formData.append("meta_keyword", categoryToUpdate.meta_keyword);
    if (categoryToUpdate.icon_image instanceof File) {
    formData.append("icon_image", categoryToUpdate.icon_image);
   }
   formData.append("existingIconImage", categoryToUpdate.existingIconImage || "");

    // Send selected filters as JSON string
    formData.append(
      "selectedFilters",
      JSON.stringify(
        categoryToUpdate.selectedFilters.map((filter) => filter.value),
      ),
    );

    formData.append("content", categoryToUpdate.content);

    // Check if a new image is being uploaded
    if (categoryToUpdate.image instanceof File) {
      const img = new Image();
      img.src = URL.createObjectURL(categoryToUpdate.image);

      const isValid = await new Promise((resolve) => {
        img.onload = function () {
          if (this.width !== 260 || this.height !== 240) {
            setUpdateImageError(
              "Image must be exactly 260px width and 240px height",
            );
            resolve(false);
          } else {
            resolve(true);
          }
        };

        img.onerror = function () {
          setUpdateImageError("Invalid image file");
          resolve(false);
        };
      });

      if (!isValid) return; // Block submission if image is invalid

      formData.append("image", categoryToUpdate.image);
    }

    formData.append("existingImage", categoryToUpdate.existingImage || "");

    // Check if a new nav image is being uploaded
    if (categoryToUpdate.navImage instanceof File) {
      formData.append("navImage", categoryToUpdate.navImage);
    }
    formData.append(
      "existingNavImage",
      categoryToUpdate.existingNavImage || "",
    );

    try {
      const response = await fetch("/api/categories/update", {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();
      // if (response.ok) {
      //   setIsUpdateModalOpen(false);
      //   fetchCategories();
      //   setAlertMessage("Category updated successfully!");
      //   setShowAlert(true);
      //   setTimeout(() => setShowAlert(false), 3000);
      // } else {
      //   setUpdateErrorMessage(result.error || "Failed to update category");
      //   console.error("Error updating category:", result.error);
      // }
      if (!response.ok) {
        // Handle API errors (including duplicate category)
        setUpdateErrorMessage(result.error || "Failed to update category");
        return;
      }

      // Success case
      broadcastCategoryChange();
      setIsUpdateModalOpen(false);
      fetchCategories();
      setAlertMessage("Category updated successfully!");
      setShowAlert(true);
      setTimeout(() => {
  setShowAlert(false);
  window.location.reload(); 
}, 1000);
    } catch (error) {
      setUpdateErrorMessage("Failed to update category. Please try again.");
    }
  };
  const handleUpdateImageChange = (e) => {
    const file = e.target.files[0];
    setUpdateImageError("");

    if (!file) {
      // If no file is selected, keep the existing image
      setCategoryToUpdate((prev) => ({ ...prev, image: null }));
      return;
    }

    // Check image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = function () {
      if (this.width !== 260 || this.height !== 240) {
        setUpdateImageError(
          "Image must be exactly 260px width and 240px height",
        );
        setCategoryToUpdate((prev) => ({ ...prev, image: null }));
      } else {
        setCategoryToUpdate((prev) => ({ ...prev, image: file }));
      }
    };

    img.onerror = function () {
      setUpdateImageError("Invalid image file");
    };
  };
  const handleNavImageChange = async (e) => {
    const file = e.target.files[0];
    // You can add dimension checks here if needed
    setNewCategory((prev) => ({ ...prev, navImage: file }));
  };
  const handleUpdateNavImageChange = async (e) => {
    const file = e.target.files[0];
    setCategoryToUpdate((prev) => ({ ...prev, navImage: file }));
  };
  // Handle category deletion
  const handleDeleteCategory = async (categoryId) => {
    try {
      const response = await fetch("/api/categories/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      const result = await response.json();
      if (response.ok) {
        broadcastCategoryChange();
        setCategories((prev) =>
          prev.filter(
            (c) =>
              c._id !== categoryId &&
              c.parentid !== categoryId &&
              c.parentid !== String(categoryId)
          )
        );
        fetchCategories();
        setAlertMessage("Category deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      } else {
        console.error("Error:", result.error);
        setAlertMessage(result.error || "Failed to delete category");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      console.error("Error:", error);
      setAlertMessage("Failed to delete category");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setShowConfirmationModal(false);
      setCategoryToDelete(null);
    }
  };

  // Build category tree
  const buildCategoryTree = (categories, parentId = "none") => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter((category) => category.parentid === parentId)
      .map((category) => ({
        ...category,
        children: buildCategoryTree(categories, category._id),
      }));
  };

  // Flatten category tree for pagination
  const flattenCategories = (
    categories,
    parentId = "none",
    level = 0,
    result = [],
  ) => {
    if (!Array.isArray(categories)) return result;
    categories
      .filter((category) => category.parentid === parentId)
      .forEach((category) => {
        result.push({ ...category, level });
        if (expandedCategories[category._id]) {
          flattenCategories(categories, category._id, level + 1, result);
        }
      });
    return result;
  };

  useEffect(() => {
    if (searchQuery.trim() !== "") {
      // Find all categories that match the search
      const allCategories = flattenAllCategories(categories);
      const matchedCategories = allCategories.filter((category) =>
        category.category_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );

      // Get all parent IDs of matched categories
      const parentIdsToExpand = new Set();
      matchedCategories.forEach((category) => {
        // Function to get all parent IDs of a category
        const getParentIds = (catId) => {
          const parentIds = [];
          let current = categories.find((c) => c._id === catId);
          while (current && current.parentid !== "none") {
            parentIds.push(current.parentid);
            current = categories.find((c) => c._id === current.parentid);
          }
          return parentIds;
        };

        getParentIds(category._id).forEach((parentId) =>
          parentIdsToExpand.add(parentId),
        );
      });

      // Expand all parent categories
      const newExpanded = { ...expandedCategories };
      parentIdsToExpand.forEach((parentId) => {
        newExpanded[parentId] = true;
      });
      setExpandedCategories(newExpanded);
    }
  }, [searchQuery, categories]);

  // Render category tree for dropdown
  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category._id} className="ml-4">
        <div
          className={`p-2 cursor-pointer ${
            newCategory.parentid === category._id ||
            categoryToUpdate.parentid === category._id
              ? "text-red-500 font-semibold"
              : "text-black"
          }`}
          onClick={() => {
            if (isUpdateModalOpen) {
              setCategoryToUpdate({
                ...categoryToUpdate,
                parentid: category._id,
              });
            } else {
              setNewCategory({ ...newCategory, parentid: category._id });
            }
          }}
        >
          {category.children.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(category._id);
              }}
              className="mr-2 text-red-500"
            >
              {expandedCategories[category._id] ? <FaMinus /> : <FaPlus />}
            </button>
          )}
          <span
            className={`font-semibold ${
              newCategory.parentid === category._id ||
              categoryToUpdate.parentid === category._id
                ? "text-red-500"
                : ""
            }`}
          >
            {category.category_name}
          </span>
        </div>
        {expandedCategories[category._id] &&
          renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  const getParentCategoryName = (parentId) => {
    if (parentId === "none") return "No Parent";
    const parentCategory = categories.find(
      (category) => category._id === parentId,
    );
    return parentCategory ? parentCategory.category_name : "Unknown";
  };

  const flattenAllCategories = (
    categories,
    parentId = "none",
    level = 0,
    result = [],
  ) => {
    if (!Array.isArray(categories)) return result;
    categories
      .filter((category) => category.parentid === parentId)
      .forEach((category) => {
        result.push({ ...category, level });
        flattenAllCategories(categories, category._id, level + 1, result);
      });
    return result;
  };

  // Filter categories based on search, status, and date
  const filteredCategories = useMemo(() => {
    const flattened = flattenCategories(categories);
    return flattened.filter((category) => {
      // Search filter
      const matchesSearch =
        category.category_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (category.category_slug &&
          category.category_slug
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === "" ||
        category.status.toLowerCase() === statusFilter.toLowerCase();

      // Date filter
      let matchesDate = true;
      if (dateFilter.startDate && dateFilter.endDate && category.createdAt) {
        const categoryDate = new Date(category.createdAt);
        const startDate = new Date(dateFilter.startDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end day

        matchesDate = categoryDate >= startDate && categoryDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [
    categories,
    searchQuery,
    statusFilter,
    dateFilter.startDate,
    dateFilter.endDate,
    expandedCategories,
  ]);

  // Handle date change
  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(0);
  };

  // Pagination logic
  const pageCount = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  // Handle page change
  const paginate = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pageCount) {
      setCurrentPage(pageIndex);
    }
  };

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, dateFilter]);

  // Render category rows
  const renderCategoryRows = () => {
    if (paginatedCategories.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center p-4">
            No categories found
          </td>
        </tr>
      );
    }

    return paginatedCategories.map((category) => (
      <tr key={category._id} className="text-center border-b">
        <td className="flex items-center p-2">
          {categories.some((cat) => cat.parentid === category._id) && (
            <button
              type="button"
              onClick={() => toggleCategory(category._id)}
              className="mr-2 text-red-500"
              aria-label="Expand/Collapse"
            >
              {expandedCategories[category._id] ? <FaMinus /> : <FaPlus />}
            </button>
          )}
          <span
            style={{ paddingLeft: `${category.level * 20}px` }}
            className="font-medium"
          >
            {category.category_name}
          </span>
        </td>
        <td>
          <span className="text-primary-600">
            {category.category_slug || "N/A"}
          </span>
        </td>
        <td>{getParentCategoryName(category.parentid)}</td>
        <td>
          {category.image ? (
            <img
              src={category.image}
              alt="Category"
              className="h-8 mx-auto rounded-lg"
            />
          ) : (
            "No Image"
          )}
        </td>
        <td>
          {category.status === "Active" ? (
            <span className="bg-green-100 text-green-600 px-6 py-1.5 rounded-full font-medium text-sm">
              Active
            </span>
          ) : (
            <span className="bg-red-100 text-red-600 px-6 py-1.5 rounded-full font-medium text-sm">
              Inactive
            </span>
          )}
        </td>
        <td>
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => handleEditClick(category)}
              className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
              title="Edit"
            >
              <FaEdit className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setCategoryToDelete(category._id);
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
    ));
  };

  const fieldClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const sectionClass = "rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4";
  const fileInputClass =
    "block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#ED1C24] hover:file:bg-red-100 cursor-pointer";

  const resetNewCategory = () => {
    setNewCategory({
      category_name: "",
      meta_title: "",
      meta_description: "",
      meta_keyword: "",
      parentid: "none",
      status: "Active",
      image: null,
      navImage: null,
      selectedFilters: [],
      content: "",
      icon_image: null,
    });
    setImagePreview(null);
    setImageError("");
    setErrorMessage("");
  };

  return (
    <div className="container mx-auto">
      {/* Alert Message */}
      {showAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-4 mt-5 text-sm flex items-center gap-2">
          <Icon icon="mdi:check-circle" className="text-lg text-emerald-600" />
          {alertMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage category hierarchy, SEO, images, and filters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/category/navcat"
            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Icon icon="mdi:menu" className="text-base" />
            Nav Menu
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#ED1C24] hover:bg-[#C4161D] text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Icon icon="mdi:plus" className="text-lg" />
            Add Category
          </button>

          <button
            onClick={exportCategories}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mdi:microsoft-excel" className="text-base text-emerald-600" />
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <AdminLoader label="Loading categories..." />
      ) : (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 mb-5 overflow-x-auto">
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <div className="w-full sm:w-64">
              <label className={labelClass}>Search</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Icon icon="mdi:magnify" className="text-gray-400 text-lg" />
                </span>
                <input
                  type="text"
                  placeholder="Search category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${fieldClass} pl-10`}
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <label className={labelClass}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={fieldClass}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="w-full sm:w-72">
              <label className={labelClass}>Date Range</label>
              <div className="relative w-full">
                <DateRangePicker onDateChange={handleDateChange} />
              </div>
            </div>
          </div>

          {/* Categories Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-semibold">Category Name</th>
                  <th className="px-3 py-3 font-semibold">Category Slug</th>
                  <th className="px-3 py-3 font-semibold">Parent</th>
                  <th className="px-3 py-3 font-semibold">Image</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>{renderCategoryRows()}</tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {filteredCategories.length === 0
                ? 0
                : currentPage * itemsPerPage + 1}{" "}
              to{" "}
              {Math.min(
                (currentPage + 1) * itemsPerPage,
                filteredCategories.length,
              )}{" "}
              of {filteredCategories.length} entries
            </div>

            <div className="pagination flex items-center space-x-1">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 0}
                className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                  currentPage === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                aria-label="Previous page"
              >
                «
              </button>

              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => paginate(i)}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                    currentPage === i
                      ? "bg-red-500 text-white"
                      : "text-black bg-white hover:bg-gray-100"
                  }`}
                  aria-label={`Page ${i + 1}`}
                  aria-current={currentPage === i ? "page" : undefined}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pageCount - 1 || pageCount === 0}
                className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                  currentPage === pageCount - 1 || pageCount === 0
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
      )}

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-50/80 to-white">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-xl bg-[#ED1C24] text-white flex items-center justify-center shadow-sm">
                  <Icon icon="mdi:folder-plus-outline" className="text-xl" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Category</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Create a new category with SEO, media, and filters.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetNewCategory();
                }}
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
                aria-label="Close modal"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:tag-outline" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">Basic details</h3>
                  </div>
                  <div>
                    <label htmlFor="category_name" className={labelClass}>
                      Category Name <span className="text-[#ED1C24]">*</span>
                    </label>
                    <input
                      name="category_name"
                      value={newCategory.category_name}
                      onChange={handleInputChange}
                      id="category_name"
                      className={fieldClass}
                      placeholder="e.g. Televisions"
                      required
                    />
                    {errorMessage && (
                      <p className="text-red-500 text-sm mt-1.5">{errorMessage}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Active", "Inactive"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setNewCategory({ ...newCategory, status: s })
                          }
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            newCategory.status === s
                              ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:search-web" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">SEO</h3>
                  </div>
                  <div>
                    <label htmlFor="meta_title" className={labelClass}>
                      Meta Title <span className="text-[#ED1C24]">*</span>
                    </label>
                    <input
                      name="meta_title"
                      value={newCategory.meta_title}
                      onChange={handleInputChange}
                      id="meta_title"
                      className={fieldClass}
                      placeholder="SEO title for search engines"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="meta_keyword" className={labelClass}>
                      Meta Keyword
                    </label>
                    <textarea
                      name="meta_keyword"
                      value={newCategory.meta_keyword || ""}
                      onChange={handleInputChange}
                      className={fieldClass}
                      rows="2"
                      placeholder="Comma-separated keywords"
                    />
                  </div>
                  <div>
                    <label htmlFor="meta_description" className={labelClass}>
                      Meta Description
                    </label>
                    <textarea
                      name="meta_description"
                      value={newCategory.meta_description || ""}
                      onChange={handleInputChange}
                      className={fieldClass}
                      rows="2"
                      placeholder="Short description for search results"
                    />
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:file-tree-outline" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Hierarchy & media
                    </h3>
                  </div>
                  <div>
                    <label className={labelClass}>Parent Category</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Choose “Category” for a top-level item, or pick a parent below.
                    </p>
                    <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto p-2 bg-white">
                      <div
                        className={`p-2.5 cursor-pointer rounded-lg text-sm font-medium transition ${
                          newCategory.parentid === "none"
                            ? "bg-red-50 text-[#ED1C24] border border-red-100"
                            : "text-gray-800 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setNewCategory({ ...newCategory, parentid: "none" })
                        }
                      >
                        Category (top level)
                      </div>
                      {renderCategoryTree(buildCategoryTree(categories))}
                    </div>
                  </div>

                  {newCategory.parentid != "none" && (
                    <div>
                      <label className={labelClass}>
                        Category Image{" "}
                        <span className="font-normal text-gray-400">
                          (260×240 · optional)
                        </span>
                      </label>
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                        <input
                          type="file"
                          onChange={handleImageChange}
                          className={fileInputClass}
                        />
                        {imageError && (
                          <p className="text-red-500 text-sm mt-2">{imageError}</p>
                        )}
                        {imagePreview && (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mt-3 h-20 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {newCategory.parentid == "none" && (
                    <div>
                      <label className={labelClass}>
                        Navigation Image{" "}
                        <span className="font-normal text-gray-400">(210×370)</span>
                      </label>
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                        <input
                          type="file"
                          onChange={handleNavImageChange}
                          className={fileInputClass}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Icon Image</label>
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file)
                            setNewCategory((prev) => ({
                              ...prev,
                              icon_image: file,
                            }));
                        }}
                        className={fileInputClass}
                      />
                      {newCategory.icon_image && (
                        <img
                          src={URL.createObjectURL(newCategory.icon_image)}
                          className="mt-3 h-12 w-12 object-contain rounded-lg border border-gray-100"
                          alt="Icon preview"
                        />
                      )}
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:filter-variant" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Filters & content
                    </h3>
                  </div>
                  <div>
                    <label className={labelClass}>Filters</label>
                    <Select
                      options={filters}
                      isMulti
                      hideSelectedOptions={false}
                      closeMenuOnSelect={false}
                      components={{ Option: CustomOption }}
                      value={newCategory.selectedFilters}
                      onChange={handleFilterChange}
                      placeholder="Select filters…"
                      filterOption={(option, inputValue) => {
                        const filterName = option.label?.toLowerCase() || "";
                        const groupLabel =
                          option.data?.groupLabel?.toLowerCase?.() || "";
                        const input = inputValue.toLowerCase();
                        if (groupLabel && groupLabel.includes(input)) return true;
                        return filterName.includes(input);
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          minHeight: "42px",
                          borderColor: state.isFocused ? "#ED1C24" : "#d1d5db",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(215,40,40,0.15)"
                            : "none",
                          "&:hover": { borderColor: "#ED1C24" },
                        }),
                        groupHeading: (base) => ({
                          ...base,
                          backgroundColor: "#f3f4f6",
                          color: "#1f2937",
                          fontWeight: 600,
                          padding: "8px 12px",
                          borderBottom: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#e6f4ea"
                            : state.isFocused
                              ? "#f9fafb"
                              : "white",
                          color: "#111827",
                          fontWeight: state.isSelected ? 600 : 400,
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className={labelClass}>
                      Content
                    </label>
                    <textarea
                      name="content"
                      id="content"
                      value={newCategory.content}
                      onChange={(e) =>
                        setNewCategory({
                          ...newCategory,
                          content: e.target.value,
                        })
                      }
                      rows="4"
                      className={fieldClass}
                      placeholder="Category description or content…"
                    />
                  </div>
                </section>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetNewCategory();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <Icon icon="mdi:plus" className="text-lg" />
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Category Modal */}
      {isUpdateModalOpen && categoryToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/70 to-white">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Icon icon="mdi:folder-edit-outline" className="text-xl" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Update Category
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[240px] sm:max-w-md">
                    {categoryToUpdate.category_name || "Edit category details"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setUpdateErrorMessage("");
                  setUpdateImageError("");
                  setErrorMessage("");
                }}
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
                aria-label="Close modal"
              >
                <Icon icon="mdi:close" className="text-xl" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateCategory}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                {showUpdateAlert && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <Icon icon="mdi:check-circle" className="text-lg text-emerald-600" />
                    {updateAlertMessage}
                  </div>
                )}

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:tag-outline" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">Basic details</h3>
                  </div>
                  <div>
                    <label htmlFor="update_category_name" className={labelClass}>
                      Category Name <span className="text-[#ED1C24]">*</span>
                    </label>
                    <input
                      name="category_name"
                      value={categoryToUpdate.category_name}
                      onChange={(e) =>
                        setCategoryToUpdate({
                          ...categoryToUpdate,
                          category_name: e.target.value,
                        })
                      }
                      id="update_category_name"
                      className={fieldClass}
                      placeholder="Enter Category Name"
                      required
                    />
                    {errorMessage && (
                      <p className="text-red-500 text-sm mt-1.5">{errorMessage}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Active", "Inactive"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setCategoryToUpdate({
                              ...categoryToUpdate,
                              status: s,
                            })
                          }
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            categoryToUpdate.status === s
                              ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:search-web" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">SEO</h3>
                  </div>
                  <div>
                    <label htmlFor="update_meta_title" className={labelClass}>
                      Meta Title
                    </label>
                    <input
                      name="meta_title"
                      value={categoryToUpdate.meta_title}
                      onChange={(e) =>
                        setCategoryToUpdate({
                          ...categoryToUpdate,
                          meta_title: e.target.value,
                        })
                      }
                      id="update_meta_title"
                      className={fieldClass}
                      placeholder="Enter Meta Title"
                    />
                  </div>
                  <div>
                    <label htmlFor="update_meta_keyword" className={labelClass}>
                      Meta Keyword
                    </label>
                    <textarea
                      name="meta_keyword"
                      value={categoryToUpdate.meta_keyword}
                      onChange={(e) =>
                        setCategoryToUpdate({
                          ...categoryToUpdate,
                          meta_keyword: e.target.value,
                        })
                      }
                      id="update_meta_keyword"
                      className={fieldClass}
                      rows="2"
                      placeholder="Enter Meta Keyword"
                    />
                  </div>
                  <div>
                    <label htmlFor="update_meta_description" className={labelClass}>
                      Meta Description
                    </label>
                    <textarea
                      name="meta_description"
                      value={categoryToUpdate.meta_description}
                      onChange={(e) =>
                        setCategoryToUpdate({
                          ...categoryToUpdate,
                          meta_description: e.target.value,
                        })
                      }
                      id="update_meta_description"
                      className={fieldClass}
                      rows="2"
                      placeholder="Enter Meta Description"
                    />
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:file-tree-outline" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Hierarchy & media
                    </h3>
                  </div>
                  <div>
                    <label className={labelClass}>Parent Category</label>
                    <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto p-2 bg-white">
                      <div
                        className={`p-2.5 cursor-pointer rounded-lg text-sm font-medium transition ${
                          categoryToUpdate.parentid === "none"
                            ? "bg-red-50 text-[#ED1C24] border border-red-100"
                            : "text-gray-800 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setCategoryToUpdate({
                            ...categoryToUpdate,
                            parentid: "none",
                          })
                        }
                      >
                        Category (top level)
                      </div>
                      {renderCategoryTree(buildCategoryTree(categories))}
                    </div>
                  </div>

                  {categoryToUpdate.parentid != "none" && (
                    <div>
                      <label className={labelClass}>
                        Category Image{" "}
                        <span className="font-normal text-gray-400">(260×240)</span>
                      </label>
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpdateImageChange}
                          className={fileInputClass}
                        />
                        {updateImageError && (
                          <p className="text-red-500 text-sm mt-2">
                            {updateImageError}
                          </p>
                        )}
                        {(categoryToUpdate.existingImage ||
                          categoryToUpdate.image) && (
                          <div className="mt-3">
                            <img
                              src={
                                categoryToUpdate.image instanceof File
                                  ? URL.createObjectURL(categoryToUpdate.image)
                                  : categoryToUpdate.existingImage
                              }
                              alt="Preview"
                              className="h-20 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Current image preview
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {categoryToUpdate.parentid == "none" && (
                    <div>
                      <label className={labelClass}>
                        Navigation Image{" "}
                        <span className="font-normal text-gray-400">(210×370)</span>
                      </label>
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpdateNavImageChange}
                          className={fileInputClass}
                        />
                        {updateImageError && (
                          <p className="text-red-500 text-sm mt-2">
                            {updateImageError}
                          </p>
                        )}
                        {(categoryToUpdate.existingNavImage ||
                          categoryToUpdate.navImage) && (
                          <div className="mt-3">
                            <img
                              src={
                                categoryToUpdate.navImage instanceof File
                                  ? URL.createObjectURL(categoryToUpdate.navImage)
                                  : categoryToUpdate.existingNavImage
                              }
                              alt="Preview"
                              className="h-20 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Current navigation image preview
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      Icon Image{" "}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file)
                            setCategoryToUpdate((prev) => ({
                              ...prev,
                              icon_image: file,
                            }));
                        }}
                        className={fileInputClass}
                      />
                      {(categoryToUpdate.existingIconImage ||
                        categoryToUpdate.icon_image) && (
                        <img
                          src={
                            categoryToUpdate.icon_image instanceof File
                              ? URL.createObjectURL(categoryToUpdate.icon_image)
                              : categoryToUpdate.existingIconImage
                          }
                          className="mt-3 h-12 w-12 object-contain rounded-lg border border-gray-100"
                          alt="Icon preview"
                        />
                      )}
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:filter-variant" className="text-[#ED1C24]" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Filters & content
                    </h3>
                  </div>
                  <div>
                    <label className={labelClass}>Filters</label>
                    <Select
                      options={filters}
                      isMulti
                      hideSelectedOptions={false}
                      closeMenuOnSelect={false}
                      components={{ Option: CustomOption }}
                      value={categoryToUpdate.selectedFilters}
                      onChange={handleUpdateFilterChange}
                      placeholder="Select filters…"
                      filterOption={(option, inputValue) => {
                        const filterName = option.label?.toLowerCase() || "";
                        const groupLabel =
                          option.data?.groupLabel?.toLowerCase?.() || "";
                        const input = inputValue.toLowerCase();
                        if (groupLabel && groupLabel.includes(input)) return true;
                        return filterName.includes(input);
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          minHeight: "42px",
                          borderColor: state.isFocused ? "#ED1C24" : "#d1d5db",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(215,40,40,0.15)"
                            : "none",
                          "&:hover": { borderColor: "#ED1C24" },
                        }),
                        groupHeading: (base) => ({
                          ...base,
                          backgroundColor: "#f3f4f6",
                          color: "#1f2937",
                          fontWeight: 600,
                          padding: "8px 12px",
                          borderBottom: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#e6f4ea"
                            : state.isFocused
                              ? "#f9fafb"
                              : "white",
                          color: "#111827",
                          fontWeight: state.isSelected ? 600 : 400,
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="update_content" className={labelClass}>
                      Content
                    </label>
                    <textarea
                      name="content"
                      id="update_content"
                      value={categoryToUpdate.content}
                      onChange={(e) =>
                        setCategoryToUpdate({
                          ...categoryToUpdate,
                          content: e.target.value,
                        })
                      }
                      rows="4"
                      className={fieldClass}
                      placeholder="Category description or content…"
                    />
                  </div>
                </section>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setUpdateErrorMessage("");
                    setUpdateImageError("");
                    setErrorMessage("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <Icon icon="mdi:content-save-outline" className="text-lg" />
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-red-50 text-[#ED1C24] flex items-center justify-center">
                <Icon icon="mdi:alert-outline" className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Delete Category
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete this category? This action cannot
                  be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(categoryToDelete)}
                className="rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
