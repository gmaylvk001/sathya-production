"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DateRangePicker from "@/components/DateRangePicker";

export default function PlaceOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const itemsPerPage = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { startDate: ymd(start), endDate: ymd(end) };
  });
  const [archiveFilter, setArchiveFilter] = useState("0");
  const [archivingId, setArchivingId] = useState(null);
  const [alertType, setAlertType] = useState("success");
  const [openActionId, setOpenActionId] = useState(null);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    fetchOrders();
  }, [archiveFilter, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    if (!alertMessage) return;
    const t = setTimeout(() => setAlertMessage(null), 4000);
    return () => clearTimeout(t);
  }, [alertMessage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "N/A";
    const pad = (n) => String(n).padStart(2, "0");
    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hours)}:${pad(d.getMinutes())} ${ampm}`;
  };

  const formatAmount = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return value ? `Rs. ${value}` : "N/A";
    return `Rs. ${n.toLocaleString("en-IN")}`;
  };

  const showAlert = (message, type = "success") => {
    setAlertType(type);
    setAlertMessage(message);
  };

  const isArchived = (order) => String(order.archive) === "1";

  const handleArchiveClick = async (order) => {
    if (!order?._id || isArchived(order)) return;
    if (!window.confirm("Are you sure to archive?")) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showAlert("Please login again to archive orders", "error");
      return;
    }

    setArchivingId(String(order._id));
    try {
      const res = await fetch(`/api/orders_new/${order._id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showAlert(data.message || "Failed to archive order", "error");
        return;
      }
      showAlert(data.message || "Order has been successfully archived", "success");
      await fetchOrders();
    } catch (error) {
      console.error("Archive order error:", error);
      showAlert("Failed to archive order", "error");
    } finally {
      setArchivingId(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ archive: archiveFilter });
      if (dateFilter.startDate && dateFilter.endDate) {
        params.set("startDate", dateFilter.startDate);
        params.set("endDate", dateFilter.endDate);
      }
      const response = await fetch(`/api/orders_new/place-orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const data = await response.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showAlert("Error fetching orders", "error");
    }
    setLoading(false);
  };

  const handleDateChange = ({ startDate, endDate }) => {
    if (!startDate || !endDate) return;
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q
      || order.order_number?.toLowerCase().includes(q)
      || order.order_username?.toLowerCase().includes(q);

    const matchesPayment = !paymentMethod
      || order.payment_method?.toLowerCase() === paymentMethod.toLowerCase();

    return matchesSearch && matchesPayment;
  });

  const pageCount = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pageCount) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="container mx-auto">
      {alertMessage && (
        <div
          className={`${alertType === "error" ? "bg-red-500" : "bg-green-500"} text-white px-4 py-2 rounded-md mb-4`}
        >
          {alertMessage}
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">Place Orders</h2>
      </div>

      {(
        <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Payment Methods</option>
                <option value="online">Online</option>
                <option value="cod">COD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archive</label>
              <select
                value={archiveFilter}
                onChange={(e) => {
                  setArchiveFilter(e.target.value);
                  setCurrentPage(1);
                  setOpenActionId(null);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="0">Select Archive</option>
                <option value="1">Archives</option>
              </select>
            </div>

            <div>
              <div className="w-full col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateRangePicker onDateChange={handleDateChange} defaultDays={7} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-t border-gray-200 mb-4" />

          <table className="w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2">Action</th>
                <th className="p-2">Order ID</th>
                <th className="p-2">Order Status</th>
                <th className="p-2">Name</th>
                <th className="p-2">Total Amount</th>
                <th className="p-2">Date Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading orders...
                  </td>
                </tr>
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const id = String(order._id);
                  return (
                    <tr key={id} className="border-t hover:bg-gray-50">
                      <td
                        className="px-3 py-2 relative"
                        ref={openActionId === id ? actionMenuRef : null}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenActionId(openActionId === id ? null : id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          Action
                          <span className="text-[10px]">▼</span>
                        </button>
                        {openActionId === id && (
                          <div className="absolute left-3 top-10 z-20 min-w-[120px] bg-white border border-gray-200 rounded shadow-md py-1">
                            <button
                              type="button"
                              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                              onClick={() => {
                                setOpenActionId(null);
                                router.push(`/admin/order/place-order/${order._id}`);
                              }}
                            >
                              View
                            </button>
                            {!isArchived(order) && (
                              <button
                                type="button"
                                disabled={archivingId === id}
                                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleArchiveClick(order);
                                }}
                              >
                                {archivingId === id ? "Archiving..." : "Archive"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{order.order_number || "N/A"}</td>
                      <td className="px-3 py-2">{order.order_status || "N/A"}</td>
                      <td className="px-3 py-2">{order.order_username || ""}</td>
                      <td className="px-3 py-2">{formatAmount(order.order_amount)}</td>
                      <td className="px-3 py-2">{formatDateTime(order.created_at || order.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No placed orders found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 text-left border-t">
                <th className="p-2">Action</th>
                <th className="p-2">Order ID</th>
                <th className="p-2">Order Status</th>
                <th className="p-2">Name</th>
                <th className="p-2">Total Amount</th>
                <th className="p-2">Date Time</th>
              </tr>
            </tfoot>
          </table>

          {(
            <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
              <div className="text-sm text-gray-600">
                Showing {filteredOrders.length > 0 ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of{" "}
                {filteredOrders.length} entries
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

                {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                      currentPage === page
                        ? "bg-red-500 text-white"
                        : "text-black bg-white hover:bg-gray-100"
                    }`}
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === pageCount || pageCount === 0}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                    currentPage === pageCount || pageCount === 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-black bg-white hover:bg-gray-100"
                  }`}
                  aria-label="Next page"
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
