"use client";

import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { Icon } from '@iconify/react';
import ReactPaginate from "react-paginate";
import Select from "react-select";

export default function HighlightedProductsComponent() {
  const [offers, setOffers] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newOffer, setNewOffer] = useState({
    offerName: "",
    products: [],
    startDate: "",
    endDate: "",
    status: "Active",
    state: "all",
  });

  const [labelSettings, setLabelSettings] = useState({
    labelText: "Highlighted Products",
    labelColor: "#ff0000",
  });
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [labelValidationError, setLabelValidationError] = useState(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const statesList = [
    { value: "all", label: "All" },
    { value: "tamilnadu", label: "Tamil Nadu" },
    { value: "andhra", label: "Andhra Pradesh" },
    { value: "kerala", label: "Kerala" },
    { value: "karnataka", label: "Karnataka" },
    { value: "telangana", label: "Telangana" }
  ];

  const fetchData = async () => {
    try {
      const [offRes, prodRes, settingsRes] = await Promise.all([
        fetch("/api/highlighted-offer"),
        fetch("/api/product/get"),
        fetch("/api/highlighted-settings")
      ]);
      const offData = await offRes.json();
      const prodData = await prodRes.json();
      const settingsData = await settingsRes.json();
      
      setOffers(offData.data || []);
      if (settingsData.data) {
        setLabelSettings(settingsData.data);
      }

      // Map products for react-select
      const formattedProducts = (prodData || []).map(p => ({
        value: p._id || p.id,
        label: p.name || p.productName
      }));
      setProductsList(formattedProducts);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleInputChange = (e) => {
    setNewOffer({ ...newOffer, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditingOffer({ ...editingOffer, [e.target.name]: e.target.value });
  };

  const handleProductChange = (selectedOptions) => {
    const selectedValues = selectedOptions ? selectedOptions.map(option => option.label) : [];
    if (isEditModalOpen) {
      setEditingOffer({ ...editingOffer, products: selectedValues });
    } else {
      setNewOffer({ ...newOffer, products: selectedValues });
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/highlighted-offer/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer),
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewOffer({
          offerName: "",
          products: [],
          startDate: "",
          endDate: "",
          status: "Active",
          state: "all",
        });
        setSuccessMessage("Highlighted Offer Added Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to add offer");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer({ ...offer });
    setIsEditModalOpen(true);
  };

  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/highlighted-offer/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingOffer._id,
          offerName: editingOffer.offerName,
          products: editingOffer.products,
          startDate: editingOffer.startDate,
          endDate: editingOffer.endDate,
          status: editingOffer.status,
          state: editingOffer.state,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchData();
        setEditingOffer(null);
        setSuccessMessage("Highlighted Offer Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to update offer");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (offerId) => {
    setOfferToDelete(offerId);
    setShowConfirmationModal(true);
  };

  const handleDeleteOffer = async () => {
    try {
      const response = await fetch("/api/highlighted-offer/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerToDelete }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Highlighted Offer Deleted Successfully");
        setShowSuccessModal(true);
        fetchData();
      } else {
        alert(result.error || "Failed to delete offer");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setShowConfirmationModal(false);
      setOfferToDelete(null);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  const handleSaveLabelSettings = async () => {
    const trimmedText = (labelSettings.labelText || "").trim();
    const trimmedColor = (labelSettings.labelColor || "").trim();

    if (!trimmedText) {
      setLabelValidationError("Highlight label text is required.");
      return;
    }

    const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!trimmedColor || !hexColorRegex.test(trimmedColor)) {
      setLabelValidationError("Please enter a valid hex color code (e.g. #d72828).");
      return;
    }

    try {
      setIsSavingLabel(true);
      setLabelValidationError(null);

      const response = await fetch("/api/highlighted-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelText: trimmedText,
          labelColor: trimmedColor,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        if (result.data) {
          setLabelSettings(result.data);
        }
        setIsLabelModalOpen(false);
        setSuccessMessage("Highlighted Label Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        setLabelValidationError(result.error || "Failed to update label settings.");
      }
    } catch (error) {
      console.error("Error saving label settings:", error);
      setLabelValidationError("Network error while saving settings. Please try again.");
    } finally {
      setIsSavingLabel(false);
    }
  };

  const filteredOffers = offers.filter(
    (offer) =>
      offer.offerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.ceil(filteredOffers.length / itemsPerPage);
  const totalEntries = filteredOffers.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    // Assuming YYYY-MM-DD or similar is saved. Let's just output it as is since it's a date string in form
    return dateString; 
  };

  const renderOfferRows = () => {
    return filteredOffers
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((offer, index) => (
        <tr key={offer._id} className="text-center border-b hover:bg-gray-50">
          <td className="p-3 text-left pl-4">{totalEntries - (currentPage * itemsPerPage + index)}</td>
          <td className="p-3 text-left text-blue-500 cursor-pointer hover:underline" onClick={() => handleEditOffer(offer)}>
            {offer.offerName}
          </td>
          <td className="p-3">{formatDate(offer.startDate)}</td>
          <td className="p-3">{formatDate(offer.endDate)}</td>
          <td className="p-3">{offer.status}</td>
          <td className="p-3">
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => handleEditOffer(offer)}
                className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                title="Edit"
              >
                <FaEdit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => handleDeleteClick(offer._id)}
                className="px-2 py-1 border rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                title="Delete"
              >
                <Icon icon="mingcute:delete-2-line" /> Delete
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">Highlighted Products</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto">
          {/* Search and Add Row */}
          <div className="flex justify-between items-center mb-5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Offer code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:border-blue-400"
              />
              <span className="absolute right-2 top-2 text-gray-400">
                <Icon icon="ic:baseline-search" />
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLabelValidationError(null);
                  setIsLabelModalOpen(true);
                }}
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Icon icon="mdi:refresh" /> Change Highlighted Label
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Icon icon="ic:baseline-add" /> New Offer
              </button>
            </div>
          </div>
          
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3 text-left pl-4 font-semibold w-16">ID</th>
                <th className="p-3 text-left font-semibold">Offer Name</th>
                <th className="p-3 font-semibold w-32">Start Date</th>
                <th className="p-3 font-semibold w-32">End Date</th>
                <th className="p-3 font-semibold w-24">Status</th>
                <th className="p-3 font-semibold w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length > 0 ? (
                renderOfferRows()
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-4">
                    No offers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Showing {totalEntries > 0 ? startEntry : 0} to {endEntry} of {totalEntries} entries
            </div>
            <ReactPaginate
              previousLabel={"«"}
              nextLabel={"»"}
              breakLabel={"..."}
              pageCount={pageCount}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageClick}
              containerClassName={"flex items-center space-x-1"}
              activeClassName={"bg-blue-500 text-white border-blue-500"}
              pageClassName={"page-item"}
              pageLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
              previousClassName={"page-item"}
              previousLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
              nextClassName={"page-item"}
              nextLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
            />
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white shadow-lg w-full max-w-4xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-light text-gray-800">Add Highlighted Products</h2>
            </div>
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleAddOffer} className="space-y-4">
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Offer Name</label>
                  <input
                    name="offerName"
                    value={newOffer.offerName}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-start">
                  <label className="w-1/4 text-sm font-semibold text-gray-700 pt-2">Product</label>
                  <div className="w-3/4">
                    <Select
                      isMulti
                      name="products"
                      options={productsList}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      value={productsList.filter(p => newOffer.products.includes(p.label))}
                      onChange={handleProductChange}
                      placeholder="Select products..."
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={newOffer.startDate}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={newOffer.endDate}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={newOffer.status}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">State</label>
                  <select
                    name="state"
                    value={newOffer.state}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    {statesList.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:check-line" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white shadow-lg w-full max-w-4xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-light text-gray-800">Edit Highlighted Products</h2>
            </div>
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => handleDeleteClick(editingOffer._id)}
                  className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 flex items-center gap-1 text-sm"
                >
                  <Icon icon="mingcute:delete-2-line" /> Delete
                </button>
              </div>
              <form onSubmit={handleUpdateOffer} className="space-y-4">
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">ID</label>
                  <input
                    value={editingOffer._id}
                    className="w-3/4 border rounded p-2 bg-gray-100 text-gray-500 focus:outline-none"
                    readOnly
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Offer Name</label>
                  <input
                    name="offerName"
                    value={editingOffer.offerName}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-start">
                  <label className="w-1/4 text-sm font-semibold text-gray-700 pt-2">Product</label>
                  <div className="w-3/4">
                    <Select
                      isMulti
                      name="products"
                      options={productsList}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      value={productsList.filter(p => (editingOffer.products || []).includes(p.label))}
                      onChange={handleProductChange}
                      placeholder="Select products..."
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={editingOffer.startDate}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={editingOffer.endDate}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={editingOffer.status}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">State</label>
                  <select
                    name="state"
                    value={editingOffer.state}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    {statesList.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:check-line" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Highlighted Label Modal */}
      {isLabelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative flex flex-col mx-4">
            <button 
              onClick={() => {
                if (!isSavingLabel) {
                  setLabelValidationError(null);
                  setIsLabelModalOpen(false);
                }
              }}
              disabled={isSavingLabel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none disabled:opacity-50"
            >
              &times;
            </button>
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-xl font-light text-gray-800">Change Highlighted Label</h2>
            </div>
            
            <div className="px-5 py-6 space-y-4">
              {labelValidationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
                  <Icon icon="mdi:alert-circle-outline" className="w-5 h-5 flex-shrink-0 text-red-500" />
                  <span>{labelValidationError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Highlight Label Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={labelSettings.labelText}
                  onChange={(e) => {
                    setLabelValidationError(null);
                    setLabelSettings({ ...labelSettings, labelText: e.target.value });
                  }}
                  disabled={isSavingLabel}
                  placeholder="e.g. Brand Deal, Weekend Special"
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Highlight Label Color <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={labelSettings.labelColor?.startsWith("#") && (labelSettings.labelColor.length === 7 || labelSettings.labelColor.length === 4) ? labelSettings.labelColor : "#d72828"}
                    onChange={(e) => {
                      setLabelValidationError(null);
                      setLabelSettings({ ...labelSettings, labelColor: e.target.value });
                    }}
                    disabled={isSavingLabel}
                    className="h-10 w-16 p-1 border rounded cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={labelSettings.labelColor}
                    onChange={(e) => {
                      setLabelValidationError(null);
                      setLabelSettings({ ...labelSettings, labelColor: e.target.value });
                    }}
                    disabled={isSavingLabel}
                    placeholder="#d72828"
                    className="w-32 border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 font-mono disabled:bg-gray-100"
                  />
                  <div
                    className="w-8 h-8 rounded border shadow-inner flex-shrink-0"
                    style={{ backgroundColor: labelSettings.labelColor || "#ffffff" }}
                    title="Color Preview"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setLabelValidationError(null);
                  setIsLabelModalOpen(false);
                }}
                disabled={isSavingLabel}
                className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveLabelSettings}
                disabled={isSavingLabel}
                className="bg-[#d72828] text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2"
              >
                {isSavingLabel && <Icon icon="eos-icons:loading" className="w-4 h-4 animate-spin" />}
                {isSavingLabel ? "Saving..." : "Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this offer?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setOfferToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOffer}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Icon icon="mdi:check" className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
