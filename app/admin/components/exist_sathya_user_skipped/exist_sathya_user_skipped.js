import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

export default function ExistSathyaUserSkippedComponent() {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/exist_sathya_user_skipped/get", {
        headers: { "Cache-Control": "no-store" },
        params: { t: Date.now() },
      });
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching skipped exist users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const showMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleToggleSelect = (userId) => {
    const id = String(userId);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm("Delete this skipped user?");
    if (!confirmed) return;

    try {
      const response = await axios.delete("/api/exist_sathya_user_skipped/delete", {
        data: { userId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(userId)));
      showMessage(`✅ ${response.data.message || "Skipped user deleted"}`);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting skipped user");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected skipped user(s)?`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_user_skipped/delete", {
        data: { userIds: selectedIds },
      });
      showMessage(`✅ ${response.data.message || "Skipped users deleted"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting skipped users");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!rows.length) return;
    const confirmed = window.confirm(
      `Delete ALL ${rows.length} skipped users? This cannot be undone.`
    );
    if (!confirmed) return;

    const typed = window.prompt("Type DELETE ALL to confirm:");
    if (typed !== "DELETE ALL") {
      showMessage("❌ Full delete cancelled");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_user_skipped/delete", {
        data: { deleteAll: true },
      });
      showMessage(`✅ ${response.data.message || "All skipped users deleted"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting skipped users");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const reasonOptions = [...new Set(rows.map((row) => String(row.skipped_reason || "").trim()).filter(Boolean))];

  const filteredRows = rows.filter((row) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === ""
      || String(row.exist_id || "").toLowerCase().includes(query)
      || String(row.email || "").toLowerCase().includes(query)
      || String(row.phone || "").toLowerCase().includes(query)
      || String(row.skipped_reason || "").toLowerCase().includes(query);
    const matchesReason = reasonFilter === "" || String(row.skipped_reason || "") === reasonFilter;
    return matchesSearch && matchesReason;
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentRows = filteredRows.slice(indexOfFirst, indexOfLast);
  const currentPageIds = currentRows.map((row) => String(row._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelectCurrentPage = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Sathya Exist User Skipped</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search exist id, email, phone, reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skipped reason</label>
              <select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All reasons</option>
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
          </div>

          {showAlert && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 text-center">{alertMessage}</div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {selectedIds.length > 0 && (
              <>
                <span className="text-sm text-gray-700">{selectedIds.length} selected</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
                >
                  {isBulkDeleting ? "Deleting..." : "Delete selected"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md text-sm"
                >
                  Clear
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={isBulkDeleting || rows.length === 0}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting..." : `Delete all (${rows.length})`}
            </button>
            <span className="ml-auto text-sm text-gray-600">Total skipped: {rows.length}</span>
          </div>

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={toggleSelectCurrentPage}
                    disabled={currentRows.length === 0}
                  />
                </th>
                <th className="p-2">Exist ID</th>
                <th className="p-2">Email</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Skipped Reason</th>
                <th className="p-2">Created At</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((row) => (
                  <tr key={row._id} className="text-center border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(row._id))}
                        onChange={() => handleToggleSelect(row._id)}
                      />
                    </td>
                    <td className="p-2">{row.exist_id || "-"}</td>
                    <td className="p-2">{row.email || "-"}</td>
                    <td className="p-2">{row.phone || "-"}</td>
                    <td className="p-2">{row.skipped_reason || "-"}</td>
                    <td className="p-2">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(row._id)}
                        className="w-7 h-7 bg-pink-100 text-pink-600 rounded-full inline-flex items-center justify-center"
                        title="Delete"
                      >
                        <Icon icon="mingcute:delete-2-line" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-2 text-center text-gray-500">No skipped users found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirst + 1} to {Math.min(indexOfLast, filteredRows.length)} of {filteredRows.length} entries
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === 1 ? "text-gray-400" : "bg-white"}`}
                >
                  «
                </button>
                {(() => {
                  const pages = [];
                  const start = Math.max(2, currentPage - 2);
                  const end = Math.min(totalPages - 1, currentPage + 2);
                  pages.push(1);
                  if (start > 2) pages.push("start-gap");
                  for (let p = start; p <= end; p++) pages.push(p);
                  if (end < totalPages - 1) pages.push("end-gap");
                  if (totalPages > 1) pages.push(totalPages);
                  return pages.map((p) =>
                    typeof p === "number" ? (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === p ? "bg-red-500 text-white" : "bg-white"}`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={p} className="px-2 text-gray-500">…</span>
                    )
                  );
                })()}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${currentPage === totalPages ? "text-gray-400" : "bg-white"}`}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
