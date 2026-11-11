"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import ReactPaginate from "react-paginate";
import BulkUploadModal from "./BulkUploadModal";

export default function ExchangeOffersList() {
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const fetchOffers = async () => {
    try {
      const response = await fetch("/api/exchange-offers-condition");
      const data = await response.json();
      setOffers(data.data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleDeleteClick = (offerId) => {
    setOfferToDelete(offerId);
    setShowConfirmationModal(true);
  };

  const handleDeleteOffer = async () => {
    try {
      const response = await fetch("/api/exchange-offers-condition/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerToDelete }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage("Offer Deleted Successfully");
        setShowSuccessModal(true);
        fetchOffers();
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

  const filteredOffers = offers.filter(
    (offer) =>
      offer.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.ceil(filteredOffers.length / itemsPerPage);
  const totalEntries = filteredOffers.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const renderOfferRows = () => {
    return filteredOffers
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((offer) => (
        <tr key={offer._id} className="text-center border-b hover:bg-gray-50 text-gray-700">
          <td className="p-3 text-left pl-4">{offer.id}</td>
          <td className="p-3 text-left">{offer.categoryName}</td>
          <td className="p-3 text-left">{offer.brand}</td>
          <td className="p-3 text-left">{offer.type}</td>
          <td className="p-3 text-left">{offer.condition}</td>
          <td className="p-3 text-left">{offer.zone}</td>
          <td className="p-3 text-left">{offer.price ? Number(offer.price).toFixed(4) : "0.0000"}</td>
          <td className="p-3 text-left">{offer.status}</td>
          <td className="p-3">
            <div className="flex items-center gap-2 justify-center">
              <Link
                href={`/admin/exchange-offers-condition/edit/${offer._id}`}
                className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                title="Edit"
              >
                <Icon icon="mdi:pencil-outline" /> Edit
              </Link>
              <button
                onClick={() => handleDeleteClick(offer._id)}
                className="px-2 py-1 border rounded bg-[#d72828] text-white hover:bg-red-700 flex items-center gap-1"
                title="Delete"
              >
                <Icon icon="mdi:delete" /> Delete
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">Exchange Offers</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Icon icon="eos-icons:loading" className="text-4xl text-gray-400 animate-spin" /></div>
      ) : (
        <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto border-gray-200">
          <div className="flex justify-between items-center mb-5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Gift code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:border-blue-400"
              />
              <span className="absolute right-2 top-2 text-gray-400">
                <Icon icon="ic:baseline-search" />
              </span>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/exchange-offers-condition/create"
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Icon icon="mdi:plus" /> New Exchange Offer
              </Link>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Icon icon="mdi:upload" /> Bulk Upload
              </button>
            </div>
          </div>
          
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3 text-left pl-4 font-semibold w-16">ID</th>
                <th className="p-3 text-left font-semibold">Category</th>
                <th className="p-3 text-left font-semibold">Brand</th>
                <th className="p-3 text-left font-semibold">Type</th>
                <th className="p-3 text-left font-semibold">Condition</th>
                <th className="p-3 text-left font-semibold">Zone</th>
                <th className="p-3 text-left font-semibold">Price</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length > 0 ? (
                renderOfferRows()
              ) : (
                <tr>
                  <td colSpan="9" className="text-center p-4">
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
            {pageCount > 1 && (
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
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Icon icon="mdi:check" className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">{successMessage}</p>
          </div>
        </div>
      )}

      <BulkUploadModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        onSuccess={fetchOffers}
      />
    </div>
  );
}
