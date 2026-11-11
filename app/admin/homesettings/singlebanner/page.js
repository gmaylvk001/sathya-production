"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function SingleBannerPage() {
  const [banners, setBanners] = useState([]);
  const [newBanner, setNewBanner] = useState({
    banner_image: null,
    redirect_url: "",
    status: "Active",
  });
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [editingStates, setEditingStates] = useState({});

  // ✅ Fetch banners
  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/singlebanner");
      const data = await res.json();
      if (data.success) {
        setBanners(data.banners);
        const states = {};
        data.banners.forEach((banner) => {
          states[banner._id] = {
            redirect_url: banner.redirect_url || "",
            status: banner.status || "Active",
            banner_image: null,
            hasChanges: false,
            error: "",
          };
        });
        setEditingStates(states);
      }
    } catch (err) {
      setError("Failed to fetch banners");
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // ✅ Save new banner
  const handleSave = async () => {
    setError("");
    setImageError("");

    if (!newBanner.banner_image) {
      setImageError("Please choose an image.");
      return;
    }
    if (!newBanner.redirect_url) {
      setError("Redirect URL is required.");
      return;
    }

    const formData = new FormData();
    formData.append("banner_image", newBanner.banner_image);
    formData.append("redirect_url", newBanner.redirect_url);
    formData.append("status", newBanner.status);

    try {
      const res = await fetch("/api/singlebanner", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setNewBanner({ banner_image: null, redirect_url: "", status: "Active" });
        setShowAddForm(false);
        fetchBanners();
      } else {
        if (data.message.includes("1900x400")) {
          setImageError(data.message);
        } else {
          setError(data.message || "Something went wrong.");
        }
      }
    } catch (err) {
      setError("Failed to save banner");
    }
  };

  // ✅ Update banner
  const handleUpdate = async (id, field, value) => {
    setError("");
    setImageError("");

    const formData = new FormData();
    formData.append("id", id);

    if (field === "banner_image") {
      formData.append("banner_image", value);
    } else if (field === "redirect_url") {
      formData.append("redirect_url", value);
    } else if (field === "status") {
      formData.append("status", value);
    }

    try {
      const res = await fetch("/api/singlebanner", {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setEditingStates((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            [field]: field === "banner_image" ? null : value,
            hasChanges: false,
            error: "",
          },
        }));
        fetchBanners();
      } else {
        if (data.message.includes("1900x400")) {
          setEditingStates((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              error: data.message,
            },
          }));
        } else {
          setError(data.message || "Update failed.");
        }
      }
    } catch (err) {
      setError("Failed to update banner");
    }
  };

  const handleInputChange = (id, field, value) => {
    setEditingStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        hasChanges: true,
        error: "",
      },
    }));
  };

  // ✅ Delete banner
  const handleDelete = async () => {
    if (!bannerToDelete) return;

    try {
      await fetch("/api/singlebanner", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bannerToDelete._id }),
      });
      fetchBanners();
      closeDeleteModal();
    } catch (err) {
      setError("Failed to delete banner");
      closeDeleteModal();
    }
  };

  const openDeleteModal = (banner) => {
    setBannerToDelete(banner);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setBannerToDelete(null);
  };

  const onDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const prev = banners;
    const reordered = Array.from(banners);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    const reorderedWithOrder = reordered.map((b, i) => ({ ...b, order: i + 1 }));
    setBanners(reorderedWithOrder);

    const orderedIds = reordered.map((b) => b._id);
    try {
      const res = await fetch("/api/singlebanner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        setError("Failed to update order");
        setBanners(prev);
        fetchBanners();
      }
    } catch {
      setError("Failed to update order");
      setBanners(prev);
      fetchBanners();
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Single Banner Manager</h2>
        <Link
          href="/admin/homesettings"
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Add New Banner */}
        <div className="mb-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              + Add New Banner
            </button>
          ) : (
            <div className="border p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-lg">Add New Banner</h3>

              <div>
                <p className="text-gray-500 text-sm mb-2">
                  Banner size: <span className="font-semibold">1900 × 400 px</span>
                </p>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, banner_image: e.target.files[0] })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
                {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Redirect URL"
                  value={newBanner.redirect_url}
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, redirect_url: e.target.value })
                  }
                  className="border px-2 py-1 rounded w-full"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>

              <select
                value={newBanner.status}
                onChange={(e) =>
                  setNewBanner({ ...newBanner, status: e.target.value })
                }
                className="border px-2 py-1 rounded w-full"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="bg-[#d72828] text-white px-4 py-2 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setNewBanner({ banner_image: null, redirect_url: "", status: "Active" });
                    setShowAddForm(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Banners */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="banners">
            {(dropProvided) => (
              <div
                className="space-y-4"
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
              >
                {banners.map((banner, index) => (
                  <Draggable key={banner._id} draggableId={banner._id} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="flex flex-col md:flex-row items-center gap-4 border p-4 rounded-lg"
                      >
                        <img
                          src={banner.banner_image}
                          alt="banner"
                          className="w-48 h-20 object-cover rounded"
                        />

                        {/* Redirect URL */}
                        <div className="flex flex-col md:flex-row gap-2 items-center flex-grow">
                          <input
                            type="text"
                            value={editingStates[banner._id]?.redirect_url || ""}
                            onChange={(e) =>
                              handleInputChange(banner._id, "redirect_url", e.target.value)
                            }
                            className="border px-2 py-1 rounded flex-grow"
                          />
                          <button
                            onClick={() =>
                              handleUpdate(
                                banner._id,
                                "redirect_url",
                                editingStates[banner._id]?.redirect_url
                              )
                            }
                            disabled={!editingStates[banner._id]?.hasChanges}
                            className={`p-2 rounded ${
                              editingStates[banner._id]?.hasChanges
                                ? "bg-[#d72828] text-white"
                                : "bg-gray-300 text-gray-500"
                            }`}
                          >
                            ✔
                          </button>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col md:flex-row gap-2 items-center">
                          <select
                            value={editingStates[banner._id]?.status || "Active"}
                            onChange={(e) =>
                              handleInputChange(banner._id, "status", e.target.value)
                            }
                            className="border px-2 py-1 rounded"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          <button
                            onClick={() =>
                              handleUpdate(
                                banner._id,
                                "status",
                                editingStates[banner._id]?.status
                              )
                            }
                            disabled={!editingStates[banner._id]?.hasChanges}
                            className={`p-2 rounded ${
                              editingStates[banner._id]?.hasChanges
                                ? "bg-[#d72828] text-white"
                                : "bg-gray-300 text-gray-500"
                            }`}
                          >
                            ✔
                          </button>
                        </div>

                        {/* Update Image */}
                        <div className="flex flex-col md:flex-row gap-2 items-center">
                          <div className="flex flex-col">
                            <input
                              type="file"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handleInputChange(
                                    banner._id,
                                    "banner_image",
                                    e.target.files[0]
                                  );
                                }
                              }}
                              className="border rounded w-40 text-sm px-2 py-1"
                            />
                            {editingStates[banner._id]?.error && (
                              <p className="text-red-500 text-sm mt-1">
                                {editingStates[banner._id].error}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              handleUpdate(
                                banner._id,
                                "banner_image",
                                editingStates[banner._id]?.banner_image
                              )
                            }
                            disabled={!editingStates[banner._id]?.banner_image}
                            className={`p-2 rounded ${
                              editingStates[banner._id]?.banner_image
                                ? "bg-[#d72828] text-white"
                                : "bg-gray-300 text-gray-500"
                            }`}
                          >
                            ✔
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => openDeleteModal(banner)}
                          className="bg-red-500 text-white p-2 rounded"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this banner?</p>
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
