"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function RevenueChart({ lineData }) {
  const revenueData = {
    labels: lineData.labels,
    datasets: [
      {
        ...lineData.datasets[0],
        fill: {
          target: 'origin',
          above: 'rgba(72, 127, 255, 0.1)',
        },
        backgroundColor: "rgba(72, 127, 255, 0.1)",
        borderColor: "#487FFF",
        tension: 0.4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#487FFF",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
        backgroundColor: "#1E293B",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#64748B",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context) {
            return `Orders: ${context.raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: "#64748B",
        },
      },
      y: {
        grid: {
          color: "#E2E8F0",
          drawBorder: false,
          borderDash: [3],
        },
        ticks: {
          color: "#64748B",
          callback: function (value) {
            return value;
          },
        },
      },
    },
    elements: {
      line: {
        borderWidth: 3,
      },
      point: {
        radius: 0,
        hoverRadius: 6,
      },
    },
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Order Analytics
        </h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center text-sm font-medium text-green-600">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {Math.floor(Math.random() * 20) + 5}% from last month
          </span>
        </div>
      </div>
      <div className="h-80">
        <Line data={revenueData} options={options} />
      </div>
    </div>
  );
}