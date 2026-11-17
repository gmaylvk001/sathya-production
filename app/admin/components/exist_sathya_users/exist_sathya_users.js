import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import DateRangePicker from "@/components/DateRangePicker";
import { formatExistDateYmd } from "@/lib/existSheetDateFormat";

const emptyForm = {
  exist_id: "",
  first_name: "",
  last_name: "",
  store_id: "",
  role_id: "",
  zone_id: "",
  email: "",
  phone: "",
  password: "",
  notify_pincode: "",
  notify_status: 0,
  confirmed: "",
};

const EMPTY_SUMMARY = {
  total: 0,
  moved: 0,
  notMoved: 0,
  roleOptions: [],
  notMovedByRole: {},
};

const EMPTY_ROLE_FILTER = "__empty__";

// Compact page list with ellipses so 30k+ pages do not render as 30k buttons.
function getPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("left-ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < total - 1) items.push("right-ellipsis");
  items.push(total);
  return items;
}

export default function ExistSathyaUsersComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [formData, setFormData] = useState(emptyForm);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [moveFilter, setMoveFilter] = useState("");
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("100");
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [movingUserId, setMovingUserId] = useState(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const bulkAbortRef = useRef(false);

  const requestIdRef = useRef(0);

  const buildListParams = () => {
    const params = { page: currentPage, limit: itemsPerPage };
    if (debouncedSearch) params.q = debouncedSearch;
    if (roleFilter) params.role = roleFilter;
    if (moveFilter) params.move = moveFilter;
    if (dateRange.start && dateRange.end) {
      params.start = dateRange.start;
      params.end = dateRange.end;
    }
    return params;
  };

  const loadUsers = async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await axios.get("/api/exist_sathya_users/get", {
        headers: { "Cache-Control": "no-store" },
        params: { ...buildListParams(), t: Date.now() },
      });
      if (requestId !== requestIdRef.current) return;
      const body = response.data || {};
      setUsers(Array.isArray(body.data) ? body.data : []);
      setTotalCount(Number(body.total) || 0);
      setPageCount(Math.max(1, Number(body.totalPages) || 1));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error fetching exist sathya users:", error);
      setUsers([]);
      setTotalCount(0);
      setLoadError(error.response?.data?.message || "Could not load users. Please try again.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await axios.get("/api/exist_sathya_users/summary", {
        headers: { "Cache-Control": "no-store" },
        params: { t: Date.now() },
      });
      setSummary({ ...EMPTY_SUMMARY, ...(response.data || {}) });
    } catch (error) {
      console.error("Error fetching exist sathya users summary:", error);
    }
  };

  // Refreshes the current page and the counters. Called after every write.
  const fetchUsers = () => {
    loadUsers();
    loadSummary();
  };

  const refreshRef = useRef(null);
  refreshRef.current = fetchUsers;

  // Reload the current page whenever page or filters change.
  useEffect(() => {
    loadUsers();
  }, [currentPage, debouncedSearch, roleFilter, moveFilter, dateRange]);

  // Keep the page in range after the total shrinks (e.g. after deletes).
  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadSummary();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshRef.current?.();
      }
    };
    const refreshOnFocus = () => refreshRef.current?.();

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (user) => {
    setFormData({
      exist_id: user.exist_id || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      store_id: user.store_id || "",
      role_id: user.role_id || "",
      zone_id: user.zone_id || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      notify_pincode: user.notify_pincode || "",
      notify_status: user.notify_status ?? 0,
      confirmed: user.confirmed ?? "",
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

  const handleDelete = async (userId) => {
    try {
      const response = await axios.delete("/api/exist_sathya_users/delete", {
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
      setAlertMessage("❌ Error deleting user");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleMove = async (user) => {
    const userType = String(user.role_id ?? "").trim() === "1" ? "admin" : "user";
    const confirmed = window.confirm(
      `Move this user to live ${userType === "admin" ? "System Users" : "Users"} as ${userType}?`
    );
    if (!confirmed) {
      return;
    }

    setMovingUserId(user._id);
    try {
      const response = await axios.post("/api/exist_sathya_users/move", { id: user._id });
      setAlertMessage(`✅ ${response.data.message || "User moved successfully"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Failed to move user");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
    } finally {
      setMovingUserId(null);
    }
  };

  const BULK_BATCH = 100;

  const runBulkMove = async ({ mode, ids = [], roleId = "" }) => {
    bulkAbortRef.current = false;
    setIsBulkMoving(true);
    setBulkProgress({
      running: true,
      mode,
      moved: 0,
      skipped: 0,
      failed: 0,
      scanned: 0,
    });

    try {
      const totals = { moved: 0, skipped: 0, failed: 0, scanned: 0 };
      const addTotals = (data) => {
        totals.moved += data.moved || 0;
        totals.skipped += data.skippedCount || 0;
        totals.failed += data.failed || 0;
        totals.scanned += data.scanned || 0;
        setBulkProgress((prev) => ({
          ...prev,
          ...totals,
        }));
      };

      if (mode === "selected") {
        for (let i = 0; i < ids.length; i += BULK_BATCH) {
          if (bulkAbortRef.current) break;
          const chunk = ids.slice(i, i + BULK_BATCH);
          const response = await axios.post("/api/exist_sathya_users/move-bulk", {
            mode: "selected",
            ids: chunk,
            batchSize: BULK_BATCH,
          }, { timeout: 300000 });
          addTotals(response.data || {});
        }
      } else {
        let cursor = null;
        let done = false;
        while (!done) {
          if (bulkAbortRef.current) break;
          const payload = {
            mode,
            cursor,
            batchSize: BULK_BATCH,
          };
          if (mode === "role") payload.role_id = roleId;
          const response = await axios.post("/api/exist_sathya_users/move-bulk", payload, { timeout: 300000 });
          const data = response.data || {};
          cursor = data.cursor || null;
          done = Boolean(data.done);
          addTotals(data);
          if (!data.scanned) break;
        }
      }

      const stopped = bulkAbortRef.current ? " (stopped)" : "";
      setAlertMessage(
        `✅ Bulk move completed${stopped}. Moved ${totals.moved}, skipped ${totals.skipped}, failed ${totals.failed}`
      );
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      setSelectedIds([]);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Bulk move failed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      fetchUsers();
    } finally {
      setIsBulkMoving(false);
      setBulkProgress((prev) => (prev ? { ...prev, running: false } : prev));
    }
  };

  const handleMoveSelected = async () => {
    // Already-moved rows are skipped by the server, so no client-side filter is needed.
    const ids = [...selectedIds];
    if (!ids.length) {
      setAlertMessage("❌ No not-moved users selected");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    const confirmed = window.confirm(`Move ${ids.length} selected not-moved user(s) in batches of ${BULK_BATCH}?`);
    if (!confirmed) return;
    await runBulkMove({ mode: "selected", ids });
  };

  const handleMoveRole = async () => {
    if (!roleFilter) return;
    const roleLabel = roleFilter === "__empty__" ? "No role" : `Role ID ${roleFilter}`;
    const confirmed = window.confirm(
      `Move all not-moved users with ${roleLabel}? This runs in batches of ${BULK_BATCH}.`
    );
    if (!confirmed) return;
    await runBulkMove({ mode: "role", roleId: roleFilter });
  };

  // Move the not-moved users inside a page range, using the current search/filters.
  const MAX_RANGE_PAGES = 250;

  const showTimedAlert = (message, ms = 4000) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), ms);
  };

  const handleMoveRange = async () => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);

    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
      showTimedAlert("❌ Enter a valid page range (from must be 1 or more, and not above to)");
      return;
    }
    if (to - from + 1 > MAX_RANGE_PAGES) {
      showTimedAlert(`❌ Select at most ${MAX_RANGE_PAGES} pages at a time`);
      return;
    }
    if (from > pageCount) {
      showTimedAlert(`❌ Only ${pageCount} page(s) available with the current filters`);
      return;
    }

    setIsRangeLoading(true);
    try {
      const { page: _page, ...filters } = buildListParams();
      const response = await axios.get("/api/exist_sathya_users/range-ids", {
        headers: { "Cache-Control": "no-store" },
        params: { ...filters, fromPage: from, toPage: Math.min(to, pageCount), t: Date.now() },
      });
      const ids = response.data?.ids || [];
      if (!ids.length) {
        showTimedAlert("❌ No not-moved users in that page range");
        return;
      }
      const confirmed = window.confirm(
        `Move ${ids.length} not-moved user(s) from pages ${from} to ${Math.min(to, pageCount)}? This runs in batches of ${BULK_BATCH}.`
      );
      if (!confirmed) return;
      await runBulkMove({ mode: "selected", ids });
    } catch (error) {
      showTimedAlert(error.response?.data?.message || "❌ Could not load the page range", 5000);
    } finally {
      setIsRangeLoading(false);
    }
  };

  const handleMoveAll = async () => {
    const confirmed = window.confirm(
      `Move ALL ${notMovedCount} not-moved users? This runs in batches of ${BULK_BATCH} and can take a while.`
    );
    if (!confirmed) return;
    const typed = window.prompt("Type MOVE ALL to confirm:");
    if (typed !== "MOVE ALL") {
      setAlertMessage("❌ Move all cancelled");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    await runBulkMove({ mode: "all" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        exist_id: formData.exist_id || null,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        store_id: formData.store_id || null,
        role_id: formData.role_id || null,
        zone_id: formData.zone_id || null,
        email: formData.email || null,
        phone: formData.phone,
        notify_pincode: formData.notify_pincode || null,
        notify_status: formData.notify_status === "" ? 0 : Number(formData.notify_status),
        confirmed: formData.confirmed === "" ? null : Number(formData.confirmed),
      };

      if (isEditMode) {
        if (formData.password) {
          payload.password = formData.password;
        }
        await axios.put("/api/exist_sathya_users/edit", {
          userId: currentUserId,
          ...payload,
        });
        setAlertMessage("✅ User updated successfully!");
      } else {
        if (formData.password) {
          payload.password = formData.password;
        }
        await axios.post("/api/exist_sathya_users/add", payload);
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
      setAlertMessage(error.response?.data?.error || "❌ Error processing request");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setIsEditMode(false);
    setCurrentUserId(null);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setAlertMessage("❌ Please choose an Excel (.xlsx), CSV (.csv), SQL (.sql), or XML (.xml) file");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const name = importFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv") && !name.endsWith(".sql") && !name.endsWith(".xml")) {
      setAlertMessage("❌ Only .xlsx, .csv, .sql, and .xml files are allowed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const data = new FormData();
    data.append("excel", importFile);
    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await axios.post("/api/exist_sathya_users/import", data);
      setImportResult(response.data);
      setAlertMessage(response.data.message || "✅ Import completed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      setImportFile(null);
      fetchUsers();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Import failed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  // Counters come from the server summary (whole table), not from the current page.
  const roleOptions = summary.roleOptions || [];
  const notMovedCount = summary.notMoved || 0;
  const roleNotMovedCount = roleFilter
    ? (summary.notMovedByRole?.[roleFilter] || 0)
    : 0;
  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalCount);
  const currentPageIds = users.map((user) => String(user._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelectCurrentPage = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  // Selection is limited to the rows on the current page; bulk actions that span
  // the whole table use the server-side Move role / Move all actions.
  const selectAllOnPage = () => {
    setSelectedIds(currentPageIds);
  };

  const selectNotMovedOnPage = () => {
    setSelectedIds(
      users.filter((user) => !user.is_moved).map((user) => String(user._id))
    );
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
      const response = await axios.delete("/api/exist_sathya_users/delete", {
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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Convert the picker's dates into ISO bounds using the browser's local day edges.
  const toDayBoundary = (value, isEnd) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date.toISOString();
  };

  const handleDateChange = ({ startDate, endDate }) => {
    setDateRange({
      start: toDayBoundary(startDate, false),
      end: toDayBoundary(endDate, true),
    });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (pageCount <= 1) return null;

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {startEntry} to {endEntry} of {totalCount} entries
        </div>
        <div className="pagination flex items-center space-x-1">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
            }`}
          >
            «
          </button>
          {getPageItems(currentPage, pageCount).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                onClick={() => paginate(item)}
                className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                  currentPage === item ? "bg-red-500 text-white" : "text-black bg-white hover:bg-gray-100"
                }`}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="px-2 text-gray-500">…</span>
            )
          )}
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === pageCount}
            className={`px-3 py-1.5 border border-gray-300 rounded-md ${
              currentPage === pageCount ? "text-gray-400 cursor-not-allowed" : "text-black bg-white hover:bg-gray-100"
            }`}
          >
            »
          </button>
        </div>
      </div>
    );
  };

  const modalTitle = isEditMode ? "Edit Exist User" : "Add Exist User";
  const submitButtonText = isEditMode ? "Update User" : "Add User";

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Sathya Exist Users</h2>
      </div>

      <>
          <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role ID</label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All roles</option>
                  <option value="__empty__">No role</option>
                  {roleOptions.map((roleId) => (
                    <option key={roleId} value={roleId}>{roleId}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Move status</label>
                <select
                  value={moveFilter}
                  onChange={(e) => {
                    setMoveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All users</option>
                  <option value="unmoved">Un moved</option>
                  <option value="moved">Moved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <DateRangePicker onDateChange={handleDateChange} />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setImportResult(null);
                    setImportFile(null);
                    setIsImportOpen(true);
                  }}
                  className="p-2 border border-red-500 text-red-500 hover:bg-red-50 rounded-md transition"
                >
                  Import Excel/CSV/SQL/XML
                </button>
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
            {showAlert && !isModalOpen && !isImportOpen && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
            )}
            <div className="bg-red-600 text-white px-4 py-2 rounded-md mb-4 font-semibold">
              Not moved users: {notMovedCount}
              {isLoading && users.length > 0 && (
                <span className="ml-3 text-xs font-normal opacity-80">Updating...</span>
              )}
            </div>
            {bulkProgress && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md mb-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {bulkProgress.running ? "Bulk move running..." : "Bulk move finished."}
                    {" "}Moved {bulkProgress.moved}, skipped {bulkProgress.skipped}, failed {bulkProgress.failed}, scanned {bulkProgress.scanned}
                  </span>
                  {bulkProgress.running && (
                    <button
                      type="button"
                      onClick={() => { bulkAbortRef.current = true; }}
                      className="px-2 py-1 border border-blue-400 rounded text-xs"
                    >
                      Stop after this batch
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-700">{selectedIds.length} selected</span>
                  <button
                    onClick={handleMoveSelected}
                    disabled={isBulkMoving || isBulkDeleting}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition disabled:opacity-50 text-sm"
                  >
                    {isBulkMoving ? "Moving..." : "Move selected"}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting || isBulkMoving}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
                  >
                    {isBulkDeleting ? "Deleting..." : "Delete selected"}
                  </button>
                </>
              )}
              {users.some((user) => !user.is_moved) && (
                <button
                  type="button"
                  onClick={selectNotMovedOnPage}
                  disabled={isBulkMoving}
                  className="p-2 border border-green-600 text-green-700 hover:bg-green-50 rounded-md transition text-sm disabled:opacity-50"
                >
                  Select not-moved on this page
                </button>
              )}
              {users.length > 0 && !allCurrentSelected && (
                <button
                  type="button"
                  onClick={selectAllOnPage}
                  className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md transition text-sm"
                >
                  Select all on this page ({users.length})
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
              {roleFilter && (
                <button
                  type="button"
                  onClick={handleMoveRole}
                  disabled={isBulkMoving || roleNotMovedCount === 0}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition text-sm disabled:opacity-50"
                >
                  Move role ({roleNotMovedCount})
                </button>
              )}
              <button
                type="button"
                onClick={handleMoveAll}
                disabled={isBulkMoving || notMovedCount === 0}
                className="p-2 border border-green-600 text-green-700 hover:bg-green-50 rounded-md transition text-sm disabled:opacity-50"
              >
                Move all not-moved
              </button>
              <div className="inline-flex items-center gap-1 text-sm">
                <span className="text-gray-700">Move pages</span>
                <input
                  type="number"
                  min="1"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-20 p-1.5 border border-gray-300 rounded-md"
                  aria-label="From page"
                />
                <span className="text-gray-700">to</span>
                <input
                  type="number"
                  min="1"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-20 p-1.5 border border-gray-300 rounded-md"
                  aria-label="To page"
                />
                <button
                  type="button"
                  onClick={handleMoveRange}
                  disabled={isBulkMoving || isRangeLoading}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition text-sm disabled:opacity-50"
                  title={`Moves the not-moved users on those pages (${itemsPerPage} per page), max ${MAX_RANGE_PAGES} pages`}
                >
                  {isRangeLoading ? "Loading..." : "Move range"}
                </button>
              </div>
              <span className="ml-auto text-xs text-gray-500 inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#fff9c4" }} />
                Light yellow = password is empty. Move copies password if present; if first/last name exists and password is empty it generates first-letter + 1234567 + first-letter; if no first and last name, password stays null. Email is optional.
              </span>
            </div>
            <hr className="border-t border-gray-200 mb-4" />
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 w-10">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectCurrentPage}
                      disabled={users.length === 0}
                    />
                  </th>
                  <th className="p-2">Exist ID</th>
                  <th className="p-2">First Name</th>
                  <th className="p-2">Last Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Store ID</th>
                  <th className="p-2">Role ID</th>
                  <th className="p-2">Notify Status</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <tr
                      key={user._id || index}
                      className="text-center border-b"
                      style={!user.has_password ? { backgroundColor: "#fff9c4" } : undefined}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(String(user._id))}
                          onChange={() => handleToggleSelect(user._id)}
                        />
                      </td>
                      <td className="p-2">{user.exist_id || "-"}</td>
                      <td className="p-2 font-bold">{user.first_name || "-"}</td>
                      <td className="p-2">{user.last_name || "-"}</td>
                      <td className="p-2">{user.email || "-"}</td>
                      <td className="p-2">{user.phone || "-"}</td>
                      <td className="p-2">{user.store_id || "-"}</td>
                      <td className="p-2">{user.role_id || "-"}</td>
                      <td className="p-2">{user.notify_status ?? 0}</td>
                      <td className="p-2">
                        {formatExistDateYmd(user.created_at)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          {user.is_moved ? (
                            <span className="px-2 h-7 bg-gray-100 text-gray-500 rounded-full inline-flex items-center justify-center text-xs font-medium">
                              Moved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMove(user)}
                              disabled={movingUserId === user._id || isBulkMoving}
                              className="px-2 h-7 bg-green-100 text-green-700 rounded-full inline-flex items-center justify-center text-xs font-medium disabled:opacity-50"
                              title="Move to Users"
                            >
                              {movingUserId === user._id ? "Moving..." : "Move"}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(user)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Icon icon="mingcute:edit-line" />
                          </button>
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
                    <td colSpan="11" className="p-2 text-center">
                      {isLoading ? (
                        <span className="text-gray-500">Loading...</span>
                      ) : loadError ? (
                        <span className="text-red-600">
                          {loadError}
                          <button type="button" onClick={fetchUsers} className="underline ml-2">
                            Retry
                          </button>
                        </span>
                      ) : (
                        <span className="text-gray-500">No users found.</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination()}
          </div>
      </>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[28rem] relative max-h-[90vh] overflow-y-auto">
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
            {showAlert && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
            )}
            <form onSubmit={handleSubmit} className="mt-4">
              <input type="text" name="exist_id" placeholder="Exist ID (optional)" value={formData.exist_id} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="text" name="first_name" placeholder="First Name (optional)" value={formData.first_name} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="text" name="last_name" placeholder="Last Name (optional)" value={formData.last_name} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="email" name="email" placeholder="Email (optional)" value={formData.email} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="w-full border p-2 mb-2 rounded" required />
              <input
                type="password"
                name="password"
                placeholder={isEditMode ? "Password (leave blank to keep)" : "Password (optional)"}
                value={formData.password}
                onChange={handleChange}
                className="w-full border p-2 mb-2 rounded"
              />
              <input type="text" name="store_id" placeholder="Store ID (optional)" value={formData.store_id} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="text" name="role_id" placeholder="Role ID (optional)" value={formData.role_id} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="text" name="zone_id" placeholder="Zone ID (optional)" value={formData.zone_id} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="text" name="notify_pincode" placeholder="Notify Pincode (optional)" value={formData.notify_pincode} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="number" name="notify_status" placeholder="Notify Status (default 0)" value={formData.notify_status} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <input type="number" name="confirmed" placeholder="Confirmed (optional)" value={formData.confirmed} onChange={handleChange} className="w-full border p-2 mb-2 rounded" />
              <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded w-full mt-2">
                {submitButtonText}
              </button>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[28rem] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">Import Excel / CSV / SQL / XML</h2>
            <button
              onClick={() => {
                setIsImportOpen(false);
                setImportFile(null);
                setImportResult(null);
              }}
              className="absolute top-3 right-3 text-red-500 text-xl"
            >
              ×
            </button>
            {showAlert && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
            )}
            <p className="text-sm text-gray-600 mt-4 mb-2">
              Required column: <b>phone</b>.
              Optional: <b>exist_id</b> (or <b>id</b>), <b>first_name</b>, <b>email</b>, <b>password</b>, <b>created_at</b>, <b>updated_at</b> and other columns can be empty.
              If created_at or updated_at is empty, today&apos;s date is used.
            </p>
            <a
              href="/api/exist_sathya_users/import/sample"
              className="inline-block text-sm text-red-500 hover:underline mb-3"
            >
              Download sample file
            </a>
            <form onSubmit={handleImportSubmit}>
              <input
                type="file"
                accept=".xlsx,.csv,.sql,.xml"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full border p-2 mb-3 rounded"
                required
              />
              <button
                type="submit"
                disabled={isImporting}
                className="bg-red-500 text-white px-4 py-2 rounded w-full disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import File"}
              </button>
            </form>
            {importResult && (
              <div className="mt-4 text-sm">
                <p>Added: {importResult.addedCount || 0}</p>
                <p>Skipped existing exist_id: {importResult.skippedExistIdCount || 0}</p>
                <p>Skipped existing email and phone: {importResult.skippedExistingCount || 0}</p>
                <p>Other skipped: {(importResult.skippedCount || 0) - (importResult.skippedExistingCount || 0)}</p>
                <p>Saved to skipped module: {importResult.skippedSavedCount || 0}</p>
                {importResult.skippedEmails?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-gray-600">
                    {importResult.skippedEmails.map((item, index) => (
                      <div key={index}>Row {item.row}: {item.email || "-"} / {item.phone || "-"} already exists (not inserted)</div>
                    ))}
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-red-600">
                    {importResult.errors.map((item, index) => (
                      <div key={index}>Row {item.row}: {item.error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
