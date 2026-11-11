"use client";

import { useEffect, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, Title);

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  return { startDate: "", endDate: "" };
}

function formatValue(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

const emptyStats = {
  total: 0,
  totalAmount: 0,
  complete: 0,
  pending: 0,
  billed: 0,
  rejected: 0,
};

const fieldClass =
  "h-8 w-full min-w-0 appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs text-gray-700 outline-none focus:border-gray-400";

function CompactDateRange({ startDate, endDate, onStartChange, onEndChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative min-w-0" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-full min-w-0 items-center rounded border border-gray-300 bg-white px-2 text-left text-xs text-gray-700 outline-none focus:border-gray-400"
        aria-label="Date range"
      >
        <span className="truncate">
          {startDate && endDate ? `${startDate} - ${endDate}` : "All Time"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded border border-gray-200 bg-white p-2 shadow-md sm:left-auto sm:right-0 sm:w-56">
          <label className="block text-[11px] text-gray-500">
            From
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => onStartChange(event.target.value)}
              className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs outline-none"
            />
          </label>
          <label className="mt-2 block text-[11px] text-gray-500">
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => onEndChange(event.target.value)}
              className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-6" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.2 6.5 3.6L12 11.4 5.5 7.8 12 4.2zM5 9.2l6 3.3v7.1l-6-3.3V9.2zm8 10.4v-7.1l6-3.3v7.1l-6 3.3z" />
    </svg>
  );
}

function CubesIcon() {
  return (
    <svg width="58" height="58" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 2 2 5.2v6.2L8 15l6-3.6V5.2L8 2zm0 2.1 3.6 2.1L8 8.3 4.4 6.2 8 4.1zM4 7.5l3 1.8v4.2l-3-1.8V7.5zm5 6v-4.2l3-1.8v4.2l-3 1.8zM16 8l-4 2.4 2.2 1.3 4-2.3L16 8zm-2.8 4.4 2.8 1.6 2.8-1.6v3.4L16 17.8l-2.8-1.6v-3.4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2 11 14.6 15.8 9.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 18a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 18zm10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 18zM6.2 6l.4 2h12.1l-1.2 6H8.1L6.4 4.8 4 4H2V2h3.2L6.2 6zm1.5 4 .8 4h8.2l.8-4H7.7z" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 3h10v4H7V3zm12 6H5a3 3 0 0 0-3 3v5h4v4h12v-4h4v-5a3 3 0 0 0-3-3zm-2 10H7v-4h10v4zm2-6.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  );
}

function RejectIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function StatCard({ title, value, className, icon }) {
  return (
    <div className={`relative min-h-[92px] overflow-hidden rounded-md px-4 py-3 shadow-[0_3px_8px_rgba(0,0,0,0.12)] ${className}`}>
      <div className="text-[15px] font-semibold text-gray-800">{title}</div>
      <div className="mt-1 text-[22px] font-bold leading-none text-gray-900">{value}</div>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500/35">
        {icon}
      </div>
    </div>
  );
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true } },
    y: { beginAtZero: true, ticks: { font: { size: 10 }, precision: 0 } },
  },
};

function AnalyticsPanel({ title, children }) {
  return (
    <section className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-[#f7f7f7] px-3 py-2 text-[13px] text-gray-800">
        <ChartIcon />
        {title}
      </div>
      <div className="h-52 p-2 sm:h-60">{children}</div>
    </section>
  );
}

function AnalyticsTable({ title, icon, rows }) {
  return (
    <section className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
        {icon}
        {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white text-left text-gray-700">
            <th className="px-3 py-2 font-semibold">Name</th>
            <th className="px-3 py-2 font-semibold">Orders</th>
            <th className="px-3 py-2 font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-gray-600">
                No order found
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.name} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-800">{row.name}</td>
                <td className="px-3 py-2 text-gray-800">{row.orders}</td>
                <td className="px-3 py-2 text-gray-800">{formatValue(row.value)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export default function SalesDashboard() {
  const initialRange = defaultRange();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderType, setOrderType] = useState("");
  const [storeId, setStoreId] = useState("");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [categories, setCategories] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          paymentMethod,
          orderType,
          storeId,
        });
        const res = await fetch(`/api/admin/sales-dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data.success) return;
        setPaymentMethods(data.paymentMethods || []);
        setStores(data.stores || []);
        setStats(data.stats || emptyStats);
        setCategories(data.categories || []);
        setSalesPersons(data.salesPersons || []);
        setCharts(data.charts || null);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Sales dashboard load failed:", error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [paymentMethod, orderType, storeId, startDate, endDate]);

  return (
    <div className="text-gray-800">
      <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-[15px] font-medium text-gray-700">
        <ChartIcon />
        New Orders Analytics
      </div>

      <div className="mb-3 rounded border border-gray-200 p-2">
        <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
          <div className="relative min-w-0">
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={fieldClass}
              aria-label="Payment method"
            >
              <option value="">Payment Method</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">▾</span>
          </div>

          <div className="relative min-w-0">
            <select
              value={orderType}
              onChange={(event) => setOrderType(event.target.value)}
              className={fieldClass}
              aria-label="Order type"
            >
              <option value="">Order Type</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">▾</span>
          </div>

          <div className="relative min-w-0">
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              className={fieldClass}
              aria-label="Store"
            >
              <option value="">All Store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">▾</span>
          </div>

          <div className="min-w-0">
            <CompactDateRange
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
          </div>
        </div>
      </div>

      <div className={`mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-70" : ""}`}>
        <StatCard title="Total" value={stats.total} className="bg-[#f7c7b2]" icon={<BoxIcon />} />
        <StatCard title="Total Amount" value={formatValue(stats.totalAmount)} className="bg-[#f4d6ae]" icon={<CubesIcon />} />
        <StatCard title="Complete Orders" value={stats.complete} className="bg-[#b6f6b4]" icon={<CheckIcon />} />
        <StatCard title="Pending Orders" value={stats.pending} className="bg-[#b7f3fb]" icon={<CartIcon />} />
        <StatCard title="Billed Orders" value={stats.billed} className="bg-[#e8f6a4]" icon={<PrinterIcon />} />
        <StatCard title="Rejected Orders" value={stats.rejected} className="bg-[#f6b7bc]" icon={<RejectIcon />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsTable
          title="Top Selling Categories"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
              <path d="M4 4h7l9 9-7 7-9-9V4zm3 3a1.5 1.5 0 1 0 0.001 3.001A1.5 1.5 0 0 0 7 7z" />
            </svg>
          }
          rows={categories}
        />
        <AnalyticsTable
          title="Top Sales Persons"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 4v2h10.2A7 7 0 0 1 20 14.1V18c0-2.3-4.7-4-8-4zm7 1.5-1.2 1.2.3 1.6-1.4-.8-1.4.8.3-1.6L14.4 15.5l1.6-.2.7-1.5.7 1.5 1.6.2z" />
            </svg>
          }
          rows={salesPersons}
        />
      </div>

      <div className="mt-4 space-y-4">
        <AnalyticsPanel title="Orders Analytics">
          {charts?.orders?.labels?.length ? (
            <Bar
              data={{
                labels: charts.orders.labels,
                datasets: [
                  { label: "Pending", data: charts.orders.pending, backgroundColor: "#0080ff" },
                  { label: "Billed", data: charts.orders.billed, backgroundColor: "#7b2cbf" },
                  { label: "Complete", data: charts.orders.complete, backgroundColor: "#00ff00" },
                  { label: "Cancelled", data: charts.orders.cancelled, backgroundColor: "#ff4000" },
                ],
              }}
              options={chartOptions}
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">No order found</p>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Sales Analytics">
          {charts?.sales?.labels?.length ? (
            <Bar
              data={{
                labels: charts.sales.labels,
                datasets: [
                  { label: "Pending", data: charts.sales.pending, backgroundColor: "#0080ff" },
                  { label: "Sold", data: charts.sales.sold, backgroundColor: "#00ff00" },
                  { label: "Cancelled", data: charts.sales.cancelled, backgroundColor: "#ff4000" },
                ],
              }}
              options={chartOptions}
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">No order found</p>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Category Analysis for Last Month">
          {charts?.categories?.labels?.length ? (
            <Bar
              data={{
                labels: charts.categories.labels,
                datasets: [{ label: "Orders Amount", data: charts.categories.values, backgroundColor: "#0080ff" }],
              }}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: true,
                    text: charts.categories.title,
                    font: { size: 13 },
                    color: "#374151",
                  },
                },
              }}
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">No order found</p>
          )}
        </AnalyticsPanel>
      </div>
    </div>
  );
}
