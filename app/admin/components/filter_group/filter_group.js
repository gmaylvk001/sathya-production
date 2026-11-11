"use client";

import React, { useEffect, useState } from "react";
import { FaPlus, FaMinus, FaEdit } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import ReactPaginate from "react-paginate";
import BulkFilterGroupUploadPage from "../filter/filter_group_upload";
import { Icon } from '@iconify/react';

export default function FiltergroupComponent() {
  const [filterGroups, setFilterGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFiltergroup, setNewFiltergroup] = useState({
    filtergroup_name: "",
    status: "Active",
    _id: null
  });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [filterGroupToDelete, setFilterGroupToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;
  const [excelFile, setExcelFile] = useState(null);



  useEffect(() => {
    import("react-toastify/dist/ReactToastify.css");
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".csv");
  };


  const handleSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_filter.xlsx?t=${Date.now()}`;
    link.download = "FilterGroupSample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const fetchFilterGroups = async () => {
    try {
      const response = await fetch("/api/filter_group");
      const data = await response.json();
      setFilterGroups(data.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching filter groups:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterGroups();
  }, []);

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    if (!filterGroups.length) {
      toast.error("No data to export");
      return;
    }

    const exportData = filterGroups.map((item) => ({
      "Filter Group Name": item.filtergroup_name,
      "Filter Group Slug": item.filtergroup_slug,
      "Status": item.status,

    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FilterGroups");

    XLSX.writeFile(workbook, `filter-groups-${Date.now()}.xlsx`);
  };

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleInputChange = (e) => {
    setNewFiltergroup({ ...newFiltergroup, [e.target.name]: e.target.value });
  };

  const handleAddFiltergroup = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("filtergroup_name", newFiltergroup.filtergroup_name);
    formData.append("status", newFiltergroup.status);

    if (newFiltergroup._id) {
      formData.append("filtergroupId", newFiltergroup._id);
    }

    try {
      const url = newFiltergroup._id
        ? "/api/filter_group/update"
        : "/api/filter_group/add";

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchFilterGroups();
        setNewFiltergroup({
          filtergroup_name: "",
          status: "Active",
          _id: null
        });
        setSuccessMessage(newFiltergroup._id
          ? "Filter group updated successfully"
          : "Filter group added successfully");
        setShowSuccessModal(true);
      } else {
        console.error("Error:", result.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFile(excelFile)) {
      toast.error("Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    setIsLoading(true);

    try {
      const res = await fetch("/api/filter_group/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok || res.status === 207) {
        // 207 means partial success
        if (res.status === 201) {
          toast.success(data.message);
        } else {
          toast.success(data.message);
          // Show detailed errors if any
          if (data.details && data.details.length > 0) {
            data.details.forEach(error => {
              toast.error(`Row ${error.row}: ${error.error}`);
            });
          }
        }
        // Refresh the filter groups data
        fetchFilterGroups();

        // Reset form
        setExcelFile(null);
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload failed. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }

  };
  const handleDeleteFiltergroup = async (filtergroupId) => {
    try {
      const response = await fetch("/api/filter_group/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filtergroupId }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Filter group deleted successfully");
        setShowSuccessModal(true);
        fetchFilterGroups();
      } else {
        console.error("Error:", result.error);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setShowConfirmationModal(false);
      setFilterGroupToDelete(null);
    }
  };
  // Add this useEffect hook near your other hooks
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000); // 2000 milliseconds = 2 seconds

      return () => clearTimeout(timer); // Clean up the timer if the component unmounts
    }
  }, [showSuccessModal]);
  const handleEditFiltergroup = (filtergroup) => {
    setNewFiltergroup({
      filtergroup_name: filtergroup.filtergroup_name,
      status: filtergroup.status,
      _id: filtergroup._id
    });
    setIsModalOpen(true);
  };

  const flattenFilterGroups = (groups, parentId = "none", level = 0, result = []) => {
    groups.forEach((group) => {
      result.push({ ...group, level });
    });
    return result;
  };

  const renderFilterGroupRows = () => {
    const flattenedGroups = flattenFilterGroups(filterGroups);
    const filteredGroups = flattenedGroups.filter((group) =>
      group.filtergroup_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.filtergroup_slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filteredGroups
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((group, index) => (
        <tr key={group._id} className="text-center border-b">
          <td className="p-2">{group.filtergroup_name}</td>
          <td className="p-2">{group.filtergroup_slug}</td>
          <td className="p-2 font-semibold">
            {group.status === "Active" ? (
              <span className="bg-green-100 text-green-600 px-6 py-1.5 rounded-full font-medium text-sm">Active</span>
            ) : (
              <span className="bg-red-100 text-red-600 px-6 py-1.5 rounded-full font-medium text-sm">Inactive</span>
            )}
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleEditFiltergroup(group)}
                className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                title="Edit"
              >
                <FaEdit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setFilterGroupToDelete(group._id);
                  setShowConfirmationModal(true);
                }}
                className="w-8 h-8 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center hover:bg-pink-200"
                title="Delete"
              >
                <Icon icon="mingcute:delete-2-line" className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  const flattenedGroups = flattenFilterGroups(filterGroups);
  const filteredGroups = flattenedGroups.filter((group) =>
    group.filtergroup_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.filtergroup_slug.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pageCount = Math.ceil(filteredGroups.length / itemsPerPage);
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, filteredGroups.length);
  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 mt-5">
        <h2 className="text-2xl font-bold">Filter Group List</h2>
        <a
          href="/api/product/filter-bulk-upload/export-product-filters"
          download="sathya_product_filters_export.xlsx"
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 shadow-md transition flex items-center gap-2 text-sm font-semibold"
          title="Download matched product filters Excel"
        >
          <Icon icon="mdi:file-excel" className="w-5 h-5" />
          📥 Download Product Filters Excel (Temp)
        </a>
      </div>

      {isLoading ? (
        <p>Loading filter groups...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto border border-gray-200">
          <div className="flex justify-between mb-5">
            <input
              type="text"
              placeholder="Search filter group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border px-3 py-2 rounded-md w-64"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md"
              >
                + Add Filter Group
              </button>
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="bg-[#d72828] text-white px-4 py-2 rounded-md"
              >
                ⬆️ Bulk Upload
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Icon icon="mdi:download" className="w-4 h-4" />
                Export
              </button>
              <a
                href="/api/product/filter-bulk-upload/export-product-filters"
                download="sathya_product_filters_export.xlsx"
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition flex items-center gap-2 text-sm font-medium"
                title="Download matched product filters Excel"
              >
                <Icon icon="mdi:file-excel" className="w-5 h-5" />
                Export Product Filters (Temp)
              </a>
            </div>
          </div>

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2">Filter Group Name</th>
                <th className="p-2">Filter Group Slug</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length > 0 ? (
                renderFilterGroupRows()
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4">
                    No filter groups found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Showing {startEntry} to {endEntry} of {filteredGroups.length} entries
            </div>
            <ReactPaginate
              previousLabel={"«"}
              nextLabel={"»"}
              breakLabel={"..."}
              pageCount={pageCount}
              onPageChange={handlePageClick}
              forcePage={currentPage}
              containerClassName={"flex items-center space-x-1"}
              pageClassName="page-item border border-gray-300 px-3 py-1.5 rounded-md "
              pageLinkClassName="  rounded-md  "
              previousLinkClassName={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === 0 ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
                }`}
              nextLinkClassName={`px-3 py-1.5 border border-gray-300 rounded-md border border-gray-300 ${currentPage === pageCount - 1 ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
                }`}
              activeClassName="px-1 py-1.5 rounded-md bg-red-500 text-white"
            />
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {newFiltergroup._id ? "Edit" : "Add"} Filter Group
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewFiltergroup({
                    filtergroup_name: "",
                    status: "Active",
                    _id: null
                  });
                }}
                className="text-gray-400 hover:text-gray-700"
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

            {/* Body */}
            <div className="px-6 py-6 overflow-y-auto flex-grow">
              <form onSubmit={handleAddFiltergroup} className="space-y-5">
                {/* Filter Group Name */}
                <div>
                  <label htmlFor="filtergroup_name" className="block mb-1 text-sm font-semibold text-gray-700">
                    Filter Group Name
                  </label>
                  <input
                    type="text"
                    id="filtergroup_name"
                    name="filtergroup_name"
                    value={newFiltergroup.filtergroup_name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400"
                    placeholder="Enter Filter Group Name"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block mb-1 text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={newFiltergroup.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="inline-block bg-red-600 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition"
                >
                  {newFiltergroup._id ? "Update" : "Add"} Filter Group
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Delete Filter Group</h2>
            <p className="mb-4">Are you sure you want to delete this filter group?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFiltergroup(filterGroupToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Bulk Upload */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-[70vw] relative">
            {/* Close Button */}
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-4">Bulk Upload</h2>
            <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-[#d72828]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Excel/CSV File
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload your product data file
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                  required
                />
              </div>

              <button
                type="button"
                onClick={handleSampleDownload}
                className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Sample Format
              </button>

              <div className="flex mt-5 justify-between">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    "Upload Filter Groups"
                  )}
                </button>
              </div>

              <ToastContainer position="top-right" autoClose={5000} />
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Success</h2>
            <p className="mb-4">{successMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
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