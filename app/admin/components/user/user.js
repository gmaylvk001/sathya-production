import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Icon } from '@iconify/react';
import DateRangePicker from '@/components/DateRangePicker';

export default function UserComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    user_type: "user",
    status: "Active",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [fetchingUserId, setFetchingUserId] = useState(null);
  const [fetchingOrdersUserId, setFetchingOrdersUserId] = useState(null);
  const [bulkFetchBatch, setBulkFetchBatch] = useState(1000);
  const [isBulkFetching, setIsBulkFetching] = useState(false);
  const [bulkFetchMode, setBulkFetchMode] = useState(null); // "pending" | "refetch"
  const [bulkFetchProgress, setBulkFetchProgress] = useState(null);
  const stopBulkFetchRef = useRef(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get("/api/users/get", { headers });
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      password: "",
      confirmPassword: "",
      user_type: user.user_type,
      status: user.status,
    });
    setCurrentUserId(user._id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleToggleSelect = (userId) => {
    const id = String(userId);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFetchDetails = async (user) => {
    if (!user?._id) return;
    setFetchingUserId(user._id);
    try {
      const response = await axios.post("/api/users/fetch-details", { userId: user._id });
      setAlertMessage(`✅ ${response.data.message || "User details fetched successfully"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Failed to fetch user details");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    } finally {
      setFetchingUserId(null);
    }
  };

  const handleFetchOrders = async (user) => {
    if (!user?._id) return;
    if (!String(user.exist_id || "").trim()) {
      setAlertMessage("❌ This user has no Exist ID");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      return;
    }

    const alreadyFetched = Number(user.orders_fetched) === 1;
    const confirmed = window.confirm(
      alreadyFetched
        ? "Fetch exist orders again into orders_new? Already-copied order numbers will be skipped. Missing live payments, history and cancel requests will be filled if needed."
        : "Fetch exist orders into orders_new and order_details_new, insert payment_new_live, link order_history_new and copy cancel requests to cancel_orders_live?"
    );
    if (!confirmed) return;

    setFetchingOrdersUserId(user._id);
    try {
      const response = await axios.post("/api/users/fetch-orders", { userId: user._id }, { timeout: 300000 });
      setAlertMessage(`✅ ${response.data.message || "Orders fetched successfully"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Failed to fetch orders");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    } finally {
      setFetchingOrdersUserId(null);
    }
  };

  const handleBulkFetchOrders = async (mode = "pending") => {
    const isRefetch = mode === "refetch";
    const confirmed = window.confirm(
      isRefetch
        ? `Re-check exist orders for already-fetched users (${bulkFetchBatch} per batch)? New exist orders will be inserted; already-copied order numbers will be skipped. This can take a long time.`
        : `Fetch exist orders for all pending exist users (${bulkFetchBatch} users per batch)? Already-copied order numbers will be skipped. This can take a long time.`
    );
    if (!confirmed) return;

    stopBulkFetchRef.current = false;
    setIsBulkFetching(true);
    setBulkFetchMode(mode);
    const totals = { batches: 0, processed: 0, fetchedUsers: 0, noOrders: 0, failed: 0, inserted: 0, skipped: 0, remaining: null };
    setBulkFetchProgress({ ...totals, mode });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let afterId = null;
    let errorText = "";
    try {
      while (!stopBulkFetchRef.current) {
        const { data } = await axios.post(
          "/api/users/fetch-orders/bulk",
          { afterId, limit: bulkFetchBatch, mode },
          { headers, timeout: 310000 }
        );
        totals.batches += 1;
        ["processed", "fetchedUsers", "noOrders", "failed", "inserted", "skipped"].forEach((key) => {
          totals[key] += data[key] || 0;
        });
        totals.remaining = data.remaining;
        setBulkFetchProgress({ ...totals, mode });
        afterId = data.lastId;
        if (data.done || !data.processed) break;
      }
    } catch (error) {
      errorText = error.response?.data?.error || error.message || "Bulk fetch failed";
    } finally {
      setIsBulkFetching(false);
      setBulkFetchMode(null);
      const stopped = stopBulkFetchRef.current ? " (stopped)" : "";
      const label = isRefetch ? "Bulk re-fetch" : "Bulk fetch";
      setAlertMessage(
        errorText
          ? `❌ ${errorText}. Done so far: ${totals.processed} users, ${totals.inserted} orders inserted.`
          : `✅ ${label} finished${stopped}: ${totals.processed} users processed, ${totals.fetchedUsers} with work, ${totals.noOrders} without orders, ${totals.failed} failed. Orders inserted: ${totals.inserted}, already existed: ${totals.skipped}.`
      );
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 8000);
      fetchUsers();
    }
  };

  const handleSetStatus = async (user, status) => {
    const label = status === "Inactive" ? "inactive" : "active";
    const confirmed = window.confirm(`Set this user to ${label}?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.post("/api/users/status", {
        userId: user._id,
        status,
      });

      if (response.data.success) {
        setAlertMessage(`✅ ${response.data.message || `User set to ${label} successfully`}`);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchUsers();
      } else {
        setAlertMessage("❌ Error updating user status");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error updating user status");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm("Delete this user? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete("/api/users/delete", {
        data: { userId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(userId)));

      if (response.data.success) {
        setAlertMessage("✅ User deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchUsers();
      } else {
        setAlertMessage("❌ Error deleting user");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting user");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected user(s)? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/users/delete", {
        data: { userIds: selectedIds },
      });

      setAlertMessage(`✅ ${response.data.message || "Users deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting users");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditMode && formData.password !== formData.confirmPassword) {
      setAlertMessage("⚠️ Passwords do not match");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    try {
      if (isEditMode) {
        // Edit existing user
        await axios.put("/api/users/edit", {
          userId: currentUserId,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          status: formData.status,
        });
        setAlertMessage("✅ User updated successfully!");
      } else {
        // Add new user
        await axios.post("/api/users/add", {
          ...formData,
          user_type: "user",
          status: formData.status,
        });
        setAlertMessage("✅ User added successfully!");
      }

      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        setIsModalOpen(false);
      }, 3000);
      
      fetchUsers();
      setTimeout(() => {
      resetForm();
       }, 3000);
    } catch (error) {
      console.log(error);
      setAlertMessage(error.response?.data?.error || "❌ Error processing request");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      password: "",
      confirmPassword: "",
      user_type: "user",
      status: "Active",
    });
    setIsEditMode(false);
    setCurrentUserId(null);
  };

  const filteredUsers = users.filter(user => {
    // Apply search filter
    const matchesSearch = searchQuery === "" || 
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.mobile && user.mobile.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply status filter
    const matchesStatus = statusFilter === "All" || user.status === statusFilter;
    
    // Apply date filter
    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && user.createdAt) {
      const userDate = new Date(user.createdAt);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      
      // Set time to beginning and end of day for proper date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      matchesDate = userDate >= startDate && userDate <= endDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const existUsersCount = users.filter((user) => String(user.exist_id || "").trim()).length;
  const pendingOrdersFetchCount = users.filter(
    (user) => String(user.exist_id || "").trim() && Number(user.orders_fetched) !== 1
  ).length;
  const alreadyFetchedOrdersCount = users.filter(
    (user) => String(user.exist_id || "").trim() && Number(user.orders_fetched) === 1
  ).length;

  // Pagination calculations
  const totalEntries = filteredUsers.length;
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const startEntry = indexOfFirstUser + 1;
  const endEntry = Math.min(indexOfLastUser, totalEntries);
  const currentPageIds = currentUsers.map((user) => String(user._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelectCurrentPage = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  const selectAllFiltered = () => {
    setSelectedIds(filteredUsers.map((user) => String(user._id)));
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1); // Reset to first page when date changes
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: null,
      endDate: null
    });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startEntry} to {endEntry} of {filteredUsers.length} entries
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

  const modalTitle = isEditMode ? "Edit User" : "Add User";
  const submitButtonText = isEditMode ? "Update User" : "Add User";

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">User List</h2>
      </div>
  
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Date Range Picker */}
              <div className="w-full col-span-1 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateRangePicker onDateChange={handleDateChange} />
                  </div>
                </div>
              </div>
      
              {/* Add User Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition"
                >
                  + Add User
                </button>
              </div>
            </div>
            {showAlert && !isModalOpen && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-700">{selectedIds.length} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
                  >
                    {isBulkDeleting ? "Deleting..." : "Delete selected"}
                  </button>
                </>
              )}
              {filteredUsers.length > 0 && selectedIds.length !== filteredUsers.length && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md transition text-sm"
                >
                  Select all {filteredUsers.length}
                </button>
              )}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md transition text-sm"
                >
                  Clear
                </button>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={bulkFetchBatch}
                  onChange={(e) => setBulkFetchBatch(Number(e.target.value))}
                  disabled={isBulkFetching}
                  className="p-2 border border-gray-300 rounded-md text-sm"
                  title="Users per batch"
                >
                  <option value={100}>100 per batch</option>
                  <option value={500}>500 per batch</option>
                  <option value={1000}>1000 per batch</option>
                </select>
                {isBulkFetching ? (
                  <button
                    type="button"
                    onClick={() => { stopBulkFetchRef.current = true; }}
                    className="p-2 border border-red-400 text-red-600 hover:bg-red-50 rounded-md transition text-sm"
                  >
                    Stop after this batch
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkFetchOrders("pending")}
                      disabled={pendingOrdersFetchCount === 0 || isBulkDeleting || Boolean(fetchingOrdersUserId)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-sm disabled:opacity-50"
                      title="Fetch exist orders for users not yet marked as fetched"
                    >
                      Bulk Fetch Orders ({pendingOrdersFetchCount} pending)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkFetchOrders("refetch")}
                      disabled={alreadyFetchedOrdersCount === 0 || isBulkDeleting || Boolean(fetchingOrdersUserId)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition text-sm disabled:opacity-50"
                      title="Re-check already-fetched users for new exist orders"
                    >
                      Bulk Re-Fetch Orders ({alreadyFetchedOrdersCount} fetched)
                    </button>
                  </>
                )}
                <span
                  className="inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-yellow-900"
                  style={{ backgroundColor: "#fff59d" }}
                >
                  Exist users: {existUsersCount}
                </span>
              </div>
            </div>
            {bulkFetchProgress && (
              <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {isBulkFetching
                  ? `Bulk ${bulkFetchMode === "refetch" ? "re-fetching" : "fetching"} orders… `
                  : `Last bulk ${bulkFetchProgress.mode === "refetch" ? "re-fetch" : "fetch"}: `}
                batches {bulkFetchProgress.batches}, users processed {bulkFetchProgress.processed}, fetched {bulkFetchProgress.fetchedUsers},
                no orders {bulkFetchProgress.noOrders}, failed {bulkFetchProgress.failed} · orders inserted {bulkFetchProgress.inserted},
                already existed {bulkFetchProgress.skipped}
                {bulkFetchProgress.remaining != null ? ` · remaining users ${bulkFetchProgress.remaining}` : ""}
              </div>
            )}
            <hr className="border-t border-gray-200 mb-4" />
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 w-10">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectCurrentPage}
                      disabled={currentUsers.length === 0}
                    />
                  </th>
                  <th className="p-2">Exist ID</th>
                  <th className="p-2">Email Address</th>
                  <th className="p-2">Display Name</th>
                  <th className="p-2">Last Name</th>
                  <th className="p-2">Mobile Number</th>
                  <th className="p-2">User Type</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Notify Status</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Updated At</th>
                  <th className="p-2">User Details</th>
                  <th className="p-2">Orders fetched</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user, index) => (
                    <tr key={user._id || index} className="text-center border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(String(user._id))}
                          onChange={() => handleToggleSelect(user._id)}
                        />
                      </td>
                      <td className="p-2">{user.exist_id || '-'}</td>
                      <td className="p-2 font-bold">{user.email || '-'}</td>
                      <td className="p-2">{user.name || '-'}</td>
                      <td className="p-2">{user.last_name || '-'}</td>
                      <td className="p-2">{user.mobile || '-'}</td>
                      <td className="p-2 font-semibold">{user.user_type || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status || '-'}
                        </span>
                      </td>
                      <td className="p-2">{user.notify_status ?? '-'}</td>
                      <td className="p-2">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        {user.details_fetched ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Success
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1 justify-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Un fetched
                            </span>
                            {String(user.exist_id || "").trim() ? (
                              <button
                                onClick={() => handleFetchDetails(user)}
                                disabled={fetchingUserId === user._id}
                                className="px-2 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium disabled:opacity-50"
                                title="Fetch user details"
                              >
                                {fetchingUserId === user._id ? "Fetching..." : "Fetch"}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {!String(user.exist_id || "").trim() ? (
                          "-"
                        ) : (
                        <div className="inline-flex items-center gap-1 justify-center">
                          {Number(user.orders_fetched) === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Fetched
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFetchOrders(user)}
                              disabled={fetchingOrdersUserId === user._id || isBulkDeleting}
                              className="inline-flex items-center justify-center text-gray-400 disabled:opacity-50"
                              title={fetchingOrdersUserId === user._id ? "Fetching orders..." : "Fetch exist orders"}
                            >
                              <Icon icon="mdi:close-circle-outline" width="20" />
                            </button>
                          )}
                          {Number(user.orders_fetched) === 1 && String(user.exist_id || "").trim() ? (
                            <button
                              type="button"
                              onClick={() => handleFetchOrders(user)}
                              disabled={fetchingOrdersUserId === user._id || isBulkDeleting}
                              className="px-2 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-medium disabled:opacity-50"
                              title={fetchingOrdersUserId === user._id ? "Fetching orders..." : "Fetch exist orders again"}
                            >
                              {fetchingOrdersUserId === user._id ? "Fetching..." : "Fetch"}
                            </button>
                          ) : null}
                        </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" />
                          </button>
                          {user.status === "Active" ? (
                            <button
                              onClick={() => handleSetStatus(user, "Inactive")}
                              className="w-7 h-7 bg-orange-100 text-orange-600 rounded-full inline-flex items-center justify-center"
                              title="Set Inactive"
                            >
                              <Icon icon="mdi:account-off-outline" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetStatus(user, "Active")}
                              className="w-7 h-7 bg-green-100 text-green-600 rounded-full inline-flex items-center justify-center"
                              title="Set Active"
                            >
                              <Icon icon="mdi:account-check-outline" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user._id)}
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
                    <td colSpan="14" className="p-2 text-center text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination()}
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-96 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">{modalTitle}</h2>
            <button 
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }} 
              className="absolute top-3 right-3 text-red-500 text-xl"
            >
              ×
            </button>
            {showAlert && <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>}
            <form onSubmit={handleSubmit} className="mt-4">
              <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
              <input  type="tel" name="mobile" placeholder="Mobile Number" value={formData.mobile} onChange={handleChange}   onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
 className="w-full border p-2 mb-2 rounded" required />
              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
              
              {!isEditMode && (
                <>
                  <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
                  <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
                </>
              )}
              
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded w-full mt-2">
                {submitButtonText}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}