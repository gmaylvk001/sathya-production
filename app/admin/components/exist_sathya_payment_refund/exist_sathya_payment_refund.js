import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import { formatExistDateYmd } from "@/lib/existSheetDateFormat";

const FIELD_LABELS = [
  ["exist_id", "Exist ID"],
  ["user_id", "User ID"],
  ["order_number", "Order Number"],
  ["refund_id", "Refund ID"],
  ["refund_amount", "Refund Amount"],
  ["actual_paid_amount", "Actual Paid Amount"],
  ["payment_id", "Payment ID"],
  ["error_msg", "Error Message"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
];

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (value instanceof Date) return new Date(value).toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value) {
  return formatExistDateYmd(value);
}

export default function ExistSathyaPaymentRefundComponent() {
  const [rows, setRows] = useState([]);
  const [movedCount, setMovedCount] = useState(0);
  const [unmovedCount, setUnmovedCount] = useState(0);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [moveFilter, setMoveFilter] = useState("unmoved");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/exist_sathya_payment_refund/get");
      const payload = response.data;
      const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setRows(data);
      setMovedCount(Number(payload?.movedCount) || 0);
      setUnmovedCount(Number(payload?.unmovedCount) || 0);
      setCollectionTotal(Number(payload?.total) || data.length);
    } catch (error) {
      console.error("Error fetching exist payment refunds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleDelete = async (refundId) => {
    try {
      const response = await axios.delete("/api/exist_sathya_payment_refund/delete", {
        data: { refundId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(refundId)));
      if (response.data.success) {
        showMessage("✅ Payment refund deleted successfully!");
        fetchRows();
      }
    } catch (error) {
      showMessage("❌ Error deleting payment refund");
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showMessage("❌ Please choose an Excel, CSV or JSON file");
      return;
    }

    const name = importFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv") && !name.endsWith(".json")) {
      showMessage("❌ Only .xlsx, .csv and .json files are allowed");
      return;
    }

    const data = new FormData();
    data.append("excel", importFile);
    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await axios.post("/api/exist_sathya_payment_refund/import", data, {
        timeout: 300000,
      });
      setImportResult(response.data);
      showMessage(response.data.message || "✅ Import completed");
      setImportFile(null);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const filtered = rows.filter((row) => {
    if (moveFilter === "moved" && !row.is_moved) return false;
    if (moveFilter === "unmoved" && row.is_moved) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return [row.exist_id, row.user_id, row.order_number, row.refund_id, row.payment_id]
      .some((value) => value && String(value).toLowerCase().includes(q));
  });
  const filterDeleteCount = moveFilter === "moved" ? movedCount : moveFilter === "unmoved" ? unmovedCount : 0;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const currentPageIds = currentRows.map((row) => String(row._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected payment refund(s)? This cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_payment_refund/delete", {
        data: { refundIds: selectedIds },
      });
      showMessage(`✅ ${response.data.message || "Payment refunds deleted successfully!"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting payment refunds");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteByFilter = async () => {
    if (moveFilter !== "moved" && moveFilter !== "unmoved") {
      showMessage("❌ Select Moved or Unmoved first");
      return;
    }
    if (!filterDeleteCount) return;

    const label = moveFilter === "moved" ? "moved" : "unmoved";
    const confirmed = window.confirm(
      `Delete ${filterDeleteCount} ${label} payment refund(s)? Live refunds are not deleted.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_payment_refund/delete", {
        data: { move_status: moveFilter },
      });
      showMessage(`✅ ${response.data.message || "Payment refunds deleted successfully!"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting payment refunds");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!collectionTotal) return;
    const confirmed = window.confirm(
      `Delete ALL ${collectionTotal} imported Exist Payment Refunds? Live refunds are not deleted.`
    );
    if (!confirmed) return;

    const typed = window.prompt("Type DELETE ALL to confirm full bulk delete:");
    if (typed !== "DELETE ALL") {
      showMessage("❌ Full delete cancelled");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_payment_refund/delete", {
        data: { deleteAll: true },
      });
      showMessage(`✅ ${response.data.message || "All imported payment refunds deleted successfully!"}`);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      showMessage(error.response?.data?.error || "❌ Error deleting payment refunds");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Sathya Exist Payment Refund</h2>
          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            Moved {movedCount}
          </span>
        </div>
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
                placeholder="Exist id, order number, refund id, payment id..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move status</label>
              <select
                value={moveFilter}
                onChange={(e) => {
                  setMoveFilter(e.target.value);
                  setSelectedIds([]);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All</option>
                <option value="moved">Moved</option>
                <option value="unmoved">Unmoved</option>
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => {
                  setImportResult(null);
                  setImportFile(null);
                  setIsImportOpen(true);
                }}
                className="p-2 border border-red-500 text-red-500 hover:bg-red-50 rounded-md transition"
              >
                Import Excel/CSV/JSON
              </button>
              <button
                onClick={handleDeleteByFilter}
                disabled={isBulkDeleting || filterDeleteCount === 0}
                className="p-2 border border-red-500 text-red-500 hover:bg-red-50 rounded-md transition disabled:opacity-50"
              >
                {isBulkDeleting ? "Deleting..." : `Delete ${moveFilter === "moved" ? "moved" : moveFilter === "unmoved" ? "unmoved" : "filter"} (${filterDeleteCount})`}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isBulkDeleting || collectionTotal === 0}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
              >
                {isBulkDeleting ? "Deleting..." : `Delete all (${collectionTotal})`}
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

          <table className="w-full border border-gray-300 min-w-[1100px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 w-10">
                  <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                </th>
                <th className="p-2">Exist ID</th>
                <th className="p-2">Move</th>
                <th className="p-2">Order Number</th>
                <th className="p-2">Refund ID</th>
                <th className="p-2">Refund Amount</th>
                <th className="p-2">Actual Paid</th>
                <th className="p-2">Payment ID</th>
                <th className="p-2">Created At</th>
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
                    <td className="p-2">
                      {row.is_moved ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Moved</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Unmoved</span>
                      )}
                    </td>
                    <td className="p-2">{row.order_number || "-"}</td>
                    <td className="p-2 font-bold">{row.refund_id || "-"}</td>
                    <td className="p-2">{row.refund_amount || "-"}</td>
                    <td className="p-2">{row.actual_paid_amount || "-"}</td>
                    <td className="p-2">{row.payment_id || "-"}</td>
                    <td className="p-2">{formatDateTime(row.created_at)}</td>
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
                  <td colSpan="10" className="p-2 text-center text-gray-500">No payment refunds found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  «
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 border rounded-md ${currentPage === i + 1 ? "bg-red-500 text-white" : "bg-white"}`}
                  >
                    {i + 1}
                  </button>
                ))}
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
          <div className="bg-white p-5 rounded-lg w-[42rem] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center mb-3">Payment Refund Details</h2>
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
          <div className="bg-white p-5 rounded-lg w-[32rem] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">Import Excel / CSV / JSON</h2>
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
              Import the payment refund export into <b>exist_payment_refund</b>. Column <b>id</b> is saved as <b>exist_id</b>.
              Duplicate <b>id</b> rows are skipped. Live order refunds are not changed.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Columns: id, user_id, order_number, refund_id, refund_amount, actual_paid_amount, created_at, updated_at, payment_id, error_msg.
            </p>
            <a
              href="/api/exist_sathya_payment_refund/import/sample"
              className="inline-block text-sm text-red-500 hover:underline mb-3"
            >
              Download sample file
            </a>
            <form onSubmit={handleImportSubmit}>
              <input
                type="file"
                accept=".xlsx,.csv,.json"
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
                <p>Dates updated: {importResult.datesUpdatedCount || 0}</p>
                <p>Skipped existing: {importResult.skippedExistingCount || 0}</p>
                <p>Other skipped: {(importResult.skippedCount || 0) - (importResult.skippedExistingCount || 0)}</p>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-gray-600">
                    {importResult.errors.map((item, index) => (
                      <p key={index}>Row {item.row}: {item.error}</p>
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
