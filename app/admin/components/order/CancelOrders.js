"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export default function CancelOrders() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("info"); // "success" | "error" | "info"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const actionMenuRef = useRef(null);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showAlert = (msg, type = "info", timeout = 4000) => {
    setAlertMessage(msg);
    setAlertType(type);
    if (timeout) {
      setTimeout(() => {
        setAlertMessage(null);
      }, timeout);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch("/api/cancel_orders/requests", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showAlert(data.message || "Error fetching cancel orders", "error");
        setRequests([]);
      } else {
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      }
    } catch (error) {
      console.error("Error fetching cancel requests:", error);
      showAlert("Error fetching cancel orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    const pad = (n) => String(n).padStart(2, "0");
    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hours)}:${pad(d.getMinutes())} ${ampm}`;
  };

  // Unique dropdown options
  const statusOptions = Array.from(
    new Set(requests.map((r) => r.order_status).filter(Boolean))
  );
  const reasonOptions = Array.from(
    new Set(requests.map((r) => r.reason).filter(Boolean))
  );

  const filteredRequests = requests.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.order_number?.toLowerCase().includes(q) ||
      row.order_id?.toLowerCase().includes(q) ||
      row.customer_id?.toLowerCase().includes(q) ||
      row.customer_name?.toLowerCase().includes(q) ||
      row.customer_phone?.toLowerCase().includes(q) ||
      row.customer_email?.toLowerCase().includes(q) ||
      row.reason?.toLowerCase().includes(q) ||
      row.comments?.toLowerCase().includes(q) ||
      row.delivery_type?.toLowerCase().includes(q) ||
      row.payment_method?.toLowerCase().includes(q) ||
      row.exist_id?.toLowerCase().includes(q);

    const matchesStatus =
      !statusFilter ||
      row.order_status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesReason =
      !reasonFilter ||
      row.reason?.toLowerCase() === reasonFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesReason;
  });

  const pageCount = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pageCount) {
      setCurrentPage(pageNumber);
    }
  };

  const handleViewOrder = (row) => {
    setOpenActionId(null);
    if (row.order_ref_id) {
      router.push(`/admin/Allorder/${row.order_ref_id}`);
    } else {
      setViewRow(row);
    }
  };

  return (
    <div className="container mx-auto pb-10">
      {/* Alert Notification */}
      {alertMessage && (
        <div
          className={`px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm text-sm font-medium ${
            alertType === "success"
              ? "bg-emerald-600 text-white"
              : alertType === "error"
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          <span>{alertMessage}</span>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="ml-4 text-white hover:text-gray-200 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cancel Orders</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Review cancel requests with complete customer and order details
          </p>
        </div>
      </div>

      {/* Filters & Data Table Card */}
      <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Order Number, Name, Phone, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Reason
            </label>
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value="">All Reasons</option>
              {reasonOptions.map((rs) => (
                <option key={rs} value={rs}>
                  {rs}
                </option>
              ))}
            </select>
          </div>

          <div>
            {(searchQuery || statusFilter || reasonFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("");
                  setReasonFilter("");
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <hr className="border-t border-gray-200 mb-4" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Order Number</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Comments</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Icon icon="mdi:loading" className="animate-spin text-xl text-[#d72828]" />
                      <span>Loading cancel orders...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRequests.length > 0 ? (
                paginatedRequests.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50/80 transition">
                    {/* Action Button */}
                    <td
                      className="py-2.5 px-3 relative"
                      ref={openActionId === row._id ? actionMenuRef : null}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenActionId(openActionId === row._id ? null : row._id)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-700 shadow-xs"
                      >
                        Action
                        <span className="text-[9px]">▼</span>
                      </button>

                      {openActionId === row._id && (
                        <div className="absolute left-3 top-9 z-20 min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              setOpenActionId(null);
                              setViewRow(row);
                            }}
                          >
                            <Icon icon="mdi:eye" className="text-sm text-blue-600" />
                            View Details
                          </button>

                          {row.order_ref_id && (
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                              onClick={() => handleViewOrder(row)}
                            >
                              <Icon icon="mdi:receipt-text" className="text-sm text-green-600" />
                              View Full Order
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Order Number */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900">{row.order_number || "-"}</div>
                      {row.order_id && (
                        <div className="text-[11px] text-gray-400 font-mono">ID: {row.order_id}</div>
                      )}
                    </td>

                    {/* Customer Name */}
                    <td className="py-2.5 px-3 text-gray-800">
                      <div className="font-medium">{row.customer_name || "-"}</div>
                      {row.customer_email && row.customer_email !== "-" && (
                        <div className="text-[11px] text-gray-400 truncate max-w-[140px]">
                          {row.customer_email}
                        </div>
                      )}
                    </td>

                    {/* Customer Phone */}
                    <td className="py-2.5 px-3 text-gray-700 font-mono text-xs">
                      {row.customer_phone || "-"}
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {row.order_amount && row.order_amount !== "-"
                        ? `₹${Number(row.order_amount).toLocaleString("en-IN")}`
                        : "-"}
                    </td>

                    {/* Order Status */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#d72828] border border-red-200 capitalize">
                        {row.order_status || "Cancelled"}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-2.5 px-3 text-gray-700 max-w-[160px] truncate" title={row.reason}>
                      {row.reason || "-"}
                    </td>

                    {/* Comments */}
                    <td className="py-2.5 px-3 text-gray-600 max-w-[160px] truncate" title={row.comments}>
                      {row.comments || "-"}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-gray-500">
                    No cancel orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {filteredRequests.length > 0 ? startIndex + 1 : 0} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredRequests.length)} of{" "}
            {filteredRequests.length} entries
          </div>

          {pageCount > 1 && (
            <div className="pagination flex items-center space-x-1">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md ${
                  currentPage === 1
                    ? "text-gray-400 cursor-not-allowed bg-gray-50"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                aria-label="Previous page"
              >
                «
              </button>
              {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => {
                let page = i + 1;
                if (pageCount > 10 && currentPage > 5) {
                  page = currentPage - 5 + i;
                  if (page > pageCount) page = pageCount - (9 - i);
                }
                return (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md font-medium ${
                      currentPage === page
                        ? "bg-[#d72828] text-white border-[#d72828]"
                        : "text-black bg-white hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pageCount}
                className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md ${
                  currentPage === pageCount
                    ? "text-gray-400 cursor-not-allowed bg-gray-50"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                aria-label="Next page"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Cancel Order Details Modal */}
      {viewRow && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800">
                Cancel Order Details
              </h3>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Order Number</span>
                <span className="col-span-2 font-mono text-gray-900 font-bold">
                  {viewRow.order_number || "-"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Customer Name</span>
                <span className="col-span-2 text-gray-900 font-medium">
                  {viewRow.customer_name || "-"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Phone Number</span>
                <span className="col-span-2 font-mono text-gray-800">
                  {viewRow.customer_phone || "-"}
                </span>
              </div>

              {viewRow.customer_email && viewRow.customer_email !== "-" && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Email</span>
                  <span className="col-span-2 text-gray-800">
                    {viewRow.customer_email}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Order Amount</span>
                <span className="col-span-2 text-gray-900 font-bold">
                  {viewRow.order_amount && viewRow.order_amount !== "-"
                    ? `₹${Number(viewRow.order_amount).toLocaleString("en-IN")}`
                    : "-"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Order Status</span>
                <span className="col-span-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#d72828] border border-red-200 capitalize">
                    {viewRow.order_status || "Cancelled"}
                  </span>
                </span>
              </div>

              {viewRow.payment_method && viewRow.payment_method !== "-" && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Payment Method</span>
                  <span className="col-span-2 text-gray-800 uppercase text-xs font-semibold">
                    {viewRow.payment_method}
                  </span>
                </div>
              )}

              {viewRow.delivery_type && viewRow.delivery_type !== "-" && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Delivery Type</span>
                  <span className="col-span-2 text-gray-800 capitalize">
                    {viewRow.delivery_type}
                  </span>
                </div>
              )}

              {viewRow.delivery_address && viewRow.delivery_address !== "-" && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Delivery Address</span>
                  <span className="col-span-2 text-gray-700 text-xs leading-relaxed">
                    {viewRow.delivery_address}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Cancellation Reason</span>
                <span className="col-span-2 text-gray-800 font-medium">
                  {viewRow.reason || "-"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Comments</span>
                <span className="col-span-2 text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-wrap">
                  {viewRow.comments || "-"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5">
                <span className="font-semibold text-gray-500">Date</span>
                <span className="col-span-2 text-gray-700 text-xs">
                  {formatDateTime(viewRow.created_at)}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="px-4 py-2 text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
