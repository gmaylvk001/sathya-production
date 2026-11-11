"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEdit } from "react-icons/fa";
import { Icon } from "@iconify/react";
import Image from "next/image";
import CardOffersExcelUploadModal from "./CardOffersExcelUploadModal";

function formatDisplayDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  const pad = (n) => String(n).padStart(2, "0");
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function toInputDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CardOffersView({ timerId }) {
  const router = useRouter();
  const [timer, setTimer] = useState(null);
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);

  // Sub-modal states for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    endDate: "",
    state: "tamilnadu",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deletion modals
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Fetch timer and its card offers
  const fetchCardOffers = async () => {
    if (!timerId) return;
    try {
      const res = await fetch(`/api/offer-timer/card-offer?timerId=${timerId}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setOffers(result.data || []);
        if (result.timer) {
          setTimer(result.timer);
        }
      } else {
        setErrorMessage(result.error || "Failed to load card offers");
      }
    } catch (err) {
      console.error("Error fetching card offers:", err);
      setErrorMessage("Failed to load card offers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCardOffers();
  }, [timerId]);

  const timerDisplayId = timer?.timerId ?? timer?.custom_id ?? timerId ?? 1;

  // Master checkbox selection
  const isAllSelected = offers.length > 0 && selectedIds.length === offers.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(offers.map((o) => o.id ?? o.Id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormData({
      title: "",
      startDate: toInputDate(timer?.startDate) || toInputDate(new Date()),
      endDate: toInputDate(timer?.endDate) || toInputDate(new Date(Date.now() + 30 * 86400000)),
      state: timer?.state && timer?.state !== "all" ? timer.state : "tamilnadu",
    });
    setImageFile(null);
    setImagePreview(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title || "",
      startDate: toInputDate(offer.startDate),
      endDate: toInputDate(offer.endDate),
      state: offer.state || "tamilnadu",
    });
    setImageFile(null);
    setImagePreview(offer.image || null);
    setIsFormOpen(true);
  };

  // Handle Form Image Change
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Save Card Offer (Add or Edit)
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const data = new FormData();
      data.append("timerId", timerId);
      data.append("title", formData.title.trim());
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("state", formData.state);

      if (imageFile) {
        data.append("image", imageFile);
      }

      let res;
      if (editingOffer) {
        data.append("cardOfferId", editingOffer.id);
        res = await fetch("/api/offer-timer/card-offer", {
          method: "PUT",
          body: data,
        });
      } else {
        res = await fetch("/api/offer-timer/card-offer", {
          method: "POST",
          body: data,
        });
      }

      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage(editingOffer ? "Card offer updated successfully" : "Card offer added successfully");
        setIsFormOpen(false);
        fetchCardOffers();
      } else {
        setErrorMessage(result.error || "Failed to save card offer");
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage("Failed to save card offer");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(""), 2500);
    }
  };

  // Delete Single Offer
  const handleConfirmDeleteSingle = async () => {
    if (!offerToDelete) return;
    const targetId = offerToDelete.id ?? offerToDelete.Id;
    try {
      const res = await fetch("/api/offer-timer/card-offer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timerId,
          cardOfferId: targetId,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage(result.message || "Card offer and image file deleted successfully");
        fetchCardOffers();
        setSelectedIds((prev) => prev.filter((id) => id !== targetId));
      } else {
        alert(result.error || "Failed to delete card offer");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete card offer");
    } finally {
      setOfferToDelete(null);
      setTimeout(() => setSuccessMessage(""), 2500);
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/offer-timer/card-offer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timerId,
          cardOfferIds: selectedIds,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage(result.message || `Bulk deleted ${selectedIds.length} card offers successfully`);
        setSelectedIds([]);
        fetchCardOffers();
      } else {
        alert(result.error || "Failed to bulk delete card offers");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("Failed to bulk delete card offers");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  return (
    <div className="container mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center mb-5 mt-5 gap-3">
        <div>
          <h2 className="text-3xl font-light text-gray-700">Card Offers</h2>
          {timer && (
            <p className="text-sm text-gray-500 mt-1">
              Offer Timer: <span className="font-semibold text-gray-700">{timer.offerTitle}</span> (OfferTimerID: {timerDisplayId})
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/offer-timer")}
            className="border px-3.5 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer"
          >
            <Icon icon="ic:baseline-arrow-back" className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setIsExcelUploadOpen(true)}
            className="border border-gray-700 bg-white text-gray-800 hover:bg-gray-50 px-3.5 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Icon icon="mdi:file-excel-outline" className="w-4 h-4 text-green-700" />
            <span>Excel / CSV upload</span>
          </button>
        </div>
      </div>

      {/* Offer Timer Summary Details Bar matching Reference Image */}
      <div className="bg-white border border-gray-200 rounded-lg p-3.5 mb-5 shadow-xs">
        <div className="flex flex-wrap items-center text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-800">Offer Title:</span>&nbsp;
          <span className="text-gray-600">{timer?.offerTitle || timer?.offer_title || "-"}</span>

          <span className="text-gray-300 mx-3 font-light select-none">|</span>

          <span className="font-semibold text-gray-800">State:</span>&nbsp;
          <span className="text-gray-600">
            {timer?.state === "selected" && timer?.offerViewStates?.length
              ? timer.offerViewStates.join(", ")
              : timer?.state || "all"}
          </span>

          <span className="text-gray-300 mx-3 font-light select-none">|</span>

          <span className="font-semibold text-gray-800">Start:</span>&nbsp;
          <span className="text-gray-600">
            {timer?.startDate && !Number.isNaN(new Date(timer.startDate).getTime())
              ? formatDisplayDate(timer.startDate)
              : ""}
          </span>

          <span className="text-gray-300 mx-3 font-light select-none">|</span>

          <span className="font-semibold text-gray-800">End:</span>&nbsp;
          <span className="text-gray-600">
            {timer?.endDate && !Number.isNaN(new Date(timer.endDate).getTime())
              ? formatDisplayDate(timer.endDate)
              : ""}
          </span>

          <span className="text-gray-300 mx-3 font-light select-none">|</span>

          <span className="font-semibold text-gray-800">Status:</span>&nbsp;
          <span className="text-gray-600 capitalize">{timer?.status || "active"}</span>

          <span className="text-gray-300 mx-3 font-light select-none">|</span>

          <span className="font-semibold text-gray-800">Total Cards:</span>&nbsp;
          <span className="text-gray-600 font-medium">{offers.length}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-5">
        {/* Top Actions matching Image 1: Bulk Delete & Total Card Offers badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {/* Bulk Delete Button matching Image 1 */}
            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert("Please select at least one card offer to delete.");
                  return;
                }
                setShowBulkDeleteConfirm(true);
              }}
              disabled={selectedIds.length === 0}
              className="bg-[#d9534f] hover:bg-[#c9302c] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded shadow-sm text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Icon icon="mingcute:delete-2-line" className="w-4 h-4" />
              Bulk Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>

            {/* Total Card Offers Badge matching Image 1 */}
            <div className="bg-[#48bcd6] text-white px-3.5 py-1.5 rounded shadow-sm text-sm font-medium">
              Total Card Offers: {offers.length}
            </div>
          </div>

          {/* Add Card Offer Button */}
          <button
            onClick={handleOpenCreate}
            className="border border-green-600 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Icon icon="ic:baseline-add" className="w-4 h-4" />
            <span>Add Card Offer</span>
          </button>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded text-sm flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded text-sm flex items-center gap-2">
            <Icon icon="solar:danger-circle-bold" className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Data Table matching Image 1 */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 select-none">
                <th className="p-3 w-12 text-center">
                  <label className="inline-flex items-center gap-1 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-gray-600">All</span>
                  </label>
                </th>
                <th className="p-3 font-semibold text-center w-14">S.No</th>
                <th className="p-3 font-semibold w-16">Id</th>
                <th className="p-3 font-semibold">Title</th>
                <th className="p-3 font-semibold text-center w-36">Image</th>
                <th className="p-3 font-semibold text-center w-28">OfferTimerID</th>
                <th className="p-3 font-semibold w-32">Start Date</th>
                <th className="p-3 font-semibold w-32">End Date</th>
                <th className="p-3 font-semibold w-28">State</th>
                <th className="p-3 font-semibold text-center w-36">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500">
                    Loading card offers...
                  </td>
                </tr>
              ) : offers.length > 0 ? (
                offers.map((offer, index) => {
                  const offerKeyId = offer.id ?? offer.Id;
                  const isChecked = selectedIds.includes(offerKeyId);
                  return (
                    <tr
                      key={offerKeyId || index}
                      className={`border-b hover:bg-gray-50/80 transition-colors ${
                        isChecked ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(offerKeyId)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {/* S.No */}
                      <td className="p-3 text-center text-gray-600">{index + 1}</td>
                      {/* Id */}
                      <td className="p-3 font-mono text-gray-800 font-medium">{offer.id || offer.Id || "-"}</td>
                      {/* Title */}
                      <td className="p-3 text-gray-800 font-medium">{offer.title}</td>
                      {/* Image Preview */}
                      <td className="p-3 text-center">
                        {offer.image ? (
                          <div className="relative inline-block w-24 h-12">
                            <Image
                              src={offer.image.startsWith("/") ? offer.image : `/uploads/cardoffers/${offer.image}`}
                              alt={offer.title}
                              fill
                              sizes="96px"
                              className="object-contain mx-auto"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No image</span>
                        )}
                      </td>
                      {/* OfferTimerID */}
                      <td className="p-3 text-center font-mono text-gray-700">
                        {offer.OfferTimerID || offer.offerTimerId || timerDisplayId}
                      </td>
                      {/* Start Date */}
                      <td className="p-3 text-gray-700 whitespace-nowrap">
                        {formatDisplayDate(offer.startDate)}
                      </td>
                      {/* End Date */}
                      <td className="p-3 text-gray-700 whitespace-nowrap">
                        {formatDisplayDate(offer.endDate)}
                      </td>
                      {/* State */}
                      <td className="p-3 text-gray-700 capitalize">
                        {offer.state || "tamilnadu"}
                      </td>
                      {/* Action buttons matching Image 1 */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button matching Image 1 */}
                          <button
                            onClick={() => handleOpenEdit(offer)}
                            className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors shadow-xs"
                            title="Edit"
                          >
                            <FaEdit className="w-3 h-3 text-gray-600" />
                            <span>Edit</span>
                          </button>
                          {/* Delete Button matching Image 1 */}
                          <button
                            onClick={() => setOfferToDelete(offer)}
                            className="border border-red-500 bg-[#d9534f] hover:bg-[#c9302c] text-white px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors shadow-xs"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon icon="material-symbols:local-offer-outline" className="w-10 h-10 text-gray-300" />
                      <p className="text-gray-600 font-medium">No card offers found for this Offer Timer</p>
                      <p className="text-xs text-gray-400">Click &quot;+ Add Card Offer&quot; above to add one.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Card Offer Form Sub-Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h4 className="text-lg font-semibold text-gray-800">
                {editingOffer ? "Edit Card Offer" : "Add Card Offer"}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <Icon icon="material-symbols:close-rounded" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Linked OfferTimer (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Linked Offer Timer (OfferTimerID)
                </label>
                <input
                  type="text"
                  value={`${timer?.offerTitle || "Offer Timer"} (ID: ${timerDisplayId})`}
                  readOnly
                  className="w-full border rounded p-2 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Card Offer Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Independence Day Super Offer or b"
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Card Offer Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer w-full"
                />
                {imagePreview && (
                  <div className="mt-2 relative inline-block border rounded p-1 bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-20 max-w-full object-contain mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  State
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="tamilnadu">tamilnadu (Tamil Nadu)</option>
                  <option value="kerala">kerala (Kerala)</option>
                  <option value="andhra">andhra (Andhra Pradesh)</option>
                  <option value="karnataka">karnataka (Karnataka)</option>
                  <option value="telangana">telangana (Telangana)</option>
                  <option value="all">all (All States)</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving..." : editingOffer ? "Update Offer" : "Save Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Single Delete Modal */}
      {offerToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full border shadow-xl">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Delete Card Offer</h4>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete card offer &quot;{offerToDelete.title}&quot; (ID: {offerToDelete.id})?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setOfferToDelete(null)}
                className="px-3.5 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Bulk Delete Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full border shadow-xl">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Bulk Delete Card Offers</h4>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete <span className="font-semibold text-red-600">{selectedIds.length}</span> selected card offers?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isBulkDeleting ? "Deleting..." : "Delete All Selected"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Excel & Images ZIP Upload Modal */}
      <CardOffersExcelUploadModal
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
        currentTimerId={timer?._id || timerId}
        currentTimerTitle={timer?.offerTitle || timer?.offer_title || ""}
        onSuccess={() => {
          fetchCardOffers();
          setSuccessMessage("Card offers imported successfully from Excel & ZIP!");
          setTimeout(() => setSuccessMessage(""), 3500);
        }}
      />
    </div>
  );
}
