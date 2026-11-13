"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FaEdit } from "react-icons/fa";
import ReactPaginate from "react-paginate";
import BulkFilterGroupUploadPage from "../filter/filter_upload";
import { Icon } from '@iconify/react';
import dynamic from 'next/dynamic';
const Select = dynamic(() => import('react-select'), { ssr: false });
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function FilterComponent() {
  const [filters, setFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroupFilter, setFilterGroupFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customStyles = {
    menu: (provided) => ({
      ...provided,
      maxHeight: "200px",       // limit height
      overflowY: "auto",        // add vertical scroll
      zIndex: 100,              // ensure it's above other elements
    }),
  };
  const [newFilter, setNewFilter] = useState({
    filter_name: "",
    filter_slug: "",
    status: "Active",
    filter_group: "",
    _id: null,
    filterGroupOption: null
  });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;


  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };


  const fetchFilters = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/filter");
      const data = await res.json();
      setFilters(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching filters:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const fetchFilterGroups = async () => {
    try {
      const response = await fetch("/api/filter_group");
      const res = await response.json();
      const data = res.data;
      const groupOptions = data.map((group) => ({
        value: group._id,
        label: group.filtergroup_name,
      }));
      setFilterGroups(groupOptions);
    } catch (error) {
      console.error("Error fetching filter groups:", error);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchFilterGroups();
  }, []);

  const handleExportFilters = async () => {
    const XLSX = await import("xlsx");
    // Determine if any filter is active
    const isFilterActive = searchQuery.trim().length > 0 || filterGroupFilter !== "All" || statusFilter !== "All";
    let exportList = [];
    if (isFilterActive) {
      exportList = filteredFilters;
    } else {
      exportList = flattenFilters(filters);
    }
    if (!exportList.length) {
      toast.error("No filters to export");
      return;
    }
    const exportData = exportList.map((filter) => ({
      "Filter Name": filter.filter_name,
      "Filter Slug": filter.filter_slug,
      "Filter Group":
        (filter.filter_group && filter.filter_group.filtergroup_name) ||
        filter.filter_group_name ||
        "N/A",
      "Status": filter.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filters");
    XLSX.writeFile(workbook, `filters-${Date.now()}.xlsx`);
  };


  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleInputChange = (e) => {
    setNewFilter({ ...newFilter, [e.target.name]: e.target.value });
  };

  const handleFilterGroupChange = (selectedOption) => {
    setNewFilter({
      ...newFilter,
      filter_group: selectedOption.value,
      filterGroupOption: selectedOption
    });
  };

  const handleAddFilter = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const requestBody = {
      filter_name: newFilter.filter_name,
      filter_slug: newFilter.filter_slug || slugify(newFilter.filter_name),
      status: newFilter.status,
      filter_group: newFilter.filter_group
    };

    if (newFilter._id) {
      requestBody.filterId = newFilter._id;
    }

    try {
      const url = newFilter._id
        ? "/api/filter/update"
        : "/api/filter/add";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response) {
        throw new Error('No response from server');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON, got:', text);
        throw new Error('Response was not JSON');
      }

      const result = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        fetchFilters();
        setNewFilter({
          filter_name: "",
          filter_slug: "",
          status: "Active",
          filter_group: "",
          _id: null,
          filterGroupOption: null
        });
        setSuccessMessage(newFilter._id
          ? "Filter updated successfully"
          : "Filter added successfully");
        setShowSuccessModal(true);
      } else {
        console.error("Error:", result.error);
        toast.error(result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Network/parsing error:", error);
      toast.error(`Request failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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
  // const handleAddFilter = async (e) => {
  //   e.preventDefault();

  //   const formData = new FormData();
  //   formData.append("filter_name", newFilter.filter_name);
  //   formData.append("status", newFilter.status);
  //   formData.append("filter_group", newFilter.filter_group);

  //   if (newFilter._id) {
  //     formData.append("filterId", newFilter._id);
  //   }

  //   try {
  //     const url = newFilter._id 
  //       ? "/api/filter/update" 
  //       : "/api/filter/add";

  //     const response = await fetch(url, {
  //       method: "POST",
  //       body: formData,
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setIsModalOpen(false);
  //       fetchFilters();
  //       setNewFilter({
  //         filter_name: "",
  //         status: "Active",
  //         filter_group: "",
  //         _id: null
  //       });
  //       setSuccessMessage(newFilter._id 
  //         ? "Filter updated successfully" 
  //         : "Filter added successfully");
  //       setShowSuccessModal(true);
  //     } else {
  //       console.error("Error:", result.error);
  //       toast.error(result.error);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //     toast.error("An error occurred");
  //   }
  // };

  const Modelopen = (status) => {
    setIsModalOpen(status);
    setNewFilter({
      filter_name: "",
      status: "Active",
      filter_group: "",
      _id: null,
      filterGroupOption: null
    });
  }
  const handleDeleteFilter = async (filterId) => {
    try {
      const response = await fetch("/api/filter/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterId }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Filter deleted successfully");
        setShowSuccessModal(true);
        fetchFilters();
      } else {
        console.error("Error:", result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setShowConfirmationModal(false);
      setFilterToDelete(null);
    }
  };

  const handleEditFilter = (filter) => {
    let groupId = filter.filter_group?._id || filter.filter_group;

    // If groupId is still not found, try to match by name
    if (!groupId && filter.filter_group_name) {
      const matchedGroup = filterGroups.find(
        g => g.label.toLowerCase() === filter.filter_group_name.toLowerCase()
      );
      groupId = matchedGroup?.value;
    }

    const selectedGroup = filterGroups.find(g => g.value === groupId);

    setNewFilter({
      filter_name: filter.filter_name,
      filter_slug: filter.filter_slug,
      status: filter.status,
      filter_group: groupId, // Make sure this is set
      _id: filter._id,
      filterGroupOption: selectedGroup
    });
    setIsModalOpen(true);
  };

  const getFilterGroupName = useCallback((filter) => {
    return (
      filter.filter_group?.filtergroup_name ||
      filter.filter_group_name ||
      (typeof filter.filter_group === "string" &&
        filterGroups.find((g) => g.value === filter.filter_group)?.label) ||
      ""
    );
  }, [filterGroups]);

  const getFilterGroupId = useCallback((filter) => {
    if (filter.filter_group?._id) return String(filter.filter_group._id);
    if (typeof filter.filter_group === "string") return filter.filter_group;
    return "";
  }, []);

  const flattenFilters = (filters, parentId = "none", level = 0, result = []) => {
    filters.forEach((filter) => {
      result.push({ ...filter, level });
    });
    return result;
  };

  const flattenedFilters = useMemo(() => flattenFilters(filters), [filters]);

  const filteredFilters = useMemo(() => {
    return flattenedFilters.filter((filter) => {
      const search = searchQuery.trim().toLowerCase();
      const filterGroupName = getFilterGroupName(filter);
      const matchesSearch =
        !search ||
        (filter.filter_name || "").toLowerCase().includes(search) ||
        (filter.filter_slug || "").toLowerCase().includes(search) ||
        filterGroupName.toLowerCase().includes(search);

      const matchesFilterGroup =
        filterGroupFilter === "All" ||
        getFilterGroupId(filter) === filterGroupFilter ||
        filterGroupName.toLowerCase() ===
          (filterGroups.find((g) => g.value === filterGroupFilter)?.label || "").toLowerCase();

      const matchesStatus = statusFilter === "All" || filter.status === statusFilter;

      return matchesSearch && matchesFilterGroup && matchesStatus;
    });
  }, [flattenedFilters, searchQuery, filterGroupFilter, statusFilter, filterGroups, getFilterGroupName, getFilterGroupId]);

  const renderFilterRows = () => {
    return filteredFilters
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((filter) => (
        <tr key={filter._id} className="text-center border-b">
          <td className="p-2">{filter.filter_name}</td>
          <td className="p-2">{filter.filter_slug}</td>
          <td className="p-2">
            {getFilterGroupName(filter) || "N/A"}
          </td>

          <td className="p-2 font-semibold">
            {filter.status === "Active" ? (
              <span className="bg-green-100 text-green-600 px-6 py-1.5 rounded-full font-medium text-sm">Active</span>
            ) : (
              <span className="bg-red-100 text-red-600 px-6 py-1.5 rounded-full font-medium text-sm">Inactive</span>
            )}
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleEditFilter(filter)}
                className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                title="Edit"
              >
                <FaEdit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setFilterToDelete(filter._id);
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

  const pageCount = Math.ceil(filteredFilters.length / itemsPerPage);
  const startEntry = filteredFilters.length === 0 ? 0 : currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, filteredFilters.length);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Filter List</h2>
      </div>

      {isLoading ? (
        <p>Loading filters...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search filter..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="border px-3 py-2 rounded-md w-full sm:w-60 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <select
                value={filterGroupFilter}
                onChange={(e) => {
                  setFilterGroupFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="border px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 bg-white cursor-pointer max-w-[220px]"
              >
                <option value="All">All Filter Groups</option>
                {filterGroups.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="border px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 bg-white cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {(searchQuery || filterGroupFilter !== "All" || statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterGroupFilter("All");
                    setStatusFilter("All");
                    setCurrentPage(0);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => Modelopen(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
              >
                + Add Filter
              </button>
              <button
                onClick={handleExportFilters}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2"
              >
                <Icon icon="mdi:download" className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2">Filter Name</th>
                <th className="p-2">Filter Slug</th>
                <th className="p-2">Filter Group</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFilters.length > 0 ? (
                renderFilterRows()
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-4">
                    No filters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Showing {startEntry} to {endEntry} of {filteredFilters.length} entries
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
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header with close button */}
            <div className="flex justify-between items-center border-b-2 border-gray-300 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {newFilter._id ? "Edit Filter" : "Add Filter"}
              </h2>
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
              <form onSubmit={handleAddFilter} className="space-y-5">
                {/* Filter Name */}
                <div>
                  <label htmlFor="filter_name" className="block mb-1 text-sm font-semibold text-gray-700">
                    Filter Name
                  </label>
                  <input
                    name="filter_name"
                    value={newFilter.filter_name}
                    onChange={handleInputChange}
                    id="filter_name"
                    className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400"
                    placeholder="Enter Filter Name"
                    required
                  />
                </div>

                {/* Filter Group */}
                <div>
                  <label htmlFor="filter_group" className="block mb-1 text-sm font-semibold text-gray-700">
                    Filter Group
                  </label>
                  <Select
                    options={filterGroups}
                    onChange={handleFilterGroupChange}
                    value={newFilter.filterGroupOption || null}
                    placeholder="Select Filter Group..."
                    className="w-full"
                    required
                    styles={customStyles}
                    id="filter_group"
                  />
                </div>

                {/* Filter Slug */}
                <div>
                  <label htmlFor="filter_slug" className="block mb-1 text-sm font-semibold text-gray-700">
                    Filter Slug
                  </label>
                  <input name="filter_slug" value={newFilter.filter_slug} onChange={handleInputChange} id="filter_slug" className="w-full rounded-md border p-2 focus:ring-2 focus:ring-red-400" placeholder="Enter Filter Slug" required />
                </div>


                {/* Status */}
                <div>
                  <label htmlFor="status" className="block mb-1 text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={newFilter.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-400"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-block bg-red-600 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : `${newFilter._id ? "Update" : "Add"} Filter`}
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
            <h2 className="text-xl font-bold mb-4">Delete Filter</h2>
            <p className="mb-4">Are you sure you want to delete this filter?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-md"
              >
                No, Close
              </button>
              <button
                onClick={() => handleDeleteFilter(filterToDelete)}
                className="bg-red-500 px-4 py-2 rounded-md text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Bulk Upload */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl relative">
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
            <BulkFilterGroupUploadPage />
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

      <ToastContainer />
    </div>
  );
}