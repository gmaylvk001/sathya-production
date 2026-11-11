import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import DateRangePicker from "@/components/DateRangePicker";
import { formatExistDateYmd } from "@/lib/existSheetDateFormat";

const FIELD_LABELS = [
  ["exist_id", "Exist ID"],
  ["item_code", "Item Code"],
  ["product_id", "Product ID"],
  ["product_name", "Product Name"],
  ["product_price", "Product Price"],
  ["model", "Model"],
  ["user_id", "User ID"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
  ["quantity", "Quantity"],
  ["store_id", "Store ID"],
  ["orderNumber", "Order Number"],
  ["coupon_discount", "Coupon Discount"],
  ["is_gift", "Is Gift"],
  ["gift_Price_to_apply", "Gift Price To Apply"],
  ["is_combo", "Is Combo"],
  ["warranty_product_code", "Warranty Product Code"],
  ["is_warranty", "Is Warranty"],
  ["is_view", "Is View"],
  ["type", "Type"],
  ["is_exchange_offer", "Is Exchange Offer"],
  ["eo_amount", "EO Amount"],
  ["exchange_off_type", "Exchange Off Type"],
  ["exchange_off_brand", "Exchange Off Brand"],
  ["exchange_off_cond", "Exchange Off Cond"],
  ["exchange_off_pin", "Exchange Off Pin"],
  ["exchange_off_amount", "Exchange Off Amount"],
  ["special_offer_id", "Special Offer ID"],
  ["special_discount_id", "Special Discount ID"],
  ["special_discount_type", "Special Discount Type"],
  ["special_offer_discount", "Special Offer Discount"],
  ["is_special_offer", "Is Special Offer"],
  ["is_checkout_offer", "Is Checkout Offer"],
  ["checkout_offer_type", "Checkout Offer Type"],
  ["checkout_offer_id", "Checkout Offer ID"],
  ["checkout_offer_discount", "Checkout Offer Discount"],
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

export default function ExistSathyaOrderDetailsComponent() {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null });
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
      const response = await axios.get("/api/exist_sathya_order_details/get");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching exist sathya order details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    const confirmed = window.confirm("Delete this order detail? This cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await axios.delete("/api/exist_sathya_order_details/delete", {
        data: { orderId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(orderId)));
      if (response.data.success) {
        setAlertMessage("✅ Order detail deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchRows();
      }
    } catch (error) {
      setAlertMessage("❌ Error deleting order detail");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setAlertMessage("❌ Please choose an Excel, CSV or JSON file");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const name = importFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv") && !name.endsWith(".json")) {
      setAlertMessage("❌ Only .xlsx, .csv and .json files are allowed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const data = new FormData();
    data.append("excel", importFile);
    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await axios.post("/api/exist_sathya_order_details/import", data, {
        timeout: 300000,
      });
      setImportResult(response.data);
      setAlertMessage(response.data.message || "✅ Import completed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      setImportFile(null);
      fetchRows();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Import failed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  const typeOptions = [...new Set(rows.map((row) => row.type).filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
  const storeOptions = [...new Set(rows.map((row) => row.store_id).filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];

  const filteredRows = rows.filter((row) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      [row.exist_id, row.orderNumber, row.product_name, row.item_code, row.product_id, row.user_id]
        .some((value) => value && String(value).toLowerCase().includes(q));

    const matchesType = typeFilter === "" || String(row.type || "") === typeFilter;
    const matchesStore = storeFilter === "" || String(row.store_id || "") === storeFilter;

    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && row.created_at) {
      const rowDate = new Date(row.created_at);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = rowDate >= startDate && rowDate <= endDate;
    }

    return matchesSearch && matchesType && matchesStore && matchesDate;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstItem, indexOfLastItem);
  const currentPageIds = currentRows.map((row) => String(row._id));
  const allCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (orderId) => {
    const id = String(orderId);
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
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected row(s)? This cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_order_details/delete", {
        data: { orderIds: selectedIds },
      });
      setAlertMessage(`✅ ${response.data.message || "Rows deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting rows");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!rows.length) return;
    const confirmed = window.confirm(
      `Delete ALL ${rows.length} Sathya Exist Order Details? This cannot be undone.`
    );
    if (!confirmed) return;

    const typed = window.prompt("Type DELETE ALL to confirm full bulk delete:");
    if (typed !== "DELETE ALL") {
      setAlertMessage("❌ Full delete cancelled");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_order_details/delete", {
        data: { deleteAll: true },
      });
      setAlertMessage(`✅ ${response.data.message || "All rows deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchRows();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting rows");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Sathya Exist Orders Details</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Order no, product, item, user id..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All type</option>
                {typeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
              <select
                value={storeFilter}
                onChange={(e) => {
                  setStoreFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All stores</option>
                {storeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateRangePicker onDateChange={({ startDate, endDate }) => {
                setDateFilter({ startDate, endDate });
                setCurrentPage(1);
              }} />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 mb-4">
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
              onClick={handleDeleteAll}
              disabled={isBulkDeleting || rows.length === 0}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting..." : `Delete all (${rows.length})`}
            </button>
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

          <table className="w-full border border-gray-300 min-w-[1200px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 w-10">
                  <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                </th>
                <th className="p-2">Exist ID</th>
                <th className="p-2">Order Number</th>
                <th className="p-2">Product Name</th>
                <th className="p-2">Item Code</th>
                <th className="p-2">Product ID</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">User ID</th>
                <th className="p-2">Store ID</th>
                <th className="p-2">Type</th>
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
                    <td className="p-2 font-bold">{row.orderNumber || "-"}</td>
                    <td className="p-2 text-left">{row.product_name || "-"}</td>
                    <td className="p-2">{row.item_code || "-"}</td>
                    <td className="p-2">{row.product_id || "-"}</td>
                    <td className="p-2">{row.quantity ?? "-"}</td>
                    <td className="p-2">{row.product_price || "-"}</td>
                    <td className="p-2">{row.user_id || "-"}</td>
                    <td className="p-2">{row.store_id || "-"}</td>
                    <td className="p-2">{row.type || "-"}</td>
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
                  <td colSpan="13" className="p-2 text-center text-gray-500">No order details found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRows.length)} of {filteredRows.length} entries
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border rounded-md disabled:text-gray-400"
                >
                  «
                </button>
                {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => (
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
            <h2 className="text-lg font-bold text-center mb-3">Order Detail</h2>
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
          <div className="bg-white p-5 rounded-lg w-[28rem] relative max-h-[90vh] overflow-y-auto">
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
              Import old SQL order-detail records. Column <b>id</b> is saved as <b>exist_id</b>.
              Duplicate <b>id</b> rows are skipped. Empty cells are stored as null.
              Sheet dates use <b>day-month-year</b> (example <b>22-04-2020 14:55:00</b>) and are saved as <b>year-month-day</b> (example <b>2020-04-22 14:55:00</b>).
              If <b>created_at</b> / <b>updated_at</b> is empty, today&apos;s date is used.
            </p>
            <a
              href="/api/exist_sathya_order_details/import/sample"
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
                <p>Skipped existing: {importResult.skippedExistingCount || 0}</p>
                <p>Other skipped: {(importResult.skippedCount || 0) - (importResult.skippedExistingCount || 0)}</p>
                {importResult.skippedRows?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-gray-600">
                    {importResult.skippedRows.map((item, index) => (
                      <div key={index}>
                        Row {item.row}: {item.exist_id || item.orderNumber} already exists
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
