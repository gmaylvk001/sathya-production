"use client";

import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { Icon } from "@iconify/react";
import ReactPaginate from "react-paginate";

export default function OffersComponent() {
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newOffer, setNewOffer] = useState({
    offerName: "",
    slug: "",
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 15;

  const fetchOffers = async () => {
    try {
      const response = await fetch("/api/offer-module");
      const data = await response.json();
      setOffers(data.data || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching offers:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const generateSlug = (name = "") =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "offerName") {
      setNewOffer((prev) => ({
        ...prev,
        offerName: value,
        slug: generateSlug(value),
      }));
      return;
    }
    setNewOffer((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingOffer((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setNewOffer({ offerName: "", slug: "" });
    setIsModalOpen(true);
  };

  const handleEditOffer = (offer) => {
    setEditingOffer({
      _id: offer._id,
      offerName: offer.offerName || "",
      slug: offer.slug || "",
    });
    setIsEditModalOpen(true);
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/offer-module/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerName: newOffer.offerName,
          slug: newOffer.slug,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchOffers();
        setNewOffer({ offerName: "", slug: "" });
        setSuccessMessage("Offer Added Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to add offer");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding offer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/offer-module/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingOffer._id,
          offerName: editingOffer.offerName,
          slug: editingOffer.slug,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchOffers();
        setEditingOffer(null);
        setSuccessMessage("Offer Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to update offer");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating offer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (offerId) => {
    setOfferToDelete(offerId);
    setShowConfirmationModal(true);
  };

  const handleDeleteOffer = async () => {
    try {
      const response = await fetch("/api/offer-module/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerToDelete }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Offer Deleted Successfully");
        setShowSuccessModal(true);
        fetchOffers();
        setTimeout(() => setShowSuccessModal(false), 2000);
        setIsEditModalOpen(false);
        setEditingOffer(null);
      } else {
        alert(result.error || result.message || "Failed to delete offer");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting offer. Please try again.");
    } finally {
      setShowConfirmationModal(false);
      setOfferToDelete(null);
    }
  };

  const filteredOffers = offers.filter(
    (offer) =>
      offer.offerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.ceil(filteredOffers.length / itemsPerPage);
  const totalEntries = filteredOffers.length;
  const startEntry = totalEntries === 0 ? 0 : currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const renderOfferRows = () => {
    return filteredOffers
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((offer, index) => (
        <tr key={offer._id} className="text-center border-b hover:bg-gray-50 transition-colors">
          <td className="p-3 text-left pl-4 text-xs text-gray-500 font-mono">
            {totalEntries - (currentPage * itemsPerPage + index)}
          </td>
          <td className="p-3 text-left">
            <span
              className="text-blue-600 font-semibold cursor-pointer hover:underline block"
              onClick={() => handleEditOffer(offer)}
            >
              {offer.offerName}
            </span>
          </td>
          <td className="p-3 text-left">
            <div className="flex items-center gap-1.5">
              <code className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                {offer.slug}
              </code>
              <a
                href={`/offer/${offer.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-700 p-1"
                title="Preview Offer Page"
              >
                <Icon icon="mdi:open-in-new" className="w-4 h-4" />
              </a>
            </div>
          </td>
          <td className="p-3">
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => handleEditOffer(offer)}
                className="px-2.5 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 text-xs font-medium"
                title="Edit Offer"
              >
                <FaEdit className="w-3 h-3 text-blue-600" /> Edit
              </button>
              <button
                onClick={() => handleDeleteClick(offer._id)}
                className="px-2.5 py-1.5 border border-red-200 rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 text-xs font-medium"
                title="Delete"
              >
                <Icon icon="mingcute:delete-2-line" className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  const nameSlugFields = (values, onChange) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
          Offer Name <span className="text-red-500">*</span>
        </label>
        <input
          name="offerName"
          value={values.offerName || ""}
          onChange={onChange}
          placeholder="e.g. Weekend Offers, Diwali Offer"
          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          required
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Slug <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() =>
              onChange({
                target: { name: "slug", value: generateSlug(values.offerName || "") },
              })
            }
            className="text-xs text-blue-600 hover:underline"
          >
            Regenerate
          </button>
        </div>
        <input
          name="slug"
          value={values.slug || ""}
          onChange={onChange}
          placeholder="weekend-offers"
          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          required
        />
        {values.slug ? (
          <p className="text-xs text-gray-500 mt-1.5">
            Page:{" "}
            <a
              href={`/offer/${values.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-red-600 hover:underline font-mono"
            >
              /offer/{values.slug}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Icon icon="mdi:sale" className="text-red-600 w-7 h-7" />
            Offers Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage offer name and slug.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition"
        >
          <Icon icon="ic:baseline-add" className="w-5 h-5" /> New Offer
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Icon icon="line-md:loading-loop" className="w-8 h-8 text-red-600 mx-auto animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Loading offers...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border rounded-xl overflow-hidden border-gray-200">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search offer by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 border-gray-300"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <Icon icon="ic:baseline-search" className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Total Offers: <strong className="text-gray-800">{filteredOffers.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-700 text-xs uppercase tracking-wider">
                  <th className="p-3 text-left pl-4 font-semibold w-14">#</th>
                  <th className="p-3 text-left font-semibold">Offer Name</th>
                  <th className="p-3 text-left font-semibold">Slug</th>
                  <th className="p-3 font-semibold text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredOffers.length > 0 ? (
                  renderOfferRows()
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-400">
                      No offers found. Click &quot;New Offer&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalEntries > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-gray-200 gap-3">
              <div className="text-xs text-gray-500">
                Showing {startEntry} to {endEntry} of {totalEntries} offers
              </div>
              <ReactPaginate
                previousLabel={"«"}
                nextLabel={"»"}
                breakLabel={"..."}
                pageCount={pageCount}
                marginPagesDisplayed={2}
                pageRangeDisplayed={3}
                onPageChange={handlePageClick}
                containerClassName={"flex items-center space-x-1 text-sm"}
                activeClassName={"bg-red-600 text-white font-bold"}
                pageLinkClassName={"px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"}
                previousLinkClassName={"px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50"}
                nextLinkClassName={"px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50"}
              />
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Create New Offer</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOffer} className="p-6 space-y-6">
              {nameSlugFields(newOffer, handleInputChange)}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Icon icon="mingcute:check-line" className="w-4 h-4" /> Create Offer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Edit Offer</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOffer} className="p-6 space-y-6">
              {nameSlugFields(editingOffer, handleEditInputChange)}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => handleDeleteClick(editingOffer._id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <Icon icon="mingcute:delete-2-line" className="w-4 h-4" /> Delete Offer
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Icon icon="line-md:loading-loop" className="w-4 h-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      <>
                        <Icon icon="mingcute:check-line" className="w-4 h-4" /> Update Offer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Icon icon="mingcute:delete-2-line" className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Offer?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this offer?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setOfferToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOffer}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-xl p-5 max-w-sm mx-4 text-center shadow-2xl border border-gray-100 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 shrink-0">
              <Icon icon="mdi:check" className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900 text-left">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
