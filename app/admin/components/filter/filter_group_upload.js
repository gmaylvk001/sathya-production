"use client";

import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

export default function BulkFilterGroupUploadPage() {
  const [excelFile, setExcelFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    import("react-toastify/dist/ReactToastify.css");
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".csv");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFile(excelFile)) {
      toast.error("Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    setIsLoading(true);

    try {
      const res = await fetch("/api/filter_group/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok || res.status === 207) {
        // 207 means partial success
        if (res.status === 201) {
          toast.success(data.message);
        } else {
          toast.success(data.message);
          // Show detailed errors if any
          if (data.details && data.details.length > 0) {
            data.details.forEach(error => {
              toast.error(`Row ${error.row}: ${error.error}`);
            });
          }
        }
        
        // Reset form
        setExcelFile(null);
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload failed. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_filter.xlsx?t=${Date.now()}`;
    link.download = "FilterGroupSample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bulk Filter Group Upload
          </h1>
          <p className="text-gray-600">
            Upload multiple filter groups at once using Excel/CSV file
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
        >
          <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Excel/CSV File
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Each row should have columns: <b>filtergroup_name</b>, <b>status</b>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              • <b>filtergroup_name</b>: Name of the filter group (required)<br/>
              • <b>status</b>: Active or Inactive (default: Active)<br/>
              • <b>filtergroup_slug</b> will be auto-generated from the name
            </p>

            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
              required
            />

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <button
                type="button"
                onClick={handleSampleDownload}
                className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828]"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Sample Format
              </button>

              <a
                href="/api/product/filter-bulk-upload/export-product-filters"
                download="sathya_product_filters_export.xlsx"
                className="inline-flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Product Filters (Temp)
              </a>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Upload Filter Groups"
              )}
            </button>
          </div>
        </form>

        <ToastContainer position="top-right" autoClose={5000} />
      </div>
    </div>
  );
}