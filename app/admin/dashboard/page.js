"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Line, Pie } from "react-chartjs-2";
import RevenueChart from '@/components/RevenueChart';
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

// Register Chart.js components
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

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [pieData, setPieData] = useState(null);
  const [pieOptions, setPieOptions] = useState(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  // New states for order status pie chart data and options
  const [orderStatusPieData, setOrderStatusPieData] = useState(null);
  const [orderStatusPieOptions, setOrderStatusPieOptions] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (/(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie)) {
      router.replace("/admin/unilet-dashboard");
      return;
    }

    // Fetch orders
    const ordersReq = fetch("/api/orders/getorder", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);

          // Calculate order status counts for pie chart
          const statusCounts = data.orders.reduce((acc, order) => {
            const status = order.order_status || "unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});

          // Prepare data for order status pie chart
          setOrderStatusPieData({
            labels: Object.keys(statusCounts).map((status) =>
              status.charAt(0).toUpperCase() + status.slice(1)
            ),
            datasets: [
              {
                label: "Order Statuses",
                data: Object.values(statusCounts),
                backgroundColor: [
                  "#fbbf24", // yellow - pending
                  "#ef4444", // red - cancelled
                  "#22c55e", // green - shipped
                  "#d72828", // blue - delivered or others
                  "#9ca3af", // gray - unknown or others
                ],
                borderColor: "#fff",
                borderWidth: 2,
                hoverOffset: 8,
              },
            ],
          });

         setOrderStatusPieOptions({
  plugins: {
    legend: {
      position: "right",
      labels: {
        boxWidth: 20,
        padding: 15,
        font: {
          size: 14,
          weight: "500",
        },
      },
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: function (context) {
          const label = context.label || "";
          const value = context.raw || 0;
          return `${label}: ${value}`;
        },
      },
    },
    title: {
      display: true,
      text: "Order Status Distribution",
      font: {
        size: 18,
        weight: "bold",
      },
      padding: {
        top: 10,
        bottom: 20,
      },
    },
  },
  maintainAspectRatio: false,
  cutout: "50%", // 👈 This makes it a donut chart
});

        }
      });

    // Fetch category-product count
    // fetch("/api/dashboard/category-product-count")
    //   .then((res) => res.json())
    //   .then((data) => {
    //     if (data.success) {
    //       // set pie chart data
    //       setPieData({
    //         labels: data.data.map((item) => item.category),
    //         datasets: [
    //           {
    //             label: "Number of Products",
    //             data: data.data.map((item) => item.count),
    //             backgroundColor: [
    //               "#6366f1",
    //               "#d72828",
    //               "#10b981",
    //               "#ef4444",
    //               "#f59e0b",
    //               "#ec4899",
    //               "#d97706",
    //               "#0f172a",
    //               "#14b8a6",
    //               "#e11d48",
    //             ],
    //             borderColor: "#fff",
    //             borderWidth: 2,
    //             hoverOffset: 8,
    //           },
    //         ],
    //       });

    //       setPieOptions({
    //         plugins: {
    //           legend: {
    //             position: "right",
    //             labels: {
    //               boxWidth: 20,
    //               padding: 15,
    //               font: {
    //                 size: 14,
    //                 weight: "500",
    //               },
    //             },
    //           },
    //           tooltip: {
    //             enabled: true,
    //             callbacks: {
    //               label: function (context) {
    //                 const label = context.label || "";
    //                 const value = context.raw || 0;
    //                 return `${label}: ${value}`;
    //               },
    //             },
    //           },
    //         },
    //         maintainAspectRatio: false,
    //       });

    //       // set total product count for summary card
    //       setProductCount(data.totalProductCount);
    //     }
    //   });
    const categoryReq = fetch("/api/dashboard/category-product-count")
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      // Extended color palette with more unique colors
      const colorPalette = [
        "#6366f1", "#d72828", "#10b981", "#ef4444", "#f59e0b",
        "#ec4899", "#d97706", "#0f172a", "#14b8a6", "#e11d48",
        "#8b5cf6", "#64748b", "#84cc16", "#f97316", "#06b6d4",
        "#a855f7", "#d946ef", "#f43f5e", "#22d3ee", "#4ade80",
        "#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"
      ];

      // Create a color map to ensure consistent colors for categories
      const categoryColorMap = {};
      data.data.forEach((item, index) => {
        if (!categoryColorMap[item.category]) {
          categoryColorMap[item.category] = colorPalette[index % colorPalette.length];
        }
      });

      // set pie chart data with unique colors
      setPieData({
        labels: data.data.map((item) => item.category),
        datasets: [
          {
            label: "Number of Products",
            data: data.data.map((item) => item.count),
            backgroundColor: data.data.map(item => categoryColorMap[item.category]),
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      });

      setPieOptions({
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 20,
              padding: 15,
              font: {
                size: 14,
                weight: "500",
              },
            },
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
        maintainAspectRatio: false,
      });

      // set total product count for summary card
      setProductCount(data.totalProductCount);
    }
  });

    // Fetch customer count
    const usersReq = fetch("/api/users/getcount")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomerCount(data.customerCount);
        }
      });

    Promise.allSettled([ordersReq, categoryReq, usersReq]).finally(() => {
      setPageLoading(false);
    });
  }, [router]);

  // Prepare line chart data for orders by date
  const dates = orders.map((order) =>
    new Date(order.createdAt).toISOString().split("T")[0]
  );

  const orderCounts = dates.reduce((acc, date) => {
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const lineData = {
    labels: Object.keys(orderCounts),
    datasets: [
      {
        label: "Orders",
        data: Object.values(orderCounts),
        fill: true,
        backgroundColor: "rgba(157, 143, 236, 0.2)",
        borderColor: "#facc15",
        tension: 0.4,
      },
    ],
  };



  var options = {
    series: [{
      name: "This month",
      data: [10, 20, 12, 30, 14, 35, 16, 32, 14, 25, 13, 28]
    }],
    chart: {
      height: 264,
      type: 'line',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      dropShadow: {
        enabled: true,
        top: 6,
        left: 0,
        blur: 4,
        color: "#000",
        opacity: 0.1,
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      colors: ['#487FFF'], // Specify the line color here
      width: 3
    },
    markers: {
      size: 0,
      strokeWidth: 3,
      hover: {
        size: 8
      }
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
      },
      y: {
        show: false,
      },
      z: {
        show: false,
      }
    },
    grid: {
      row: {
        colors: ['transparent', 'transparent'], // takes an array which will be repeated on columns
        opacity: 0.5
      },
      borderColor: '#D1D5DB',
      strokeDashArray: 3,
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return "$" + value + "k";
        },
        style: {
          fontSize: "14px"
        }
      },
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      tooltip: {
        enabled: false
      },
      labels: {
        formatter: function (value) {
          return value;
        },
        style: {
          fontSize: "14px"
        }
      },
      axisBorder: {
        show: false
      },
      crosshairs: {
        show: true,
        width: 20,
        stroke: {
          width: 0
        },
        fill: {
          type: 'solid',
          color: '#487FFF40',
          // gradient: {
          //   colorFrom: '#D8E3F0',
          //   // colorTo: '#BED1E6',
          //   stops: [0, 100],
          //   opacityFrom: 0.4,
          //   opacityTo: 0.5,
          // },
        }
      }
    }
  };

  if (pageLoading) {
    return <AdminLoader />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
{/* Summary Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6">
  {/* Total Orders */}
  <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-[#d72828]/10 to-white">
    <div className="card-body p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">
            Total Orders
          </p>
          <h6 className="mb-0 dark:text-white">{orders.length}</h6>
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
        <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          +{Math.floor(orders.length * 0.1)}
        </span>
        Last 30 days orders
      </p>
    </div>
  </div>

  {/* Total Revenue */}
  <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-green-600/10 to-white">
    <div className="card-body p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">
            Total Revenue
          </p>
          <h6 className="mb-0 dark:text-white">
            ₹
            {orders
              .reduce((acc, o) => acc + parseFloat(o.order_amount || 0), 0)
              .toFixed(2)}
          </h6>
        </div>
        <div className="w-[50px] h-[50px] bg-green-600 rounded-full flex justify-center items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
      </div>
      <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          +₹
          {(
            orders.reduce((acc, o) => acc + parseFloat(o.order_amount || 0), 0) *
            0.1
          ).toFixed(2)}
        </span>
        Last 30 days revenue
      </p>
    </div>
  </div>

  {/* Pending Orders */}
  <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-yellow-600/10 to-white">
    <div className="card-body p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">
            Pending Orders
          </p>
          <h6 className="mb-0 dark:text-white">
            {orders.filter((o) => o.order_status === "pending").length}
          </h6>
        </div>
        <div className="w-[50px] h-[50px] bg-yellow-600 rounded-full flex justify-center items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
      </div>
      <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Pending orders to process
        </span>
      </p>
    </div>
  </div>

 
    {/* Total Products */}
  <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-pink-600/10 to-white">
    <div className="card-body p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">
            Total Products
          </p>
          <h6 className="mb-0 dark:text-white">{productCount}</h6>
        </div>
        <div className="w-[50px] h-[50px] bg-pink-600 rounded-full flex justify-center items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
      </div>
      <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 2v4"></path>
            <path d="M5 10v4a7 7 0 0 0 14 0v-4"></path>
            <path d="M5 10h14"></path>
            <path d="M12 18a2 2 0 0 1-2-2v-2a2 2 0 0 1 4 0v2a2 2 0 0 1-2 2z"></path>
          </svg>
          Total products available
        </span>
      </p>
    </div>
  </div>

  {/* Total Customers */}
  <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-purple-600/10 to-white">
    <div className="card-body p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">
            Total Customers
          </p>
          <h6 className="mb-0 dark:text-white">{customerCount}</h6>
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
      <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Total registered customers
        </span>
      </p>
    </div>
  </div>
</div>
  {/* Line Chart */}
     <div>
      <h3 className="mb-6 text-xl font-semibold">Order Analytics</h3>
      <div className="p-6">
        <Line data={lineData} height={200} width={600} />

       {/* <RevenueChart /> */}
      </div>
    </div>
      
      

      {/* Pie charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category wise product count pie chart */}
        <div>
          <h3 className="mb-6 text-xl font-semibold">Category Wise Products</h3>
          <div
            className="card p-6 border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg shadow-none"
            style={{ height: 400 }}
          >
            {pieData && <Pie data={pieData} options={pieOptions} />}
          </div>
        </div>

        {/* New Order Status pie chart */}
        <div>
          <h3 className="mb-6 text-xl font-semibold">Order Status Distribution</h3>
          <div
            className="card p-6 border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg shadow-none"
            style={{ height: 400 }}
          >
            {orderStatusPieData && <Pie data={orderStatusPieData} options={orderStatusPieOptions} />}
          </div>
        </div>
      </div>
         {/* Recent Orders Table */}
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
            {orders.slice(0, 5).map((o) => (
              <tr key={o._id} className="border-b hover:bg-gray-50">
                <td className="p-2">{o.order_number}</td>
                <td className="p-2">{o.order_username}</td>
                <td className="p-2">₹{o.order_amount}</td>
                <td className="p-2 capitalize">{o.order_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
