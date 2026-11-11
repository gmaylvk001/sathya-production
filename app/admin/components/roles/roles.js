"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from '@iconify/react';
import DateRangePicker from '@/components/DateRangePicker';
import { useRouter } from "next/navigation";

export default function RolesComponent() {
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/roles/get");
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionId = (permission) => {
    if (!permission) return "";
    if (typeof permission === "string") return permission;
    return permission._id ? String(permission._id) : "";
  };

  const handleDelete = async (roleId) => {
    try {
      const response = await axios.delete(`/api/roles/delete`, {
        data: { roleId },
      });

      if (response.data.success) {
        setAlertMessage("✅ Role deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchRoles();
      } else {
        setAlertMessage("❌ Error deleting role");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      setAlertMessage("❌ Error deleting role");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const filteredRoles = roles.filter(role => {
    const permissionNames = (role.permissions || []).map((permission) => permission?.name || "").join(" ");
    const matchesSearch = searchQuery === "" ||
      (role.name && role.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (role.slug && role.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      permissionNames.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && role.createdAt) {
      const roleDate = new Date(role.createdAt);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      matchesDate = roleDate >= startDate && roleDate <= endDate;
    }

    return matchesSearch && matchesDate;
  });

  const totalEntries = filteredRoles.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
  const startEntry = indexOfFirstItem + 1;
  const endEntry = Math.min(indexOfLastItem, totalEntries);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startEntry} to {endEntry} of {filteredRoles.length} entries
        </div>

        <div className="pagination flex items-center space-x-1">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-black bg-white hover:bg-gray-100"
            }`}
            aria-label="Previous page"
          >
            «
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                currentPage === i + 1
                  ? "bg-red-500 text-white"
                  : "text-black bg-white hover:bg-gray-100"
              }`}
              aria-label={`Page ${i + 1}`}
              aria-current={currentPage === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-black bg-white hover:bg-gray-100"
            }`}
            aria-label="Next page"
          >
            »
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Role List</h2>
      </div>

      {showAlert && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">
          {alertMessage}
        </div>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="w-full col-span-1 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateRangePicker onDateChange={handleDateChange} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => router.push("/admin/roles/create")}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                >
                  + Add Role
                </button>
              </div>
            </div>
            <hr className="border-t border-gray-200 mb-4" />
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Name</th>
                  <th className="p-2">Slug</th>
                  <th className="p-2">Permissions</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRoles.length > 0 ? (
                  currentRoles.map((role, index) => (
                    <tr key={role._id || index} className="text-center border-b">
                      <td className="p-2 font-bold">{role.name || '-'}</td>
                      <td className="p-2">{role.slug || '-'}</td>
                      <td className="p-2">
                        {(role.permissions || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {role.permissions.map((permission) => (
                              <span
                                key={getPermissionId(permission)}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {permission?.name || '-'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2">{role.description || '-'}</td>
                      <td className="p-2">
                        {role.createdAt ? new Date(role.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => router.push(`/admin/roles/edit/${role._id}`)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" />
                          </button>
                          <button
                            onClick={() => handleDelete(role._id)}
                            className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-2 text-center text-gray-500">No roles found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination()}
          </div>
        </>
      )}
    </div>
  );
}
