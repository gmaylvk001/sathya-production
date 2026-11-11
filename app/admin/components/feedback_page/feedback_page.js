"use client";

import React, { useEffect, useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import { Icon } from '@iconify/react';

export default function FeedbackComponent() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    fetchFeedbacks();
  }, [search, statusFilter, dateFilter]);

  const fetchFeedbacks = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (statusFilter !== "All") params.append("status", statusFilter);
    if (dateFilter.startDate && dateFilter.endDate) {
      params.append("startDate", dateFilter.startDate);
      params.append("endDate", dateFilter.endDate);
    }

    try {
      const res = await fetch(`/api/feedback/get?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data || []);
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => 
    { try { await fetch("/api/feedback/status", 
        { method: "PUT", 
            headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ id, status }), });
              setFeedbacks((prev) => prev.map((f) => 
                (f._id === id ? { ...f, status } : f)) ); 
            } 
              catch (error) { console.error("Status update failed", error); } };

  const handleDateChange = ({ startDate, endDate }) => {
    setDateFilter({ startDate, endDate });
  };



  const exportToExcel = async () => {
    const XLSX = await import("xlsx");

  // Prepare only required fields
  const dataForExport = feedbacks.map((item) => ({
    Date: item.createdAt
      ? item.createdAt.split("T")[0]
      : "",

    Name: item.name || "",

    Email: item.email_address || "",

    Mobile: item.mobile_number || "",

    Invoice: item.invoice_number || "",

    Feedback: item.feedback || "",
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataForExport, {
    header: [
      "Date",
      "Name",
      "Email",
      "Mobile",
      "Invoice",
      "Feedback",
    ],
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Append sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback");

  // Download file
  XLSX.writeFile(
    workbook,
    `feedback_export_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};


  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-2xl font-bold">Customer Feedback Details</h2>
      </div>

      {loading ? (
        <p>Loading feedback...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto border border-gray-200">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="Search name, email, invoice..."
                className="w-full p-2 border rounded-md"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full p-2 border rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Date */}
            <div className="w-full col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
              <DateRangePicker onDateChange={handleDateChange} />
              </div>
            </div>
           </div>

           <div className="w-full col-span-1 md:col-span-1 flex items-end">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Icon icon="mdi:microsoft-excel" className="text-lg" />
              Export to Excel
            </button>
          </div>

         

            </div>

          <hr className="mb-4" />

          {/* EMPTY STATE */}
          {feedbacks.length === 0 ? (
            <p className="text-center text-gray-500">
              No Feedback found
            </p>
          ) : (
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="p-2">Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Mobile</th>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Feedback</th>
                  {/* <th className="p-2">Status</th> */}
                </tr>
              </thead>

              <tbody>
                {feedbacks.map((f) => (
                  <tr key={f._id} className="border-b text-center">
                    <td className="p-2 whitespace-nowrap">{f.createdAt.split("T")[0] || "-"}</td>
                    <td className="p-2">{f.name || "-"}</td>
                    <td className="p-2">{f.email_address || "-"}</td>
                    <td className="p-2">{f.mobile_number || "-"}</td>
                    <td className="p-2">{f.invoice_number || "-"}</td>
                    <td className="p-2">{f.feedback || "-"}</td>
                    {/* <td className="p-2">
                    <select
                      value={f.status}
                      onChange={(e) =>
                        handleStatusChange(f._id, e.target.value)
                      }
                      className="border px-2 py-1 rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td> */}
                    {/* <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          f.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
