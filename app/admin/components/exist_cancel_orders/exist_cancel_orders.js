import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

const FIELD_LABELS = [
  ["exist_id", "Exist ID"],
  ["order_number", "Order Number"],
  ["order_id", "Order ID"],
  ["customer_id", "Customer ID"],
  ["order_status", "Order Status"],
  ["reason", "Reason"],
  ["comments", "Comments"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
  ["live_linked", "Linked to live"],
  ["live_order_id", "Live Order ID"],
];

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ExistCancelOrdersComponent() {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  useEffect(() => {
    fetchRows();
  }, []);

  const flash = (message, ms = 3000) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), ms);
  };

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/exist_cancel_orders/get");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching exist cancel orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (cancelId) => {
    if (!window.confirm("Delete this imported cancel order row?")) return;
    try {
      const response = await axios.delete("/api/exist_cancel_orders/delete", {
        headers: authHeaders(),
        data: { cancelId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(cancelId)));
      if (response.data.success) {
        flash("✅ Cancel order row deleted successfully!");
        fetchRows();
      }
    } catch (error) {
      flash(error.response?.data?.error || "❌ Error deleting cancel order");
    }
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError("");
    setIsImportOpen(true);
  };

  const closeImport = () => {
    if (isImporting) return;
    setIsImportOpen(false);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    setImportError("");
    setImportResult(null);

    if (!importFile) {
      setImportError("Please choose an Excel or CSV file");
      return;
    }
    const name = importFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setImportError("Only .xlsx, .xls and .csv files are allowed");
      return;
    }

    const data = new FormData();
    data.append("file", importFile);
    setIsImporting(true);
    try {
      const response = await fetch("/api/cancel_orders/import", {
        method: "POST",
        headers: authHeaders(),
        body: data,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setImportError(result?.error || result?.details || "Import failed");
        return;
      }
      setImportResult(result);
      setImportFile(null);
      fetchRows();
    } catch (error) {
      console.error("Exist cancel orders import error:", error);
      setImportError("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const statusOptions = [...new Set(rows.map((row) => row.order_status).filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];

  const filtered = rows.filter((row) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      [row.exist_id, row.order_id, row.order_number, row.customer_id, row.order_status, row.reason, row.comments]
        .some((value) => value && String(value).toLowerCase().includes(q));
    const matchesStatus = statusFilter === "" || String(row.order_status || "") === statusFilter;
    const matchesLink =
      linkFilter === "" ||
      (linkFilter === "linked" ? row.live_linked : !row.live_linked);
    return matchesSearch && matchesStatus && matchesLink;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const currentPageIds = currentRows.map((row) => String(row._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (rowId) => {
    const id = String(rowId);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectCurrentPage = () => {
    if (allCurrentSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected cancel order row(s)? This cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_cancel_orders/delete", {
        headers: authHeaders(),
        data: { cancelIds: selectedIds },
      });
      flash(`✅ ${response.data.message || "Cancel orders deleted successfully!"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      flash(error.response?.data?.error || "❌ Error deleting cancel orders");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!rows.length) return;
    const confirmed = window.confirm(
      `Delete ALL ${rows.length} imported Exist Cancel Orders rows? Live cancel requests are not deleted.`
    );
    if (!confirmed) return;

    const typed = window.prompt("Type DELETE ALL to confirm full bulk delete:");
    if (typed !== "DELETE ALL") {
      flash("❌ Full delete cancelled");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_cancel_orders/delete", {
        headers: authHeaders(),
        data: { deleteAll: true },
      });
      flash(`✅ ${response.data.message || "All imported cancel orders deleted successfully!"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      flash(error.response?.data?.error || "❌ Error deleting cancel orders");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const linkedCount = rows.filter((row) => row.live_linked).length;

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 mt-5">
        <h2 className="text-2xl font-bold">Sathya Exist Cancel Orders</h2>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchRows}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition disabled:opacity-60"
          >
            <Icon icon="mdi:refresh" className={`text-base ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <a
            href="/api/cancel_orders/import/sample?format=csv"
            download="cancel_orders_sample.csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-300 transition"
          >
            <Icon icon="mdi:download" className="text-base text-gray-600" />
            Sample CSV
          </a>

          <button
            type="button"
            onClick={openImport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#d72828] hover:bg-red-700 text-white rounded-lg shadow-sm transition"
          >
            <Icon icon="mdi:cloud-upload" className="text-lg" />
            Import (Excel / CSV)
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Exist id, order number, customer, reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Live link</label>
              <select
                value={linkFilter}
                onChange={(e) => {
                  setLinkFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All ({rows.length})</option>
                <option value="linked">Linked ({linkedCount})</option>
                <option value="not_linked">Not linked ({rows.length - linkedCount})</option>
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleDeleteAll}
                disabled={isBulkDeleting || rows.length === 0}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
              >
                {isBulkDeleting ? "Deleting..." : `Delete all (${rows.length})`}
              </button>
            </div>
          </div>

          {showAlert && !isImportOpen && (
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
                  className="p-2 border border-gray-300 rounded-md text-sm"
                >
                  Clear
                </button>
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 w-10">
                    <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                  </th>
                  <th className="p-2">Exist ID</th>
                  <th className="p-2">Order Number</th>
                  <th className="p-2">Order ID</th>
                  <th className="p-2">Customer ID</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Comments</th>
                  <th className="p-2">Created At</th>
                  <th className="p-2">Live</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((row, index) => (
                    <tr key={row._id || index} className="text-center border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(String(row._id))}
                          onChange={() => toggleSelect(row._id)}
                        />
                      </td>
                      <td className="p-2">{row.exist_id || "-"}</td>
                      <td className="p-2 font-bold">{row.order_number || "-"}</td>
                      <td className="p-2">{row.order_id || "-"}</td>
                      <td className="p-2">{row.customer_id || "-"}</td>
                      <td className="p-2">{row.order_status || "-"}</td>
                      <td className="p-2 max-w-[10rem] truncate" title={row.reason || ""}>{row.reason || "-"}</td>
                      <td className="p-2 max-w-xs truncate" title={row.comments || ""}>{row.comments || "-"}</td>
                      <td className="p-2 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                      <td className="p-2">
                        {row.live_linked ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Linked</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Not linked</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => setViewRow(row)}
                            className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full inline-flex items-center justify-center"
                            title="View all fields"
                          >
                            <Icon icon="mingcute:eye-line" />
                          </button>
                          <button
                            onClick={() => handleDelete(row._id)}
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
                    <td colSpan="11" className="p-2 text-center text-gray-500">No cancel orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  «
                </button>
                {(() => {
                  const pages = [];
                  const start = Math.max(2, currentPage - 2);
                  const end = Math.min(totalPages - 1, currentPage + 2);
                  pages.push(1);
                  if (start > 2) pages.push("start-gap");
                  for (let p = start; p <= end; p += 1) pages.push(p);
                  if (end < totalPages - 1) pages.push("end-gap");
                  if (totalPages > 1) pages.push(totalPages);
                  return pages.map((page) =>
                    typeof page === "number" ? (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 border rounded-md ${currentPage === page ? "bg-red-500 text-white" : "bg-white"}`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={page} className="px-2 text-gray-500">…</span>
                    )
                  );
                })()}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {viewRow && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[42rem] max-w-[95vw] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center mb-3">Cancel Order Details</h2>
            <button onClick={() => setViewRow(null)} className="absolute top-3 right-3 text-red-500 text-xl">×</button>
            <table className="w-full text-sm border">
              <tbody>
                {FIELD_LABELS.map(([key, label]) => (
                  <tr key={key} className="border-b">
                    <td className="p-2 font-medium bg-gray-50 w-48">{label}</td>
                    <td className="p-2 break-all">
                      {key === "created_at" || key === "updated_at"
                        ? formatDateTime(viewRow[key])
                        : formatValue(viewRow[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[28rem] max-w-[95vw] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">Import Cancel Orders</h2>
            <button
              type="button"
              onClick={closeImport}
              className="absolute top-3 right-3 text-red-500 text-xl"
              aria-label="Close"
            >
              ×
            </button>

            <p className="text-sm text-gray-600 mt-4 mb-2">
              Import exist <b>cancel_orders</b> records. Columns: <b>id</b>, order_number, order_id,
              customer_id, order_status, reason, comments, created_at, updated_at.
              Column <b>id</b> is saved as <b>exist_id</b>; rows with an id that was already imported are skipped.
              Dates like <b>21-09-2026 17:28</b> are kept as they are; empty dates use today.
              Rows are copied to live cancel requests when the customer&apos;s orders are fetched.
            </p>
            <div className="flex gap-4 mb-3 text-sm">
              <a href="/api/cancel_orders/import/sample" className="text-red-500 hover:underline">
                Download Excel sample
              </a>
              <a href="/api/cancel_orders/import/sample?format=csv" className="text-red-500 hover:underline">
                Download CSV sample
              </a>
            </div>

            <form onSubmit={handleImportSubmit}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full border p-2 mb-3 rounded"
              />
              <button
                type="submit"
                disabled={isImporting}
                className="bg-red-500 text-white px-4 py-2 rounded w-full disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import File"}
              </button>
            </form>

            {importError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="mt-4 text-sm space-y-1">
                <div className="bg-green-50 border border-green-200 text-green-700 rounded px-3 py-2 mb-2">
                  {importResult.message}
                </div>
                <p>Total rows: {importResult.totalRows || 0}</p>
                <p>Added: {importResult.addedCount || 0}</p>
                <p>Skipped existing: {importResult.skippedExistingCount || 0}</p>
                <p>Invalid: {importResult.invalidCount || 0}</p>
                {importResult.skippedRows?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-gray-600">
                    {importResult.skippedRows.map((item, index) => (
                      <div key={index}>
                        Row {item.row}: id {item.exist_id} ({item.order_number}) already exists
                      </div>
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
