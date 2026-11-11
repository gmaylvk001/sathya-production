"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Line, Pie } from "react-chartjs-2";
import AdminLoader from "@/app/admin/components/AdminLoader";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const pieOptions = {
  plugins: {
    legend: {
      position: "right",
      labels: {
        boxWidth: 20,
        padding: 15,
        font: { size: 14, weight: "500" },
      },
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label(context) {
          return `${context.label || ""}: ${context.raw || 0}`;
        },
      },
    },
  },
  maintainAspectRatio: false,
};

const statusPieOptions = {
  ...pieOptions,
  plugins: {
    ...pieOptions.plugins,
    title: {
      display: true,
      text: "Order Status Distribution",
      font: { size: 18, weight: "bold" },
      padding: { top: 10, bottom: 20 },
    },
  },
  cutout: "50%",
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function UniletDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!/(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie)) {
      router.replace("/admin/dashboard");
      return;
    }

    const token = localStorage.getItem("token");
    fetch("/api/dashboard/unilet", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSummary(data);
      })
      .finally(() => setPageLoading(false));
  }, [router]);

  if (pageLoading) return <AdminLoader />;

  const stats = summary || {
    totalOrders: 0,
    revenue: 0,
    last30Orders: 0,
    last30Revenue: 0,
    pending: 0,
    productCount: 0,
    customerCount: 0,
    line: { labels: [], data: [] },
    categories: [],
    statuses: [],
    recentOrders: [],
  };

  const lineData = {
    labels: stats.line.labels,
    datasets: [
      {
        label: "Orders",
        data: stats.line.data,
        fill: true,
        backgroundColor: "rgba(157, 143, 236, 0.2)",
        borderColor: "#facc15",
        tension: 0.4,
      },
    ],
  };

  const categoryPie = stats.categories.length
    ? {
        labels: stats.categories.map((item) => item.category),
        datasets: [
          {
            label: "Number of Products",
            data: stats.categories.map((item) => item.count),
            backgroundColor: [
              "#6366f1", "#d72828", "#10b981", "#ef4444", "#f59e0b",
              "#ec4899", "#d97706", "#0f172a", "#14b8a6", "#e11d48",
              "#8b5cf6", "#64748b", "#84cc16", "#f97316", "#06b6d4",
            ],
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      }
    : null;

  const statusPie = stats.statuses.length
    ? {
        labels: stats.statuses.map((item) => item.label),
        datasets: [
          {
            label: "Order Statuses",
            data: stats.statuses.map((item) => item.count),
            backgroundColor: stats.statuses.map((item) => item.color),
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      }
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Unilet Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6">
        <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-[#d72828]/10 to-white">
          <div className="card-body p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white mb-1">Total Orders</p>
                <h6 className="mb-0 dark:text-white">{stats.totalOrders}</h6>
              </div>
              <div className="w-[50px] h-[50px] bg-[#d72828] rounded-full flex justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
            </div>
            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">+{stats.last30Orders}</span>
              Last 30 days orders
            </p>
          </div>
        </div>

        <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-green-600/10 to-white">
          <div className="card-body p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white mb-1">Total Revenue</p>
                <h6 className="mb-0 dark:text-white">₹{money(stats.revenue)}</h6>
              </div>
              <div className="w-[50px] h-[50px] bg-green-600 rounded-full flex justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">+₹{money(stats.last30Revenue)}</span>
              Last 30 days revenue
            </p>
          </div>
        </div>

        <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-yellow-600/10 to-white">
          <div className="card-body p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white mb-1">Pending Orders</p>
                <h6 className="mb-0 dark:text-white">{stats.pending}</h6>
              </div>
              <div className="w-[50px] h-[50px] bg-yellow-600 rounded-full flex justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">Pending orders to process</p>
          </div>
        </div>

        <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-pink-600/10 to-white">
          <div className="card-body p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white mb-1">Total Products</p>
                <h6 className="mb-0 dark:text-white">{stats.productCount}</h6>
              </div>
              <div className="w-[50px] h-[50px] bg-pink-600 rounded-full flex justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
            </div>
            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">Active Unilet owner products</p>
          </div>
        </div>

        <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-purple-600/10 to-white">
          <div className="card-body p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white mb-1">Total Customers</p>
                <h6 className="mb-0 dark:text-white">{stats.customerCount}</h6>
              </div>
              <div className="w-[50px] h-[50px] bg-purple-600 rounded-full flex justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>
            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">Customers on Unilet orders</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-6 text-xl font-semibold">Order Analytics</h3>
        <div className="p-6">
          <Line data={lineData} height={200} width={600} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="mb-6 text-xl font-semibold">Category Wise Products</h3>
          <div className="card p-6 border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg shadow-none" style={{ height: 400 }}>
            {categoryPie && <Pie data={categoryPie} options={pieOptions} />}
          </div>
        </div>
        <div>
          <h3 className="mb-6 text-xl font-semibold">Order Status Distribution</h3>
          <div className="card p-6 border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg shadow-none" style={{ height: 400 }}>
            {statusPie && <Pie data={statusPie} options={statusPieOptions} />}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Recent Orders</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Order #</th>
              <th className="p-2">User</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentOrders.map((order) => (
              <tr key={order._id} className="border-b hover:bg-gray-50">
                <td className="p-2">{order.order_number}</td>
                <td className="p-2">{order.order_username}</td>
                <td className="p-2">₹{order.order_amount}</td>
                <td className="p-2 capitalize">{order.order_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
