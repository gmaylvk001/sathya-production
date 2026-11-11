import React, { useState, useEffect } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import DateRangePicker from "@/components/DateRangePicker";
import { formatExistDateYmd } from "@/lib/existSheetDateFormat";

const FIELD_LABELS = [
  ["exist_id", "Exist ID"],
  ["user_id", "User ID"],
  ["cart_id", "Cart ID"],
  ["sales_person_id", "Sales Person ID"],
  ["sales_person_role", "Sales Person Role"],
  ["user_adddeliveryid", "Delivery Address ID"],
  ["order_username", "Customer Name"],
  ["order_phonenumber", "Phone"],
  ["order_item", "Order Item"],
  ["order_amount", "Amount"],
  ["order_deliveryaddress", "Delivery Address"],
  ["order_billingaddress", "Billing Address"],
  ["payment_method", "Payment Method"],
  ["payment_type", "Payment Type"],
  ["order_status", "Order Status"],
  ["delivery_type", "Delivery Type"],
  ["type", "Type"],
  ["created_at", "Created At"],
  ["updated_at", "Updated At"],
  ["user_addbillingid", "Billing Address ID"],
  ["payment_id", "Payment ID"],
  ["order_number", "Order Number"],
  ["api_status", "API Status"],
  ["pickup_type", "Pickup Type"],
  ["api_reason", "API Reason"],
  ["file_path", "File Path"],
  ["invoice", "Invoice"],
  ["is_tac", "Is TAC"],
  ["archive", "Archive"],
  ["referrel_url", "Referral URL"],
  ["utm_source", "UTM Source"],
  ["utm_campaign", "UTM Campaign"],
  ["coupon_discount", "Coupon Discount"],
  ["eo_discount", "EO Discount"],
  ["coupon_id", "Coupon ID"],
  ["offline_order_date", "Offline Order Date"],
  ["emi_txn_ref_no", "EMI Txn Ref No"],
  ["rcu_status", "RCU Status"],
  ["asset_status", "Asset Status"],
  ["do_generation_status", "DO Generation Status"],
  ["doc_status", "Doc Status"],
  ["qc_status", "QC Status"],
  ["bajajbilling", "Bajaj Billing"],
  ["schema_request", "Schema Request"],
  ["bajaj_do_checkout", "Bajaj DO Checkout"],
  ["netamt", "Net Amount"],
  ["online_pay_refid", "Online Pay Ref ID"],
  ["online_pay_ref_status", "Online Pay Ref Status"],
  ["order_owner", "Order Owner"],
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

export default function ExistSathyaOrdersComponent() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [apiStatusFilter, setApiStatusFilter] = useState("");
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
  const [viewOrder, setViewOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/exist_sathya_orders/get");
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching exist sathya orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    try {
      const response = await axios.delete("/api/exist_sathya_orders/delete", {
        data: { orderId },
      });
      setSelectedIds((prev) => prev.filter((id) => id !== String(orderId)));
      if (response.data.success) {
        setAlertMessage("✅ Order deleted successfully!");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        fetchOrders();
      }
    } catch (error) {
      setAlertMessage("❌ Error deleting order");
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
      const response = await axios.post("/api/exist_sathya_orders/import", data, {
        timeout: 300000,
      });
      setImportResult(response.data);
      setAlertMessage(response.data.message || "✅ Import completed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      setImportFile(null);
      fetchOrders();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Import failed");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  const uniqueOptions = (key) => [...new Set(orders.map((order) => order[key]).filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
  const statusOptions = uniqueOptions("order_status");
  const deliveryOptions = uniqueOptions("delivery_type");
  const typeOptions = uniqueOptions("type");
  const apiStatusOptions = uniqueOptions("api_status");

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      [order.exist_id, order.order_number, order.order_username, order.order_phonenumber, order.user_id, order.pickup_type]
        .some((value) => value && String(value).toLowerCase().includes(q));

    const matchesStatus = statusFilter === "" || String(order.order_status || "") === statusFilter;
    const matchesDelivery = deliveryFilter === "" || String(order.delivery_type || "") === deliveryFilter;
    const matchesType = typeFilter === "" || String(order.type || "") === typeFilter;
    const matchesApiStatus = apiStatusFilter === "" || String(order.api_status || "") === apiStatusFilter;

    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && order.created_at) {
      const orderDate = new Date(order.created_at);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = orderDate >= startDate && orderDate <= endDate;
    }

    return matchesSearch && matchesStatus && matchesDelivery && matchesType && matchesApiStatus && matchesDate;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const currentPageIds = currentOrders.map((order) => String(order._id));
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
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected order(s)? This cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_orders/delete", {
        data: { orderIds: selectedIds },
      });
      setAlertMessage(`✅ ${response.data.message || "Orders deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchOrders();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting orders");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getFilterPayload = () => {
    const payload = {};
    if (statusFilter) payload.order_status = statusFilter;
    if (deliveryFilter) payload.delivery_type = deliveryFilter;
    if (typeFilter) payload.type = typeFilter;
    if (apiStatusFilter) payload.api_status = apiStatusFilter;
    return payload;
  };

  const filterDeleteCount = orders.filter((order) => {
    const payload = getFilterPayload();
    if (!Object.keys(payload).length) return false;
    if (payload.order_status && String(order.order_status || "") !== payload.order_status) return false;
    if (payload.delivery_type && String(order.delivery_type || "") !== payload.delivery_type) return false;
    if (payload.type && String(order.type || "") !== payload.type) return false;
    if (payload.api_status && String(order.api_status || "") !== payload.api_status) return false;
    return true;
  }).length;

  const handleDeleteByFilters = async () => {
    const payload = getFilterPayload();
    if (!Object.keys(payload).length) {
      setAlertMessage("❌ Select Status, Delivery, Type or API Status first");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const labels = [
      statusFilter && `Status=${statusFilter}`,
      deliveryFilter && `Delivery=${deliveryFilter}`,
      typeFilter && `Type=${typeFilter}`,
      apiStatusFilter && `API Status=${apiStatusFilter}`,
    ].filter(Boolean).join(", ");

    const confirmed = window.confirm(
      `Delete ${filterDeleteCount} order(s) matching ${labels}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_orders/delete", { data: payload });
      setAlertMessage(`✅ ${response.data.message || "Orders deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchOrders();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting orders");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!orders.length) return;
    const confirmed = window.confirm(
      `Delete ALL ${orders.length} Sathya Exist Orders? This cannot be undone.`
    );
    if (!confirmed) return;

    const typed = window.prompt('Type DELETE ALL to confirm full bulk delete:');
    if (typed !== "DELETE ALL") {
      setAlertMessage("❌ Full delete cancelled");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await axios.delete("/api/exist_sathya_orders/delete", {
        data: { deleteAll: true },
      });
      setAlertMessage(`✅ ${response.data.message || "All orders deleted successfully!"}`);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      setSelectedIds([]);
      setCurrentPage(1);
      fetchOrders();
    } catch (error) {
      setAlertMessage(error.response?.data?.error || "❌ Error deleting orders");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Sathya Exist Orders</h2>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Order no, name, phone, exist id..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
              <select
                value={deliveryFilter}
                onChange={(e) => {
                  setDeliveryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All delivery</option>
                {deliveryOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">API Status</label>
              <select
                value={apiStatusFilter}
                onChange={(e) => {
                  setApiStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All API status</option>
                {apiStatusOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
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
              onClick={handleDeleteByFilters}
              disabled={isBulkDeleting || filterDeleteCount === 0}
              className="p-2 border border-red-500 text-red-500 hover:bg-red-50 rounded-md transition disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting..." : `Delete by filters (${filterDeleteCount})`}
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={isBulkDeleting || orders.length === 0}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition disabled:opacity-50"
            >
              {isBulkDeleting ? "Deleting..." : `Delete all (${orders.length})`}
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

          <table className="w-full border border-gray-300 min-w-[1100px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 w-10">
                  <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectCurrentPage} />
                </th>
                <th className="p-2">Exist ID</th>
                <th className="p-2">User ID</th>
                <th className="p-2">Order Number</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Delivery</th>
                <th className="p-2">Type</th>
                <th className="p-2">API Status</th>
                <th className="p-2">Owner</th>
                <th className="p-2">Created At</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.length > 0 ? (
                currentOrders.map((order, index) => (
                  <tr key={order._id || index} className="text-center border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(order._id))}
                        onChange={() => toggleSelect(order._id)}
                      />
                    </td>
                    <td className="p-2">{order.exist_id || "-"}</td>
                    <td className="p-2">{order.user_id || "-"}</td>
                    <td className="p-2 font-bold">{order.order_number || "-"}</td>
                    <td className="p-2">{order.order_username || "-"}</td>
                    <td className="p-2">{order.order_phonenumber || "-"}</td>
                    <td className="p-2">{order.order_amount || "-"}</td>
                    <td className="p-2">{order.order_status || "-"}</td>
                    <td className="p-2">{order.delivery_type || "-"}</td>
                    <td className="p-2">{order.type || "-"}</td>
                    <td className="p-2">{order.api_status || "-"}</td>
                    <td className="p-2">{order.order_owner || "-"}</td>
                    <td className="p-2">{formatDateTime(order.created_at)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => setViewOrder(order)}
                          className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full inline-flex items-center justify-center"
                          title="View all fields"
                        >
                          <Icon icon="mingcute:eye-line" />
                        </button>
                        <button
                          onClick={() => handleDelete(order._id)}
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
                  <td colSpan="14" className="p-2 text-center text-gray-500">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} entries
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

      {viewOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg w-[42rem] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center mb-3">Order Details</h2>
            <button onClick={() => setViewOrder(null)} className="absolute top-3 right-3 text-red-500 text-xl">×</button>
            <table className="w-full text-sm border">
              <tbody>
                {FIELD_LABELS.map(([key, label]) => (
                  <tr key={key} className="border-b">
                    <td className="p-2 font-medium bg-gray-50 w-48">{label}</td>
                    <td className="p-2 break-all">
                      {key === "created_at" || key === "updated_at" || key === "offline_order_date"
                        ? formatDateTime(viewOrder[key])
                        : formatValue(viewOrder[key])}
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
              Import old SQL order records. Column <b>id</b> is saved as <b>exist_id</b>.
              Duplicate <b>id</b> / <b>order_number</b> rows are skipped. All SQL fields are stored.
            </p>
            <a
              href="/api/exist_sathya_orders/import/sample"
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
                {importResult.skippedOrders?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-gray-600">
                    {importResult.skippedOrders.map((item, index) => (
                      <div key={index}>
                        Row {item.row}: {item.order_number || item.exist_id} already exists
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
