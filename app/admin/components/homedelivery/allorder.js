'use client';
import { useRouter } from 'next/navigation';

import { useEffect, useRef, useState } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import OrderSourceCounts from "@/app/admin/components/OrderSourceCounts";

const ORDER_STATUSES = [
  "Billed",
  "Cancelled",
  "Complete",
  "failure",
  "Order Accepted",
  "Order Placed",
  "ordered",
  "Payment Initiated",
  "pending",
];

const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [openActionId, setOpenActionId] = useState(null);
  const [rowStoreMap, setRowStoreMap] = useState({});
  const [busyOrderId, setBusyOrderId] = useState(null);
  const itemsPerPage = 20;
  const router = useRouter();
  const [filtered, setFiltered] = useState([]);
  const actionMenuRef = useRef(null);

  const DEFAULT_BRANCH = "SSSA";

  const storesForOrder = (order, storeList = stores) => {
    const uniletOrder = String(order?.order_owner || "").trim().toLowerCase() === "unilet";
    return storeList.filter((store) => {
      if (Number(store?.approved) !== 1) return false;
      const owner = String(store?.store_owner || "").trim().toLowerCase();
      return uniletOrder ? owner === "unilet" : owner !== "unilet";
    });
  };

  const resolveDefaultBranch = (order, storeList) => {
    const owned = storesForOrder(order, storeList);
    const existing = String(order?.pickup_type || "").trim();
    const existingMatch = owned.some(
      (store) => String(store?.branch_code || store?.location_id || "").trim() === existing
    );
    if (existing && existingMatch) return existing;
    const hasSssa = owned.some(
      (s) => String(s?.branch_code || s?.location_id || "").trim().toUpperCase() === DEFAULT_BRANCH
    );
    return hasSssa ? DEFAULT_BRANCH : "";
  };

  const loadOrders = async (storeList = stores) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders_new', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // Exist home delivery list: hide rows after PlaceOrder SUCCESS
      const homeOrders = list.filter((order) => {
        if (order.delivery_type !== 'home') return false;
        const api = String(order.api_status || "").trim().toUpperCase();
        return api !== "SUCCESS";
      });

      setOrders(homeOrders);
      setFiltered(homeOrders);

      const map = {};
      homeOrders.forEach((o) => {
        if (o?._id) map[String(o._id)] = resolveDefaultBranch(o, storeList);
      });
      setRowStoreMap(map);
    } catch (err) {
      console.error("Orders fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      let storeList = [];
      try {
        const res = await fetch('/api/store_listings/get');
        const data = await res.json();
        storeList = Array.isArray(data) ? data : data.data || [];
        setStores(storeList);
      } catch (err) {
        console.error("Store fetch error:", err);
        setStores([]);
      }
      await loadOrders(storeList);
    };
    boot();
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

  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    const applyFilters = () => {
      let updated = [...orders];

      if (status) {
        updated = updated.filter(o => o.order_status === status);
      }

      if (deliveryType) {
        updated = updated.filter(o => o.delivery_type === deliveryType);
      }

      if (paymentMethod) {
        updated = updated.filter(o =>
          o.payment_method?.toLowerCase() === paymentMethod.toLowerCase()
        );
      }

      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        updated = updated.filter(
          o =>
            o.order_number?.toLowerCase().includes(lower) ||
            o.order_username?.toLowerCase().includes(lower) ||
            o.order_phonenumber?.toLowerCase().includes(lower)
        );
      }

      if (dateFilter?.startDate && dateFilter?.endDate) {
        const startDate = new Date(dateFilter.startDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);

        updated = updated.filter(o => {
          const orderDate = new Date(o.created_at || o.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      }

      setFiltered(updated);
    };

    applyFilters();
  }, [
    status,
    deliveryType,
    paymentMethod,
    searchTerm,
    orders,
    dateFilter?.startDate,
    dateFilter?.endDate
  ]);

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(0);
  };

  const paginatedOrders = filtered.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const pageCount = Math.ceil(filtered.length / itemsPerPage);

  const paginate = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pageCount) {
      setCurrentPage(pageIndex);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [status, deliveryType, paymentMethod, searchTerm, orders, dateFilter]);

  const formatIsoDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().replace("Z", "000Z");
  };

  const storeLabel = (store) => {
    const code = String(store?.branch_code || store?.location_id || "").trim();
    const name = store?.title || store?.organisation_name || store?.store_name || "Store";
    return code ? `${code}-${name}` : name;
  };

  const agencyName = (order) => {
    const owner = String(order?.order_owner || "").trim();
    if (!owner) return "";
    if (owner.toLowerCase() === "sathya") return "Sathya Agencies";
    return owner;
  };

  const numericId = (order) =>
    order?.exist_id || order?.online_pay_refid || "—";

  // Exist PlaceOrder / CheckStatus
  const handlePlaceOrderClick = async (order) => {
    const id = String(order._id);
    const selected = String(rowStoreMap[id] || "").trim();
    const allowed = storesForOrder(order).some(
      (store) => String(store?.branch_code || store?.location_id || "").trim() === selected
    );
    const branchid = allowed ? selected : "";
    if (!branchid) {
      window.alert(
        String(order?.order_owner || "").trim().toLowerCase() === "unilet"
          ? "Select a Unilet store"
          : "Select a Sathya store"
      );
      return;
    }

    setBusyOrderId(id);
    try {
      const res = await fetch(`/api/orders_new/${id}/home-place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchid }),
      });
      const data = await res.json().catch(() => null);
      window.alert(data?.message || (data?.success ? "Order Placed Successfully" : "Place order failed"));
      await loadOrders(stores);
    } catch (err) {
      console.error(err);
      window.alert("Network error occurred");
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCheckStatusClick = async (order) => {
    const id = String(order._id);
    setBusyOrderId(id);
    try {
      const res = await fetch(`/api/orders_new/${id}/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      // Exist: alert only — no DB update
      window.alert(data?.message || "Unable to check status");
    } catch (err) {
      console.error(err);
      window.alert("Network error occurred");
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDeleteClick = () => {};

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">Home delivery</h2>
        <OrderSourceCounts orders={orders} />
      </div>

      {isLoading ? (
        <p>Loading order...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 h-auto overflow-x-auto border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end mb-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2.5a7.5 7.5 0 010 15z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search all order..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="">All Payment Methods</option>
                <option value="online">Online</option>
                <option value="cod">COD</option>
              </select>
            </div>

            <div className="w-full col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="relative w-full max-w-sm">
                <DateRangePicker onDateChange={handleDateChange} />
              </div>
            </div>
          </div>

          {/* Exist-style Home Delivery Orders table (view only) */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="p-2 border whitespace-nowrap">Action</th>
                  <th className="p-2 border whitespace-nowrap">Order Id</th>
                  <th className="p-2 border whitespace-nowrap">Agency</th>
                  <th className="p-2 border whitespace-nowrap">Phone</th>
                  <th className="p-2 border whitespace-nowrap">Id</th>
                  <th className="p-2 border whitespace-nowrap">Date</th>
                  <th className="p-2 border whitespace-nowrap">Store</th>
                  <th className="p-2 border whitespace-nowrap">Status</th>
                  <th className="p-2 border whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length ? (
                  paginatedOrders.map((o) => {
                    const id = String(o._id);
                    const selectedStore = rowStoreMap[id] ?? String(o.pickup_type || "").trim();
                    return (
                      <tr key={id} className="border-t hover:bg-gray-50">
                        <td className="p-2 border relative" ref={openActionId === id ? actionMenuRef : null}>
                          <button
                            type="button"
                            onClick={() => setOpenActionId(openActionId === id ? null : id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                          >
                            Action
                            <span className="text-[10px]">▼</span>
                          </button>
                          {openActionId === id && (
                            <div className="absolute left-2 top-10 z-20 min-w-[120px] bg-white border border-gray-200 rounded shadow-md py-1">
                              <button
                                type="button"
                                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                                onClick={() => {
                                  setOpenActionId(null);
                                  router.push(`/admin/homedelivery/${o._id}`);
                                }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-600"
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleDeleteClick(o);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2 border whitespace-nowrap">{o.order_number || "—"}</td>
                        <td className="p-2 border whitespace-nowrap">{agencyName(o)}</td>
                        <td className="p-2 border whitespace-nowrap">{o.order_phonenumber || "—"}</td>
                        <td className="p-2 border whitespace-nowrap">{numericId(o)}</td>
                        <td className="p-2 border whitespace-nowrap text-xs">
                          {formatIsoDate(o.created_at || o.createdAt)}
                        </td>
                        <td className="p-2 border min-w-[160px]">
                          <select
                            value={selectedStore}
                            onChange={(e) =>
                              setRowStoreMap((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="">Choose</option>
                            {storesForOrder(o).map((store) => {
                              const code = String(store?.branch_code || store?.location_id || "").trim();
                              return (
                                <option key={store._id} value={code || String(store._id)}>
                                  {storeLabel(store)}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="p-2 border whitespace-nowrap">{o.order_status || "—"}</td>
                        <td className="p-2 border whitespace-nowrap">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePlaceOrderClick(o)}
                              disabled={busyOrderId === id}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded disabled:opacity-50"
                            >
                              {busyOrderId === id ? "..." : "PlaceOrder"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCheckStatusClick(o)}
                              disabled={busyOrderId === id}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded disabled:opacity-50"
                            >
                              CheckStatus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-gray-500 p-4">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6 flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              Showing {filtered.length === 0 ? 0 : currentPage * itemsPerPage + 1} to{" "}
              {Math.min((currentPage + 1) * itemsPerPage, filtered.length)} of{" "}
              {filtered.length} entries
            </div>

            <div className="pagination flex items-center space-x-1">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 0}
                className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                  currentPage === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                aria-label="Previous page"
              >
                «
              </button>

              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => paginate(i)}
                  className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                    currentPage === i
                      ? "bg-red-500 text-white"
                      : "text-black bg-white hover:bg-gray-100"
                  }`}
                  aria-label={`Page ${i + 1}`}
                  aria-current={currentPage === i ? "page" : undefined}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pageCount - 1 || pageCount === 0}
                className={`px-3 py-1.5 border border-gray-300 rounded-md ${
                  currentPage === pageCount - 1 || pageCount === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-black bg-white hover:bg-gray-100"
                }`}
                aria-label="Next page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
