"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";

export default function BulkUploadPage() {
  const [excelFile, setExcelFile] = useState(null);
  const [imageZip, setImageZip] = useState(null);
  const [overviewZip, setOverviewZip] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateFile = (file, allowedExtensions) => {
    if (!file) return false;
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some((ext) => fileName.endsWith(ext));
  };
  
  useEffect(() => {
    import("react-toastify/dist/ReactToastify.css");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required files
    if (!excelFile || !validateFile(excelFile, [".xlsx", ".csv"])) {
      toast.error("Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("excel", excelFile);
    if (imageZip) formData.append("images", imageZip);
    if (overviewZip) formData.append("overview", overviewZip);

    try {
      const response = await fetch("/api/product/item-code-delete-bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /*  const handleDownload = () => {
  const link = document.createElement('a');
  link.href = `/uploads/files/stock_status_bulk_upload.xlsx?t=${Date.now()}`;
  link.download = 'StockStatusBulkUpload.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; */


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Status Bulk Upload</h1>
          <p className="text-gray-600">Upload Stock Status in bulk using Excel/CSV and ZIP files</p>
          <p className="text-sm text-gray-500 mt-2">
            For stock_status-only updates, include only Item Code and Stock Status columns
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
          {/* Excel File Section */}
          <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel/CSV File
              </h3>
              <p className="text-sm text-gray-500 mt-1">Upload your Stock Status data file</p>
            </div>
            <div className="space-y-4">
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                required
              />
            

              {/*  <button
                type="button"   // <-- Add this
                onClick={handleDownload}
                className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample Format
              </button> */}

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Start Upload'
              )}
            </button>
          </div>
        </form>

        <ToastContainer position="top-right" autoClose={5000} />
      </div>
    </div>
  );
}