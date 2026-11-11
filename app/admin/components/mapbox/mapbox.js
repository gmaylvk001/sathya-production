"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Icon } from "@iconify/react";
import Link from "next/link";
import DateRangePicker from "@/components/DateRangePicker";

export default function StoreComponent() {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newStore, setNewStore] = useState({
    organisation_name: "",
    category: "",
    description: "",
    logo: null,
    location: "",
    zipcode: "",
    address: "",
    service_area: "",
    city: "",
    phone: "",
    phone_after_hours: "",
    website: "",
    email: "",
    twitter: "",
    facebook: "",
    meta_title: "",
    meta_description: "",
    status: "Active"
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/mapbox/get");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        setStores(result.data);
      } else {
        setAlertMessage(result.error || "Error fetching stores.");
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Failed to fetch stores", error);
      setAlertMessage("Failed to fetch stores: " + error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleInputChange = (e) => {
    setNewStore({ ...newStore, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewStore({ ...newStore, logo: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddStore = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    for (const key in newStore) {
      formData.append(key, newStore[key]);
    }

    try {
      const res = await fetch("/api/mapbox/add", {
        method: "POST",
        body: formData
      });
      const result = await res.json();

      if (res.ok) {
        setAlertMessage("Store added successfully!");
        setShowAlert(true);
        fetchStores();
        setIsModalOpen(false);
        setNewStore({});
        setImagePreview(null);
      } else {
        setAlertMessage(result.error || "Error adding store");
        setShowAlert(true);
      }

      setTimeout(() => setShowAlert(false), 3000);
    } catch (error) {
      console.error("Error adding store", error);
      setAlertMessage("Error adding store: " + error.message);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (window.confirm("Are you sure you want to delete this store?")) {
      try {
        const res = await fetch(`/api/mapbox/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
        const result = await res.json();

        if (res.ok) {
          setAlertMessage("Store deleted successfully!");
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 3000);
          // setShowConfirmationModal(false);
          fetchStores();
        } else {
          setAlertMessage(result.error || "Error deleting store.");
          setShowAlert(true);
        }
      } catch (error) {
        console.error("Error deleting store:", error);
        setAlertMessage("Error deleting store: " + error.message);
        setShowAlert(true);
      } finally {
        setTimeout(() => setShowAlert(false), 3000);
         setShowConfirmationModal(false);
      }
    }
  };

  /* const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(0);
  }; */

  const filteredStores = useMemo(() => {
    if (!Array.isArray(stores)) {
        return [];
    }
    return stores.filter((store) => {
      const matchesSearch =
        store.organisation_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.phone?.includes(searchQuery);

      const matchesStatus = statusFilter === "" || store.status === statusFilter;

      let matchesDate = true;
      if (dateFilter.startDate && dateFilter.endDate && store.createdAt) {
        const createdAt = new Date(store.createdAt);
        const start = new Date(dateFilter.startDate);
        const end = new Date(dateFilter.endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = createdAt >= start && createdAt <= end;
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
     .sort((a, b) => a.organisation_name.localeCompare(b.organisation_name)); // ascending order;
  }, [stores, searchQuery, statusFilter, dateFilter]);

 /*  const paginatedStores = filteredStores.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  ); */

  const paginatedStores = filteredStores.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

   const paginate = (pageNumber) => setCurrentPage(pageNumber);
     // Pagination variables
/*   const totalEntries =filteredStores .length;
  const startEntry = (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalEntries); */

  const totalEntries = filteredStores.length;

const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;

const endEntry = Math.min(currentPage * itemsPerPage, totalEntries);

  const totalPages = Math.ceil(totalEntries / itemsPerPage);

  const renderPagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    if (pageNumbers.length <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startEntry} to {endEntry} of {totalEntries} entries
        </div>

        <ul className="pagination flex items-center space-x-1" role="navigation" aria-label="Pagination">
          <li className="page-item">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
              aria-label="Previous page"
            >
              «
            </button>
          </li>
          
          {pageNumbers.map((number) => (
            <li key={number} className={`page-item ${currentPage === number ? 'bg-red-500 text-white' : ''}`}>
              <button
                onClick={() => paginate(number)}
                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
                aria-label={`Page ${number}`}
              >
                {number}
              </button>
            </li>
          ))}
          
          <li className="page-item">
            <button
              onClick={() => paginate(currentPage + 1)}
              // disabled={currentPage === pageNumbers.length}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-100"
              aria-label="Next page"
            >
              »
            </button>
          </li>
        </ul>
      </div>
    );
  };

  // const pageCount = Math.ceil(filteredStores.length / itemsPerPage);

  // const paginate = (index) => {
  //   if (index >= 0 && index < pageCount) {
  //     setCurrentPage(index);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="bg-white container mx-auto px-4 mt-4 flex justify-center items-center h-screen">
        <p>Loading Mapbox Lists...</p>
      </div>
    );
  }

  return (
     <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Mapbox List</h2>
      </div>
      
      {showAlert && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
          alertMessage.includes("Error") || alertMessage.includes("Failed") 
            ? "bg-red-500 text-white" 
            : "bg-green-500 text-white"
        }`}>
          {alertMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-5">
            {/* Search Input */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon icon="ic:baseline-search" className="w-4 h-4 text-gray-500" />
                </span>
                <input
                  type="text"
          placeholder="Search stores (name, description, email, phone)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Date Range Picker */}
            {/* <div className="w-full col-span-1 md:col-span-1">
              
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  
                  <DateRangePicker onDateChange={handleDateChange} />
                </div>
             
              </div>
            </div> */}

            <div>
              <Link href="/admin/mapbox/create">
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition duration-150"
              >
                + Add Store
              </button>
             </Link>
            </div>
          </div>
          <hr className="border-t border-gray-200 mb-4" />
          {paginatedStores.length === 0 ? (
            <div className="text-center py-8">
              <p>No stores found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Title</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Zipcode</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    { paginatedStores.map((store) => (
                        <tr key={store._id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-bold">{store.organisation_name}</td>
                          <td className="p-2 font bold">{store.phone || "-"}</td>
                          <td className="p-2 font bold">{store.email}</td>
                          <td className="p-2 font bold">{store.zipcode}</td>
                          <td className="p-2 font-semibold">
                            <span className={store.status === "Active" ? "text-green-500" : "text-red-500"}>
                              {store.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                               <Link href={`/admin/mapbox/edit/${store.slug}`}>
                               <button
                                className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center hover:bg-red-200 transition"
                                title="Edit"
                              >
                                <FaEdit className="mr-1" />
                              </button>
                            </Link>
                              <button
                                 onClick={() => handleDeleteStore(store._id)}
                                className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center hover:bg-pink-200 transition"
                                title="Delete"
                              >
                                <Icon icon="mingcute:delete-2-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      )}

    

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete this blog?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}