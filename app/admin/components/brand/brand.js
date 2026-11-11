"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaMinus, FaEdit } from "react-icons/fa";
import ReactPaginate from "react-paginate";
import { Icon } from '@iconify/react';
import Image from "next/image";

export default function BrandComponent() {
  const router = useRouter();
  const [brand, setBrand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [productCount, setProductCount] = useState(0);
  const [newBrand, setNewBrand] = useState({
    brand_name: "",
    status: "Active",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [imageError, setImageError] = useState("");
  
  // New feature states
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);
  const [navigatingBrandId, setNavigatingBrandId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  // Fetch categories from API
  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const data = await response.json();
      setBrand(data.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching brand:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, []);

  // Handle page change
  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  // Handle input change
  const handleInputChange = (e) => {
    setNewBrand({ ...newBrand, [e.target.name]: e.target.value });
  };

  // Handle edit input change
  const handleEditInputChange = (e) => {
    setEditingBrand({ ...editingBrand, [e.target.name]: e.target.value });
  };

  // Function to validate image dimensions
  const validateImageDimensions = (file) => {
    return new Promise((resolve) => {
      //const img = new Image();
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const valid = img.width === 140 && img.height === 60;
        URL.revokeObjectURL(img.src);
        resolve(valid);
      };
      img.onerror = () => resolve(false);
    });
  };

  // Handle image upload
  /*const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = await validateImageDimensions(file);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        e.target.value = "";
        return;
      }
      setImageError("");
      setNewBrand((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  }; */

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = await validateImageDimensions(file);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        e.target.value = "";
        return;
      }
      setImageError("");
      setNewBrand((prev) => ({ ...prev, image: file }));

      // ✅ Use FileReader instead of createObjectURL
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle edit image upload
  /* const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = await validateImageDimensions(file);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        e.target.value = "";
        return;
      }
      setImageError("");
      setEditingBrand((prev) => ({ ...prev, image: file, existingImage: prev.image }));
      setEditImagePreview(URL.createObjectURL(file));
    }
  }; */

  const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = await validateImageDimensions(file);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        e.target.value = "";
        return;
      }
      setImageError("");
      setEditingBrand((prev) => ({ ...prev, image: file, existingImage: prev.image }));

      // ✅ Use FileReader instead of createObjectURL
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle category submission
  // const handleAddBrand = async (e) => {
  //   e.preventDefault();

  //   if (newBrand.image) {
  //     const isValid = await validateImageDimensions(newBrand.image);
  //     if (!isValid) {
  //       setImageError("Image must be exactly 140px width and 60px height");
  //       return;
  //     }
  //   }

  //   const formData = new FormData();
  //   formData.append("brand_name", newBrand.brand_name);
  //   formData.append("status", newBrand.status);
  //   if (newBrand.image) {
  //     formData.append("image", newBrand.image);
  //   }

  //   try {
  //     const response = await fetch("/api/brand/add", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setIsModalOpen(false);
  //       fetchBrand();
  //       setNewBrand({
  //         brand_name: "",
  //         status: "Active",
  //         image: null,
  //       });
  //       setImagePreview(null);
  //       setSuccessMessage("Brand Added Successfully");
  //       setShowSuccessModal(true);
  //     } else {
  //       console.error("Error adding brand:", result.error);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //   }
  // };
  const handleAddBrand = async (e, goToBuilder = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!newBrand.brand_name?.trim()) {
      alert("Brand Name is required");
      return;
    }

    if (newBrand.image) {
      const isValid = await validateImageDimensions(newBrand.image);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        return;
      }
    }

    setIsSubmittingBrand(true);
    const formData = new FormData();
    formData.append("brand_name", newBrand.brand_name.trim());
    formData.append("status", newBrand.status);
    if (newBrand.image) {
      formData.append("image", newBrand.image);
    }

    try {
      const response = await fetch("/api/brand/add", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchBrand();
        setNewBrand({
          brand_name: "",
          status: "Active",
          image: null,
        });
        setImagePreview(null);

        if (goToBuilder && result.brandPageId) {
          router.push(`/admin/brand-pages/${result.brandPageId}`);
          return;
        }

        setSuccessMessage("Brand and Brand Page added successfully");
        setShowSuccessModal(true);

        // Auto-hide the success modal after 2 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccessMessage(""); // Optional: clear the message
        }, 2000);
      } else {
        console.error("Error adding brand:", result.error);
        alert(result.error || "Failed to add brand");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while adding the brand.");
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  const handleDesignPage = async (brandItem) => {
    setNavigatingBrandId(brandItem._id);
    try {
      const res = await fetch(`/api/brand/page-link?brandId=${brandItem._id}`);
      const data = await res.json();
      if (res.ok && data.pageId) {
        router.push(`/admin/brand-pages/${data.pageId}`);
      } else {
        alert(data.error || "Failed to open brand page builder.");
        setNavigatingBrandId(null);
      }
    } catch (err) {
      console.error("Error opening brand page:", err);
      alert("Error opening brand page builder.");
      setNavigatingBrandId(null);
    }
  };

  // Handle brand edit
  /*
  const handleEditBrand = (brand) => {
    setEditingBrand({
      ...brand,
      image: brand.image,
      existingImage: brand.image
    });
    setEditImagePreview(brand.image ? `/uploads/Brands/${brand.image}` : null);
    setIsEditModalOpen(true);
  }; */

  const handleEditBrand = (brand) => {
    setEditingBrand({
      ...brand,
      image: brand.image,
      existingImage: brand.image
    });
    // ✅ Add cache-busting param for production
    setEditImagePreview(
      brand.image ? `/uploads/Brands/${brand.image}?t=${Date.now()}` : null
    );
    setIsEditModalOpen(true);
  };

  // Handle brand update
  // const handleUpdateBrand = async (e) => {
  //   e.preventDefault();

  //   if (editingBrand.image instanceof File) {
  //     const isValid = await validateImageDimensions(editingBrand.image);
  //     if (!isValid) {
  //       setImageError("Image must be exactly 140px width and 60px height");
  //       return;
  //     }
  //   }

  //   const formData = new FormData();
  //   formData.append("id", editingBrand._id);
  //   formData.append("brand_name", editingBrand.brand_name);
  //   formData.append("status", editingBrand.status);
  //   formData.append("existingImage", editingBrand.existingImage || "");
  //   if (editingBrand.image instanceof File) {
  //     formData.append("image", editingBrand.image);
  //   }

  //   try {
  //     const response = await fetch("/api/brand/update", {
  //       method: "PUT",
  //       body: formData,
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setIsEditModalOpen(false);
  //       fetchBrand();
  //       setEditingBrand(null);
  //       setEditImagePreview(null);
  //       setSuccessMessage("Brand Updated Successfully");
  //       setShowSuccessModal(true);
  //     } else {
  //       console.error("Error updating brand:", result.error);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //   }
  // };
  const handleUpdateBrand = async (e) => {
    e.preventDefault();

    if (editingBrand.image instanceof File) {
      const isValid = await validateImageDimensions(editingBrand.image);
      if (!isValid) {
        setImageError("Image must be exactly 140px width and 60px height");
        return;
      }
    }

    const formData = new FormData();
    formData.append("id", editingBrand._id);
    formData.append("brand_name", editingBrand.brand_name);
    formData.append("status", editingBrand.status);
    formData.append("existingImage", editingBrand.existingImage || "");
    if (editingBrand.image instanceof File) {
      formData.append("image", editingBrand.image);
    }

    try {
      const response = await fetch("/api/brand/update", {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchBrand();
        setEditingBrand(null);
        setEditImagePreview(null);
        setSuccessMessage("Brand Updated Successfully");
        setShowSuccessModal(true);

        // Auto-hide the success modal after 2 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccessMessage(""); // Optional: clear message
        }, 2000);
      } else {
        console.error("Error updating brand:", result.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = async (brandId) => {
    try {
      // Fetch product count first
      const response = await fetch(`/api/product/count?brandId=${brandId}`);
      const result = await response.json();

      if (response.ok) {
        setProductCount(result.count);
        setBrandToDelete(brandId);
        setShowConfirmationModal(true);
      } else {
        console.error("Error fetching product count:", result.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteBrand = async (brandId) => {
    try {
      const response = await fetch("/api/brand/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Brand Deleted Successfully");
        setShowSuccessModal(true);
        fetchBrand();
      } else if (result.hasProducts) {
        setSuccessMessage(`Cannot delete brand. There are ${result.productCount} products associated with this brand.`);
        setShowSuccessModal(true);
      } else {
        console.error("Error:", result.error);
        setSuccessMessage(result.error || "Failed to delete brand.");
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setSuccessMessage("An error occurred while deleting the brand.");
      setShowSuccessModal(true);
    } finally {
      setShowConfirmationModal(false);
      setBrandToDelete(null);

      // Auto-hide the success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessMessage(""); // Optional: clear the message
      }, 2000);
    }
  };


  // const handleDeleteBrand = async (brandId) => {
  //     try {
  //         const response = await fetch("/api/brand/delete", {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({ brandId }),
  //         });

  //         const result = await response.json();
  //         if (response.ok) {
  //             setSuccessMessage("Brand Deleted Successfully");
  //             setShowSuccessModal(true);
  //             fetchBrand();
  //         } else if (result.hasProducts) {
  //             // Show a different message if brand has products
  //             setSuccessMessage("Cannot delete brand. There are products associated with this brand.");
  //             setShowSuccessModal(true);
  //         } else {
  //             console.error("Error:", result.error);
  //             setSuccessMessage(result.error || "Failed to delete brand.");
  //             setShowSuccessModal(true);
  //         }
  //     } catch (error) {
  //         console.error("Error:", error);
  //         setSuccessMessage("An error occurred while deleting the brand.");
  //         setShowSuccessModal(true);
  //     } finally {
  //         setShowConfirmationModal(false);
  //         setBrandToDelete(null);
  //     }
  // };
  // Handle category deletion
  // const handleDeleteBrand = async (brandId) => {
  //   try {
  //     const response = await fetch("/api/brand/delete", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ brandId }),
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setSuccessMessage("Brand Deleted Successfully");
  //       setShowSuccessModal(true);
  //       fetchBrand();
  //     } else {
  //       console.error("Error:", result.error);
  //       alert("Failed to delete category.");
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //     alert("An error occurred.");
  //   } finally {
  //     setShowConfirmationModal(false);
  //     setBrandToDelete(null);
  //   }
  // };

  const flattenCategories = (brand, parentId = "none", level = 0, result = []) => {
    brand.forEach((category) => {
      result.push({ ...category, level });
    });
    return result;
  };

  // Handle single brand selection
  const handleSelectBrand = (brandId) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Render category rows with pagination
  const renderBrandRows = () => {
    const flattenedCategories = flattenCategories(brand);
    const filteredCategories = flattenedCategories.filter((b) => {
      const matchesSearch = b.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.brand_slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filteredCategories
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((brand, index) => (
        <tr key={brand._id} className="text-center border-b hover:bg-gray-50">
          <td className="p-2">
            <input 
              type="checkbox" 
              checked={selectedBrands.includes(brand._id)}
              onChange={() => handleSelectBrand(brand._id)}
              className="w-4 h-4 cursor-pointer accent-red-500"
            />
          </td>
          <td className="p-2">{brand.brand_name}</td>
          <td className="p-2">{brand.brand_slug}</td>
          <td className="p-2">
            {brand.image ? (
              /* <img 
                 src={`/uploads/Brands/${brand.image}`} 
                 alt="brand" 
                 className="h-7 mx-auto"
               /> */

              <Image
                src={`/uploads/Brands/${brand.image}`}
                alt="brand"
                width={0}
                height={0}
                sizes="10vw"
                className="w-auto h-7 mx-auto"
                unoptimized
              />
            ) : (
              <div className="h-[60px] w-[140px] bg-gray-100 flex items-center justify-center mx-auto">
                No Image
              </div>
            )}
          </td>
          <td className="p-2 font-semibold">
            {brand.status === "Active" ? (
              <span className="bg-green-100 text-green-600 px-6 py-1.5 rounded-full font-medium text-sm">Active</span>
            ) : (
              <span className="bg-red-100 text-red-600 px-6 py-1.5 rounded-full font-medium text-sm">Inactive</span>
            )}
          </td>
          <td>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => handleDesignPage(brand)}
                disabled={navigatingBrandId === brand._id}
                className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
                title="Design Brand Page"
              >
                {navigatingBrandId === brand._id ? (
                  <Icon icon="line-md:loading-loop" className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon icon="mdi:palette-outline" className="w-3.5 h-3.5" />
                )}
                <span>Design Page</span>
              </button>
              <button
                onClick={() => handleEditBrand(brand)}
                className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center hover:bg-red-200 transition"
                title="Edit"
              >
                <FaEdit className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteClick(brand._id)}
                className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center hover:bg-pink-200 transition"
                title="Delete"
              >
                <Icon icon="mingcute:delete-2-line" />
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  const flattenedCategories = flattenCategories(brand);
  const filteredCategories = flattenedCategories.filter((b) => {
    const matchesSearch = b.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.brand_slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageCount = Math.ceil(filteredCategories.length / itemsPerPage);
  const totalEntries = filteredCategories.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const currentVisibleBrands = filteredCategories.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const isAllVisibleSelected =
    currentVisibleBrands.length > 0 &&
    currentVisibleBrands.every((b) => selectedBrands.includes(b._id));

  const handleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible
      const visibleIds = currentVisibleBrands.map((b) => b._id);
      setSelectedBrands((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      const visibleIds = currentVisibleBrands.map((b) => b._id);
      const newSelected = new Set([...selectedBrands, ...visibleIds]);
      setSelectedBrands(Array.from(newSelected));
    }
  };

  const handleConfirmBulkDelete = async () => {
    setIsDeletingBulk(true);
    try {
      const response = await fetch("/api/brand/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandIds: selectedBrands }),
      });
      const result = await response.json();
      
      if (response.ok) {
        setSuccessMessage(result.message);
        setShowSuccessModal(true);
        setSelectedBrands([]); // Clear selection
        fetchBrand();
      } else {
        setSuccessMessage(result.error || "Failed to delete brands.");
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      setSuccessMessage("An error occurred during bulk delete.");
      setShowSuccessModal(true);
    } finally {
      setIsDeletingBulk(false);
      setShowBulkDeleteConfirm(false);
      setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessMessage("");
      }, 3000);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Brand List</h2>
      </div>

      {isLoading ? (
        <p>Loading Brands...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto border rounded border-gray-200">
          {/* Search, Filter, and Action Buttons Row */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
            {/* Left Side: Search & Filter */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search Brand..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="border px-3 py-2 rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0); // Reset pagination on filter
                }}
                className="border px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-white cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Right Side: Bulk Delete & Add Brand */}
            <div className="flex items-center gap-3">
              {selectedBrands.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="bg-pink-100 text-pink-600 border border-pink-200 px-4 py-2 rounded-md font-medium hover:bg-pink-200 transition flex items-center gap-2"
                >
                  <Icon icon="mingcute:delete-2-line" className="w-4 h-4" />
                  Delete Selected ({selectedBrands.length})
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-medium hover:bg-red-600 transition flex items-center gap-2"
              >
                <FaPlus className="w-3 h-3" /> Add brand
              </button>
            </div>
          </div>
          <hr className="border-t border-gray-200 mb-4" />

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="p-2 w-12">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-red-500"
                    title="Select all visible"
                  />
                </th>
                <th className="p-2">Brand Name</th>
                <th className="p-2">Brand Slug</th>
                <th className="p-2">Image</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length > 0 ? (
                renderBrandRows()
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-gray-500">
                    No brands found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            {/* Left side: Entry text */}
            <div className="text-sm text-gray-600">
              Showing {startEntry} to {endEntry} of {totalEntries} entries
            </div>

            {/* Right side: Pagination */}
            <ReactPaginate
              previousLabel={"«"}
              nextLabel={"»"}
              breakLabel={"..."}
              pageCount={pageCount}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageClick}
              containerClassName={"flex items-center space-x-1"}
              activeClassName={"bg-red-500 text-white"}
              pageClassName={"page-item"}
              pageLinkClassName={
                "px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
              }
              previousClassName={"page-item"}
              previousLinkClassName={
                "px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
              }
              nextClassName={"page-item"}
              nextLinkClassName={
                "px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
              }
              breakClassName={"page-item"}
              breakLinkClassName={
                "px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black"
              }
            />
          </div>
        </div>
      )}

      {/* Modal for Adding Brand */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header with close button */}
            <div className="flex justify-between items-center border-b-2 border-gray-300 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Brand</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-6 overflow-y-auto flex-grow">
              <form onSubmit={handleAddBrand} className="space-y-5">
                {/* Brand Name */}
                <div>
                  <label htmlFor="brand_name" className="block mb-1 text-sm font-semibold text-gray-700">
                    Brand Name
                  </label>
                  <input
                    name="brand_name"
                    value={newBrand.brand_name}
                    onChange={handleInputChange}
                    id="brand_name"
                    className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400"
                    placeholder="Enter Brand Name"
                    required
                  />
                </div>

                {/* Upload Image */}
                <div>
                  <label className="block mb-1 text-sm font-semibold text-gray-700">
                    Upload Image (Required: 140px width × 60px height)
                  </label>
                  <input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="block w-full text-sm text-gray-600
                      file:mr-3 file:py-1 file:px-3
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-red-50 file:text-red-700
                      hover:file:bg-red-100
                    "
                    required
                  />
                  {imageError && (
                    <p className="text-red-500 text-sm mt-1">{imageError}</p>
                  )}
                  {imagePreview && (
                    <div className="mt-3 flex flex-col items-center">

                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={0}
                        height={0}
                        sizes="10vw"
                        className="h-[60px] w-[140px] object-contain border rounded"
                        unoptimized
                      />
                      <p className="text-xs text-gray-500 mt-1">Preview (140×60)</p>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block mb-1 text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={newBrand.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmittingBrand}
                    onClick={(e) => handleAddBrand(e, true)}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isSubmittingBrand ? (
                      <Icon icon="line-md:loading-loop" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon icon="mdi:palette-outline" className="w-4 h-4" />
                    )}
                    Save & Design Brand Page
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingBrand}
                    onClick={(e) => handleAddBrand(e, false)}
                    className="inline-block bg-gray-100 text-gray-700 border border-gray-300 px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    Save Brand Only
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Brand */}
      {isEditModalOpen && editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header with close button */}
            <div className="flex justify-between items-center border-b-2 border-gray-300 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Edit Brand</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-6 overflow-y-auto flex-grow">
              <form onSubmit={handleUpdateBrand} className="space-y-5">
                {/* Brand Name */}
                <div>
                  <label htmlFor="edit_brand_name" className="block mb-1 text-sm font-semibold text-gray-700">
                    Brand Name
                  </label>
                  <input
                    name="brand_name"
                    value={editingBrand.brand_name}
                    onChange={handleEditInputChange}
                    id="edit_brand_name"
                    className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400"
                    placeholder="Enter Brand Name"
                    required
                  />
                </div>

                {/* Upload Image */}
                <div>
                  <label className="block mb-1 text-sm font-semibold text-gray-700">
                    Upload Image (Required: 140px width × 60px height)
                  </label>
                  <input
                    type="file"
                    onChange={handleEditImageChange}
                    accept="image/*"
                    className="block w-full text-sm text-gray-600
                      file:mr-3 file:py-1 file:px-3
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-red-50 file:text-red-700
                      hover:file:bg-red-100
                    "
                  />
                  {imageError && (
                    <p className="text-red-500 text-sm mt-1">{imageError}</p>
                  )}
                  {editImagePreview && (
                    <div className="mt-3 flex flex-col items-center">
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="h-[60px] w-[140px] object-contain border rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">Preview (140×60)</p>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="edit_status" className="block mb-1 text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="edit_status"
                    value={editingBrand.status}
                    onChange={handleEditInputChange}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="inline-block bg-red-600 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition"
                >
                  Update Brand
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {/* {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Delete Brand</h2>
            <p className="mb-4">Are you sure you want to delete this Brand?</p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={() => handleDeleteBrand(brandToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )} */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Delete Brand</h2>
            <p className="mb-4">Are you sure you want to delete this Brand?</p>

            {/* Add this line to show product count */}
            <p className="text-sm text-red-500 mb-4">
              Note: This brand has {productCount} associated products.
              {productCount > 0 && " Deleting will remove these associations."}
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={() => handleDeleteBrand(brandToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Bulk Delete Brands</h2>
            <p className="mb-4">Are you sure you want to delete {selectedBrands.length} selected brand(s)?</p>
            <p className="text-sm text-gray-500 mb-6">
              Brands with associated products will be skipped automatically.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
                disabled={isDeletingBulk}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className={`bg-red-500 px-4 py-2 rounded-md text-white flex items-center justify-center min-w-[100px] ${isDeletingBulk ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isDeletingBulk}
              >
                {isDeletingBulk ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Status Update</h2>
            <div className="mb-6 whitespace-pre-wrap text-gray-700">
              {successMessage}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-red-500 px-4 py-2 rounded-md text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}