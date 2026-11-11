"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
export default function FlashSalePage() {
  const [flashSales, setFlashSales] = useState([]);
  const [newFlashSale, setNewFlashSale] = useState({
    background_image: null,
    banner_image: null,
    title: "",
    redirect_url: "",
    status: "Active",
  });
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [flashSaleToDelete, setFlashSaleToDelete] = useState(null);
  const [editingStates, setEditingStates] = useState({});

  // Fetch flash sales
  const fetchFlashSales = async () => {
    try {
      const res = await fetch("/api/flashsale");
      const data = await res.json();
      if (data.success) {
        setFlashSales(data.flashSales);
        // Initialize editing states
        const states = {};
        data.flashSales.forEach(flashSale => {
          states[flashSale._id] = {
            title: flashSale.title || "",
            redirect_url: flashSale.redirect_url || "",
            status: flashSale.status || "Active",
            background_image: null,
            banner_image: null,
            hasChanges: false
          };
        });
        setEditingStates(states);
      }
    } catch (err) {
      setError("Failed to fetch flash sales");
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, []);

  // Save new flash sale
  const handleSave = async () => {
    setError("");
    setImageError("");

    if (!newFlashSale.background_image || !newFlashSale.banner_image) {
      setImageError("Please choose both images.");
      return;
    }
    if (!newFlashSale.title || !newFlashSale.redirect_url) {
      setError("Title and redirect URL are required.");
      return;
    }

    const formData = new FormData();
    formData.append("background_image", newFlashSale.background_image);
    formData.append("banner_image", newFlashSale.banner_image);
    formData.append("title", newFlashSale.title);
    formData.append("redirect_url", newFlashSale.redirect_url);
    formData.append("status", newFlashSale.status);

    try {
      const res = await fetch("/api/flashsale", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setNewFlashSale({
          background_image: null,
          banner_image: null,
          title: "",
          redirect_url: "",
          status: "Active",
        });
        setShowAddForm(false);
        fetchFlashSales();
      } else {
        if (data.message.includes("pixels")) {
          setImageError(data.message);
        } else {
          setError(data.message || "Something went wrong.");
        }
      }
    } catch (err) {
      setError("Failed to save flash sale");
    }
  };

  // Update flash sale
  const handleUpdate = async (id, field, value) => {
    setError("");
    setImageError("");

    const formData = new FormData();
    formData.append("id", id);
    
    if (field === "background_image" || field === "banner_image") {
      formData.append(field, value);
    } else if (field === "title" || field === "redirect_url" || field === "status") {
      formData.append(field, value);
    }

    try {
      const res = await fetch("/api/flashsale", {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        // Reset the editing state for this field
        setEditingStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            [field]: field.includes("image") ? null : value,
            hasChanges: false
          }
        }));
        fetchFlashSales();
      } else {
        if (data.message.includes("pixels")) {
          setImageError(data.message);
        } else {
          setError(data.message || "Update failed.");
        }
      }
    } catch (err) {
      setError("Failed to update flash sale");
    }
  };

  // Handle input changes for existing flash sales
  const handleInputChange = (id, field, value) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        hasChanges: true
      }
    }));
  };

  // Open delete confirmation modal
  const openDeleteModal = (flashSale) => {
    setFlashSaleToDelete(flashSale);
    setShowDeleteModal(true);
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFlashSaleToDelete(null);
  };

  // Delete flash sale
  const handleDelete = async () => {
    if (!flashSaleToDelete) return;
    
    try {
      await fetch("/api/flashsale", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flashSaleToDelete._id }),
      });
      fetchFlashSales();
      closeDeleteModal();
    } catch (err) {
      setError("Failed to delete flash sale");
      closeDeleteModal();
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Flash Sale Manager</h2>
        <Link
                  href="/admin/homesettings"
                  className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 transition"
                >
                  <ArrowLeft size={18} /> Back
                </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto">
        {/* Global Error */}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Add New Flash Sale Section */}
        <div className="mb-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Flash Sale
            </button>
          ) : (
            <div className="border p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Flash Sale
              </h3>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Title"
                  value={newFlashSale.title}
                  onChange={(e) =>
                    setNewFlashSale({ ...newFlashSale, title: e.target.value })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              {/* Background Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Banner Background Image * (Size: 429x250)</label>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewFlashSale({ ...newFlashSale, background_image: e.target.files[0] })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              {/* Banner Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Banner Image * (Size: 260x240)</label>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewFlashSale({ ...newFlashSale, banner_image: e.target.files[0] })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              {/* Redirect URL */}
              <div>
                <label className="block text-sm font-medium mb-1">Redirect URL *</label>
                <input
                  type="text"
                  placeholder="Redirect URL"
                  value={newFlashSale.redirect_url}
                  onChange={(e) =>
                    setNewFlashSale({ ...newFlashSale, redirect_url: e.target.value })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </div>

              {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={newFlashSale.status}
                  onChange={(e) =>
                    setNewFlashSale({ ...newFlashSale, status: e.target.value })
                  }
                  className="border px-2 py-1 rounded w-full"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="bg-[#d72828] text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save
                </button>
                <button
                  onClick={() => {
                    setNewFlashSale({
                      background_image: null,
                      banner_image: null,
                      title: "",
                      redirect_url: "",
                      status: "Active",
                    });
                    setShowAddForm(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Flash Sales */}
        <div className="space-y-4">
          {flashSales.map((flashSale) => (
            <div
              key={flashSale._id}
              className="flex flex-col md:flex-row items-center gap-4 border p-4 rounded-lg"
            >
              {/* Background Image Section */}
              <div className="flex flex-col items-center">
                <img
                  src={flashSale.background_image}
                  alt="background"
                  className="w-48 h-28 object-cover rounded mb-2"
                />
                <label className="block text-sm font-medium mb-1">Background (429x250)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleInputChange(flashSale._id, "background_image", e.target.files[0]);
                    }
                  }}
                  className="border rounded w-40 text-sm px-2 py-1 mb-2"
                />
                <button
                  onClick={() =>
                    handleUpdate(flashSale._id, "background_image", editingStates[flashSale._id]?.background_image)
                  }
                  disabled={!editingStates[flashSale._id]?.background_image}
                  className={`p-2 rounded flex items-center ${
                    editingStates[flashSale._id]?.background_image
                      ? "bg-[#d72828] text-white hover:bg-[#d72828]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="Save Background Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Banner Image Section */}
              <div className="flex flex-col items-center">
                <img
                  src={flashSale.banner_image}
                  alt="banner"
                  className="w-48 h-28 object-cover rounded mb-2"
                />
                <label className="block text-sm font-medium mb-1">Banner (260x240)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleInputChange(flashSale._id, "banner_image", e.target.files[0]);
                    }
                  }}
                  className="border rounded w-40 text-sm px-2 py-1 mb-2"
                />
                <button
                  onClick={() =>
                    handleUpdate(flashSale._id, "banner_image", editingStates[flashSale._id]?.banner_image)
                  }
                  disabled={!editingStates[flashSale._id]?.banner_image}
                  className={`p-2 rounded flex items-center ${
                    editingStates[flashSale._id]?.banner_image
                      ? "bg-[#d72828] text-white hover:bg-[#d72828]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="Save Banner Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <div className="flex flex-col md:flex-row gap-2 items-center flex-grow">
                <input
                  type="text"
                  value={editingStates[flashSale._id]?.title || flashSale.title || ""}
                  onChange={(e) => 
                    handleInputChange(flashSale._id, "title", e.target.value)
                  }
                  className="border px-2 py-1 rounded flex-grow"
                  placeholder="Title"
                />
                <button
                  onClick={() => 
                    handleUpdate(flashSale._id, "title", editingStates[flashSale._id]?.title)
                  }
                  disabled={!editingStates[flashSale._id]?.hasChanges}
                  className={`p-2 rounded flex items-center ${
                    editingStates[flashSale._id]?.hasChanges 
                      ? "bg-[#d72828] text-white hover:bg-[#d72828]" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="Save Title"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* URL Input */}
              <div className="flex flex-col md:flex-row gap-2 items-center flex-grow">
                <input
                  type="text"
                  value={editingStates[flashSale._id]?.redirect_url || flashSale.redirect_url || ""}
                  onChange={(e) => 
                    handleInputChange(flashSale._id, "redirect_url", e.target.value)
                  }
                  className="border px-2 py-1 rounded flex-grow"
                  placeholder="Redirect URL"
                />
                <button
                  onClick={() => 
                    handleUpdate(flashSale._id, "redirect_url", editingStates[flashSale._id]?.redirect_url)
                  }
                  disabled={!editingStates[flashSale._id]?.hasChanges}
                  className={`p-2 rounded flex items-center ${
                    editingStates[flashSale._id]?.hasChanges 
                      ? "bg-[#d72828] text-white hover:bg-[#d72828]" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="Save URL"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Status */}
              <div className="flex flex-col md:flex-row gap-2 items-center">
                <select
                  value={editingStates[flashSale._id]?.status || flashSale.status || "Active"}
                  onChange={(e) => 
                    handleInputChange(flashSale._id, "status", e.target.value)
                  }
                  className="border px-2 py-1 rounded"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button
                  onClick={() => 
                    handleUpdate(flashSale._id, "status", editingStates[flashSale._id]?.status)
                  }
                  disabled={!editingStates[flashSale._id]?.hasChanges}
                  className={`p-2 rounded flex items-center ${
                    editingStates[flashSale._id]?.hasChanges 
                      ? "bg-[#d72828] text-white hover:bg-[#d72828]" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="Save Status"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => openDeleteModal(flashSale)}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center"
                title="Delete Flash Sale"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this flash sale?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
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