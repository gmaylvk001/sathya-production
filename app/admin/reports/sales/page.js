"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const emptyFilters = {
  startDate: "",
  endDate: "",
  zone: "",
  orderStatus: "",
  store: "",
  paymentMethod: "",
  category: "",
  mobile: "",
};

const fieldClass =
  "flex h-9 w-full items-center rounded border border-gray-300 bg-white px-3 text-sm text-gray-700";

function SelectField({ label, value, onChange, placeholder, options = [] }) {
  return (
    <label className="block text-sm text-gray-800">
      {label}
      <select value={value} onChange={onChange} className={`${fieldClass} mt-1`}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const PAGE_SIZE = 20;

function formatWhen(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupees(amount) {
  const number = Number(amount) || 0;
  return `Rs.${number.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function pageNumbers(current, totalPages) {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = [];
  for (let page = Math.max(1, end - 4); page <= end; page += 1) pages.push(page);
  return pages;
}

function authHeaders() {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function salesQuery(source, { page, exportFile } = {}) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (exportFile) params.set("export", "1");
  if (source.startDate) params.set("startDate", source.startDate);
  if (source.endDate) params.set("endDate", source.endDate);
  if (source.zone) params.set("zone", source.zone);
  if (source.orderStatus) params.set("orderStatus", source.orderStatus);
  if (source.store) params.set("store", source.store);
  if (source.paymentMethod) params.set("paymentMethod", source.paymentMethod);
  if (source.category) params.set("category", source.category);
  if (source.mobile) params.set("mobile", source.mobile);
  return params.toString();
}

export default function SalesReportPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState({ ...emptyFilters, page: 1, tick: 0 });
  const [options, setOptions] = useState({
    zones: [],
    stores: [],
    statuses: [],
    paymentMethods: [
      { value: "online", label: "Online" },
      { value: "Cash on Delivery", label: "Cash on Delivery" },
    ],
    categories: [],
  });
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const res = await fetch("/api/admin/reports/sales/options", {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load filter options");
        }
        if (cancelled) return;
        setOptions({
          zones: Array.isArray(data.zones) ? data.zones : [],
          stores: Array.isArray(data.stores) ? data.stores : [],
          statuses: Array.isArray(data.statuses) ? data.statuses : [],
          paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
        });
      } catch (error) {
        if (!cancelled) setActionError(error.message || "Failed to load filter options");
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      setLoadingOrders(true);
      setOrdersError("");
      try {
        const res = await fetch(`/api/admin/reports/sales?${salesQuery(query, { page: query.page })}`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load recent orders");
        }
        if (cancelled) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.totalPages) || 0);
        setTotalAmount(Number(data.totalAmount) || 0);
      } catch (error) {
        if (cancelled) return;
        setOrders([]);
        setTotal(0);
        setTotalPages(0);
        setTotalAmount(0);
        setOrdersError(error.message || "Failed to load recent orders");
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    };

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const selectedZone = options.zones.find((zone) => zone.value === filters.zone);
  const storeOptions = selectedZone
    ? options.stores.filter((store) => String(store.zoneCode) === String(selectedZone.zoneCode))
    : options.stores;

  const setField = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "zone" && next.store) {
        const zone = options.zones.find((item) => item.value === value);
        const store = options.stores.find((item) => item.value === next.store);
        if (!value) return next;
        if (!zone || !store || String(store.zoneCode) !== String(zone.zoneCode)) {
          next.store = "";
        }
      }
      return next;
    });
  };

  const applyFilters = () => {
    setActionError("");
    setQuery((current) => ({
      ...emptyFilters,
      startDate: filters.startDate,
      endDate: filters.endDate,
      zone: filters.zone,
      orderStatus: filters.orderStatus,
      store: filters.store,
      paymentMethod: filters.paymentMethod,
      category: filters.category,
      mobile: filters.mobile.trim(),
      page: 1,
      tick: current.tick + 1,
    }));
  };

  const clearFilters = () => {
    setActionError("");
    setFilters(emptyFilters);
    setQuery((current) => ({ ...emptyFilters, page: 1, tick: current.tick + 1 }));
  };

  const downloadReport = async () => {
    const snapshot = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      zone: filters.zone,
      orderStatus: filters.orderStatus,
      store: filters.store,
      paymentMethod: filters.paymentMethod,
      category: filters.category,
      mobile: filters.mobile.trim(),
    };
    setQuery((current) => ({ ...snapshot, page: 1, tick: current.tick + 1 }));
    setExporting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/reports/sales?${salesQuery(snapshot, { exportFile: true })}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download the report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sathya-sales-report.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(error.message || "Failed to download the report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 text-gray-700">
        <Icon icon="mdi:chart-bar" className="text-lg" />
        <h1 className="text-base font-medium">Sales List</h1>
      </div>

      <div className="p-4">
        <div className="rounded border border-gray-200 bg-[#f5f5f5] p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block text-sm text-gray-800">
              Date Range
              <span className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate || undefined}
                  onChange={setField("startDate")}
                  className={fieldClass}
                  aria-label="Start date"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  onChange={setField("endDate")}
                  className={fieldClass}
                  aria-label="End date"
                />
              </span>
            </label>

            <SelectField
              label="Choose Zone"
              value={filters.zone}
              onChange={setField("zone")}
              placeholder="Select Zone"
              options={options.zones}
            />
            <SelectField
              label="Order Status"
              value={filters.orderStatus}
              onChange={setField("orderStatus")}
              placeholder="Choose"
              options={options.statuses}
            />
            <SelectField
              label="Choose Store"
              value={filters.store}
              onChange={setField("store")}
              placeholder="Choose"
              options={storeOptions}
            />
            <SelectField
              label="Payment Method"
              value={filters.paymentMethod}
              onChange={setField("paymentMethod")}
              placeholder="Choose"
              options={options.paymentMethods}
            />
            <SelectField
              label="Categories"
              value={filters.category}
              onChange={setField("category")}
              placeholder="Choose"
              options={options.categories}
            />

            <label className="block text-sm text-gray-800">
              Total Amount
              <input
                readOnly
                value={formatRupees(totalAmount)}
                className="mt-1 h-9 w-full rounded border border-gray-300 bg-[#ececec] px-3 text-sm text-gray-700"
              />
            </label>

            <label className="block text-sm text-gray-800">
              Mobile Number
              <input
                value={filters.mobile}
                onChange={setField("mobile")}
                className={`${fieldClass} mt-1`}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadReport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded bg-[#3b7fc4] px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              <Icon icon="mdi:download" className="text-base" />
              Export to Excel
            </button>
            <button
              type="button"
              onClick={applyFilters}
              disabled={loadingOrders}
              className="inline-flex items-center gap-2 rounded bg-[#3b7fc4] px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              <Icon icon="mdi:filter-variant" className="text-base" />
              Filter
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <Icon icon="mdi:eraser" className="text-base" />
              Clear
            </button>
            <button
              type="button"
              onClick={downloadReport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-60"
            >
              <Icon icon="mdi:content-save-outline" className="text-base" />
              Download Report
            </button>
          </div>
          {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}
        </div>

        <div className="mt-4 rounded border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-medium text-gray-800">Recent Orders</h2>
            <span className="text-xs text-gray-500">Sathya orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Order No</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Customer</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Mobile</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Amount</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Status</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Payment</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Date</th>
                  <th className="border-b border-gray-200 px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      Loading recent orders...
                    </td>
                  </tr>
                ) : ordersError ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-red-600">
                      {ordersError}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      No Sathya orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="border-b border-gray-100">
                      <td className="px-3 py-2">{order.order_number || "-"}</td>
                      <td className="px-3 py-2">{order.order_username || "-"}</td>
                      <td className="px-3 py-2">{order.order_phonenumber || "-"}</td>
                      <td className="px-3 py-2">₹{order.order_amount || "0"}</td>
                      <td className="px-3 py-2 capitalize">{order.order_status || "-"}</td>
                      <td className="px-3 py-2 capitalize">
                        {order.payment_method || order.payment_status || "-"}
                      </td>
                      <td className="px-3 py-2">{formatWhen(order.created_at)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/Allorder/${order._id}`)}
                          className="rounded bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-gray-600">
            <span>
              Showing {total === 0 ? 0 : (query.page - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(query.page * PAGE_SIZE, total)} of {total} orders
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                }
                disabled={query.page <= 1 || loadingOrders}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              {pageNumbers(query.page, totalPages).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setQuery((current) => ({ ...current, page: number }))}
                  disabled={loadingOrders}
                  className={`rounded border px-3 py-1 ${
                    number === query.page
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: Math.min(totalPages, current.page + 1),
                  }))
                }
                disabled={query.page >= totalPages || totalPages === 0 || loadingOrders}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
