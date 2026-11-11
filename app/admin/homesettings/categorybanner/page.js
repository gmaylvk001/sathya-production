"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
export default function CategoryBannerPage() {
  const [categoryBanners, setCategoryBanners] = useState(null);
  const [bannerData, setBannerData] = useState({
    banners: Array(4).fill({ banner_image: "", redirect_url: "" }),
    status: "Active"
  });
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState(Array(4).fill(""));
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch category banners
  const fetchCategoryBanners = async () => {
    try {
      const res = await fetch("/api/categorybanner");
      const data = await res.json();
      if (data.success) {
        setCategoryBanners(data.categoryBanners);
        if (data.categoryBanners) {
          setBannerData({
            banners: data.categoryBanners.banners,
            status: data.categoryBanners.status
          });
        }
      }
    } catch (err) {
      setError("Failed to fetch category banners");
    }
  };

  useEffect(() => {
    fetchCategoryBanners();
  }, []);

  // Handle input changes
  const handleInputChange = (index, field, value) => {
    setBannerData(prev => {
      const newBanners = [...prev.banners];
      newBanners[index] = {
        ...newBanners[index],
        [field]: value
      };
      
      // Clear error for this image when changed
      if (field === "banner_image") {
        const newErrors = [...imageErrors];
        newErrors[index] = "";
        setImageErrors(newErrors);
      }
      
      return {
        ...prev,
        banners: newBanners
      };
    });
  };

  // Handle status change
  const handleStatusChange = (value) => {
    setBannerData(prev => ({
      ...prev,
      status: value
    }));
  };

  // Save category banners
  const handleSave = async () => {
    setError("");
    
    // Validate all banners have URLs
    for (let i = 0; i < 4; i++) {
      if (!bannerData.banners[i]?.redirect_url) {
        setError(`Redirect URL for Banner ${i+1} is required`);
        return;
      }
    }

    const formData = new FormData();
    
    // Add all banners to form data
    for (let i = 0; i < 4; i++) {
      if (bannerData.banners[i]?.banner_image instanceof File) {
        formData.append(`banner_image_${i+1}`, bannerData.banners[i].banner_image);
      }
      formData.append(`redirect_url_${i+1}`, bannerData.banners[i]?.redirect_url || "");
    }
    
    formData.append("status", bannerData.status);

    try {
      const res = await fetch("/api/categorybanner", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCategoryBanners(data.categoryBanners);
        // Update banner data with the saved data (to get proper image paths)
        setBannerData({
          banners: data.categoryBanners.banners,
          status: data.categoryBanners.status
        });
        
        // Clear any image errors
        setImageErrors(Array(4).fill(""));
      } else {
        // Check if it's an image dimension error
        if (data.message && data.message.includes("801x704")) {
          // Try to find which image caused the error
          const newErrors = Array(4).fill("");
          for (let i = 0; i < 4; i++) {
            if (bannerData.banners[i]?.banner_image instanceof File) {
              newErrors[i] = data.message;
            }
          }
          setImageErrors(newErrors);
        } else {
          setError(data.message || "Something went wrong.");
        }
      }
    } catch (err) {
      setError("Failed to save category banners");
    }
  };

  // Delete category banners
  const handleDelete = async () => {
    try {
      const res = await fetch("/api/categorybanner", {
        method: "DELETE",
      });
      
      const data = await res.json();
      if (data.success) {
        setCategoryBanners(null);
        setBannerData({
          banners: Array(4).fill({ banner_image: "", redirect_url: "" }),
          status: "Active"
        });
        closeDeleteModal();
      } else {
        setError(data.message || "Failed to delete category banners");
        closeDeleteModal();
      }
    } catch (err) {
      setError("Failed to delete category banners");
      closeDeleteModal();
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Category Banner Manager</h2>
        <Link
                  href="/admin/homesettings"
                  className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                >
                  <ArrowLeft size={18} /> Back
                </Link>
      
      </div>

      <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Banner Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">Banner {index + 1}</h3>
              
              {/* Image Preview */}
              {(bannerData.banners[index]?.banner_image || 
                (bannerData.banners[index]?.banner_image instanceof File)) && (
                <div className="mb-3">
                  <img
                    src={
                      bannerData.banners[index].banner_image instanceof File
                        ? URL.createObjectURL(bannerData.banners[index].banner_image)
                        : bannerData.banners[index].banner_image
                    }
                    alt={`Banner ${index + 1}`}
                    className="w-40 h-40 object-cover rounded mx-auto"
                  />
                </div>
              )}
              
              {/* File Input */}
              <div className="mb-3">
                <input
                  type="file"
                  onChange={(e) =>
                    handleInputChange(index, "banner_image", e.target.files[0])
                  }
                  className="border px-2 py-1 rounded w-full"
                />
                {imageErrors[index] && (
                  <p className="text-red-500 text-sm mt-1">{imageErrors[index]}</p>
                )}
                {bannerData.banners[index]?.banner_image && 
                 !(bannerData.banners[index].banner_image instanceof File) && (
                  <p className="text-green-500 text-sm mt-1">Image already uploaded</p>
                )}
              </div>
              
              {/* URL Input */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Redirect URL"
                  value={bannerData.banners[index]?.redirect_url || ""}
                  onChange={(e) =>
                    handleInputChange(index, "redirect_url", e.target.value)
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Status Selector */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Status</label>
          <select
            value={bannerData.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Save Button */}
         <div className="flex items-center gap-3">
    <button
      onClick={handleSave}
      className="bg-[#d72828] text-white px-4 py-2 rounded"
    >
      {categoryBanners ? "Update Banners" : "Save Banners"}
    </button>

    {categoryBanners && (
      <button
        onClick={openDeleteModal}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Delete All Banners
      </button>
    )}
  </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete all category banners?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded"
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