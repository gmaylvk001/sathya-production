"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const formatDateTimeForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getBannerTimerStatus = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return { label: "Always Active", color: "bg-gray-100 text-gray-700 border-gray-200" };
  }
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && now < start) {
    return {
      label: `Upcoming (Starts ${start.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-amber-50 text-amber-800 border-amber-300 font-medium"
    };
  }
  if (end && now > end) {
    return {
      label: `Expired (${end.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-red-50 text-red-700 border-red-300 font-medium"
    };
  }
  if (end) {
    return {
      label: `Live (Ends ${end.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium"
    };
  }
  return { label: "Live (No expiry)", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium" };
};

export default function TopBannerPage() {
  const [banners, setBanners] = useState([]);
  const [selectedFilterRegion, setSelectedFilterRegion] = useState("all");
  const [newBanner, setNewBanner] = useState({
    banner_image: null,
    redirect_url: "",
    state: "all",
    status: "Active",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [editingStates, setEditingStates] = useState({});

  // Fetch banners
  const fetchBanners = async (filterRegion = selectedFilterRegion) => {
    try {
      const url = filterRegion && filterRegion !== "all" 
        ? `/api/topbanner?admin=true&state=${filterRegion}` 
        : `/api/topbanner?admin=true`;
      const res = await fetch(url, {
        headers: { "x-admin-auth": "true" },
      });
      const data = await res.json();
      if (data.success) {
        setBanners(data.banners);
        const states = {};
        data.banners.forEach((banner) => {
          states[banner._id] = {
            redirect_url: banner.redirect_url || "",
            state: banner.state || "all",
            status: banner.status || "Active",
            startDate: banner.startDate ? formatDateTimeForInput(banner.startDate) : "",
            endDate: banner.endDate ? formatDateTimeForInput(banner.endDate) : "",
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
  }, [selectedFilterRegion]);

  // Save new banner
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
    formData.append("state", newBanner.state || "all");
    formData.append("status", newBanner.status);
    if (newBanner.startDate) formData.append("startDate", newBanner.startDate);
    if (newBanner.endDate) formData.append("endDate", newBanner.endDate);

    try {
      const res = await fetch("/api/topbanner", {
        method: "POST",
        headers: { "x-admin-auth": "true" },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setNewBanner({
          banner_image: null,
          redirect_url: "",
          state: "all",
          status: "Active",
          startDate: "",
          endDate: "",
        });
        setShowAddForm(false);
        fetchBanners();
      } else {
        if (data.message && data.message.includes("1920x550")) {
          setImageError(data.message);
        } else {
          setError(data.message || "Something went wrong.");
        }
      }
    } catch (err) {
      setError("Failed to save banner");
    }
  };

  // Update banner
  const handleUpdate = async (id, field, value) => {
    setError("");
    setImageError("");

    const formData = new FormData();
    formData.append("id", id);

    if (field === "all") {
      const stateData = editingStates[id];
      if (!stateData) return;
      formData.append("redirect_url", stateData.redirect_url || "");
      formData.append("state", stateData.state || "all");
      formData.append("status", stateData.status || "Active");
      formData.append("startDate", stateData.startDate || "");
      formData.append("endDate", stateData.endDate || "");
      if (stateData.banner_image) {
        formData.append("banner_image", stateData.banner_image);
      }
    } else if (field === "banner_image") {
      formData.append("banner_image", value);
    } else if (field === "redirect_url") {
      formData.append("redirect_url", value);
    } else if (field === "status") {
      formData.append("status", value);
    } else if (field === "state") {
      formData.append("state", value);
    } else if (field === "startDate") {
      formData.append("startDate", value || "");
    } else if (field === "endDate") {
      formData.append("endDate", value || "");
    }

    try {
      const res = await fetch("/api/topbanner", {
        method: "PUT",
        headers: { "x-admin-auth": "true" },
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
        if (data.message && data.message.includes("1920x550")) {
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

  // Delete banner
  const handleDelete = async () => {
    if (!bannerToDelete) return;

    try {
      await fetch("/api/topbanner", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": "true",
        },
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
      const res = await fetch("/api/topbanner", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": "true",
        },
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
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Top Banner Manager</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage state-wise & global homepage top banners</p>
        </div>
        <Link
          href="/admin/homesettings"
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
        >
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-xl p-4 sm:p-6 space-y-6">
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

        {/* Region Filter Bar */}
        <div className="bg-gray-50 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <label className="text-sm font-bold text-gray-700">Filter Banners by Region:</label>
          </div>
          <select
            value={selectedFilterRegion}
            onChange={(e) => setSelectedFilterRegion(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm font-medium bg-white text-gray-800"
          >
            <option value="all">All Regions Banners</option>
            <option value="karnataka">Karnataka</option>
            <option value="tamilnadu">Tamil Nadu</option>
            <option value="andhra">Andhra Pradesh</option>
            <option value="kerala">Kerala</option>
            <option value="telangana">Telangana</option>
          </select>
        </div>

        {/* Add New Banner */}
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-semibold text-sm shadow-sm"
            >
              + Add New Banner
            </button>
          ) : (
            <div className="border border-green-200 bg-green-50/50 p-4 sm:p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Add New Top Banner</h3>

              <div>
                <p className="text-gray-500 text-xs sm:text-sm mb-1.5">
                  Recommended Size: <span className="font-semibold text-gray-700">2000 × 667 px</span>
                </p>
                <input
                  type="file"
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, banner_image: e.target.files[0] })
                  }
                  className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                />
                {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Redirect URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/offer"
                  value={newBanner.redirect_url}
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, redirect_url: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Region / State</label>
                  <select
                    value={newBanner.state || "all"}
                    onChange={(e) =>
                      setNewBanner({ ...newBanner, state: e.target.value })
                    }
                    className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                  >
                    <option value="all">All Regions (Global Fallback)</option>
                    <option value="karnataka">Karnataka</option>
                    <option value="tamilnadu">Tamil Nadu</option>
                    <option value="andhra">Andhra Pradesh</option>
                    <option value="kerala">Kerala</option>
                    <option value="telangana">Telangana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={newBanner.status}
                    onChange={(e) =>
                      setNewBanner({ ...newBanner, status: e.target.value })
                    }
                    className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Timer / Schedule Settings */}
              <div className="border-t border-green-200/80 pt-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">⏰</span>
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Banner Timer / Schedule (Optional)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Set start and end date/time to show this banner only within that period. Leave blank to show always.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date & Time (Show From)
                    </label>
                    <input
                      type="datetime-local"
                      value={newBanner.startDate || ""}
                      onChange={(e) =>
                        setNewBanner({ ...newBanner, startDate: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date & Time (Hide After)
                    </label>
                    <input
                      type="datetime-local"
                      value={newBanner.endDate || ""}
                      onChange={(e) =>
                        setNewBanner({ ...newBanner, endDate: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="bg-[#d72828] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                  Save Banner
                </button>
                <button
                  onClick={() => {
                    setNewBanner({
                      banner_image: null,
                      redirect_url: "",
                      state: "all",
                      status: "Active",
                      startDate: "",
                      endDate: "",
                    });
                    setShowAddForm(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition"
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
                {banners.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No banners found for selected filter.</p>
                ) : (
                  banners.map((banner, index) => (
                    <Draggable key={banner._id} draggableId={banner._id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="flex flex-col lg:flex-row items-start lg:items-center gap-4 border p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition"
                        >
                          <img
                            src={banner.banner_image}
                            alt="banner"
                            className="w-full lg:w-48 h-32 lg:h-20 object-cover rounded-lg border bg-gray-50"
                          />

                          {/* URL Input */}
                          <div className="w-full lg:flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 lg:hidden">Redirect URL</label>
                            <input
                              type="text"
                              value={editingStates[banner._id]?.redirect_url || ""}
                              onChange={(e) =>
                                handleInputChange(banner._id, "redirect_url", e.target.value)
                              }
                              className="border px-3 py-1.5 rounded-lg w-full text-sm"
                            />
                          </div>

                          {/* Region Select */}
                          <div className="w-full lg:w-44">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 lg:hidden">Region</label>
                            <select
                              value={editingStates[banner._id]?.state || "all"}
                              onChange={(e) => {
                                handleInputChange(banner._id, "state", e.target.value);
                                handleUpdate(banner._id, "state", e.target.value);
                              }}
                              className="w-full border px-3 py-1.5 rounded-lg text-sm bg-amber-50 border-amber-300 font-medium text-amber-900"
                            >
                              <option value="all">All Regions</option>
                              <option value="karnataka">Karnataka</option>
                              <option value="tamilnadu">Tamil Nadu</option>
                              <option value="andhra">Andhra Pradesh</option>
                              <option value="kerala">Kerala</option>
                              <option value="telangana">Telangana</option>
                            </select>
                          </div>

                          {/* Status */}
                          <div className="w-full lg:w-36 flex items-center gap-2">
                            <select
                              value={editingStates[banner._id]?.status || "Active"}
                              onChange={(e) =>
                                handleInputChange(banner._id, "status", e.target.value)
                              }
                              className="border px-3 py-1.5 rounded-lg text-sm flex-1"
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
                              className={`p-2 rounded-lg text-xs font-bold ${
                                editingStates[banner._id]?.hasChanges
                                  ? "bg-[#d72828] text-white hover:bg-red-700"
                                  : "bg-gray-200 text-gray-400"
                              }`}
                            >
                              ✔
                            </button>
                          </div>

                          {/* Update Image & Delete Actions */}
                          <div className="w-full lg:w-auto flex items-center gap-2 justify-between lg:justify-end border-t lg:border-0 pt-2 lg:pt-0">
                            <div className="flex items-center gap-2">
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
                                className="border rounded-lg text-xs px-2 py-1 max-w-[140px]"
                              />
                              <button
                                onClick={() =>
                                  handleUpdate(
                                    banner._id,
                                    "banner_image",
                                    editingStates[banner._id]?.banner_image
                                  )
                                }
                                disabled={!editingStates[banner._id]?.banner_image}
                                className={`p-2 rounded-lg text-xs font-bold ${
                                  editingStates[banner._id]?.banner_image
                                    ? "bg-[#d72828] text-white hover:bg-red-700"
                                    : "bg-gray-200 text-gray-400"
                                }`}
                              >
                                ✔
                              </button>
                            </div>

                            <button
                              onClick={() => openDeleteModal(banner)}
                              className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
                              title="Delete banner"
                            >
                              🗑
                            </button>
                          </div>

                        {/* Schedule / Timer Row */}
                        <div className="w-full pt-2.5 mt-2 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/70 p-2.5 rounded-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                              <span>⏰</span> Timer / Schedule:
                            </span>
                            {(() => {
                              const statusBadge = getBannerTimerStatus(
                                editingStates[banner._id]?.startDate,
                                editingStates[banner._id]?.endDate
                              );
                              return (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">From:</span>
                              <input
                                type="datetime-local"
                                value={editingStates[banner._id]?.startDate || ""}
                                onChange={(e) =>
                                  handleInputChange(banner._id, "startDate", e.target.value)
                                }
                                className="border px-2 py-1 rounded text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">To:</span>
                              <input
                                type="datetime-local"
                                value={editingStates[banner._id]?.endDate || ""}
                                onChange={(e) =>
                                  handleInputChange(banner._id, "endDate", e.target.value)
                                }
                                className="border px-2 py-1 rounded text-xs bg-white text-gray-700 focus:ring-1 focus:ring-red-400"
                              />
                            </div>

                            {(editingStates[banner._id]?.startDate || editingStates[banner._id]?.endDate) && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleInputChange(banner._id, "startDate", "");
                                  handleInputChange(banner._id, "endDate", "");
                                }}
                                title="Clear Timer (Always Active)"
                                className="text-[11px] text-gray-500 hover:text-red-600 underline px-1"
                              >
                                Clear
                              </button>
                            )}

                            <button
                              onClick={() => handleUpdate(banner._id, "all")}
                              disabled={!editingStates[banner._id]?.hasChanges}
                              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                editingStates[banner._id]?.hasChanges
                                  ? "bg-[#d72828] text-white hover:bg-red-700 shadow-sm cursor-pointer"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                  ))
                )}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this top banner?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
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
