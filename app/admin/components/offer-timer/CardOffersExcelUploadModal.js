"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

export default function CardOffersExcelUploadModal({
  isOpen,
  onClose,
  currentTimerId,
  currentTimerTitle,
  onSuccess,
}) {
  const [timers, setTimers] = useState([]);
  const [selectedTimerId, setSelectedTimerId] = useState(currentTimerId || "");
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(""); // "uploading", "processing", "saving"
  const [uploadProgress, setUploadProgress] = useState(0);

  const [generalError, setGeneralError] = useState("");
  const [resultSummary, setResultSummary] = useState(null);

  const excelInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Sync selectedTimerId when currentTimerId changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentTimerId) {
        setSelectedTimerId(String(currentTimerId));
      }
      setGeneralError("");
      setResultSummary(null);
      setUploadProgress(0);
      setUploadPhase("");
      fetchTimers();
    } else {
      // Reset form when closed
      setExcelFile(null);
      setZipFile(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  }, [isOpen, currentTimerId]);

  // Fetch available timers for dropdown
  const fetchTimers = async () => {
    try {
      const res = await fetch("/api/offer-timer/card-offer/excel-upload");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.timers)) {
        setTimers(data.timers);
        if (!selectedTimerId && data.timers.length > 0) {
          setSelectedTimerId(String(data.timers[0]._id || data.timers[0].timerId));
        }
      }
    } catch (e) {
      console.warn("Could not load timers list:", e);
    }
  };

  if (!isOpen) return null;

  // Handle Excel / CSV file selection
  const handleExcelChange = (e) => {
    setGeneralError("");
    const file = e.target.files?.[0];
    if (!file) {
      setExcelFile(null);
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setGeneralError("Please select a valid spreadsheet (.xlsx, .xls, or .csv).");
      setExcelFile(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setGeneralError("Spreadsheet file size must be less than 20MB.");
      setExcelFile(null);
      if (excelInputRef.current) excelInputRef.current.value = "";
      return;
    }

    setExcelFile(file);
  };

  // Handle ZIP file selection
  const handleZipChange = (e) => {
    setGeneralError("");
    const file = e.target.files?.[0];
    if (!file) {
      setZipFile(null);
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".zip")) {
      setGeneralError("Please select a valid archive file (.zip).");
      setZipFile(null);
      if (zipInputRef.current) zipInputRef.current.value = "";
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setGeneralError("ZIP file size must be less than 100MB.");
      setZipFile(null);
      if (zipInputRef.current) zipInputRef.current.value = "";
      return;
    }

    setZipFile(file);
  };

  // Handle Submit / Upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");

    if (!selectedTimerId) {
      setGeneralError("Please select an Offer Timer.");
      return;
    }

    if (!excelFile) {
      setGeneralError("Please choose an Excel or CSV file to upload.");
      return;
    }

    if (!zipFile) {
      setGeneralError("Please choose an Images ZIP file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadPhase("uploading");
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append("timerId", selectedTimerId);
      formData.append("excel", excelFile);
      formData.append("zip", zipFile);

      setUploadPhase("processing");
      setUploadProgress(60);

      const res = await fetch("/api/offer-timer/card-offer/excel-upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(90);
      const data = await res.json();

      setUploadProgress(100);

      if (res.ok && data.success) {
        setResultSummary(data);
        if (typeof onSuccess === "function") {
          onSuccess(data);
        }
      } else {
        setGeneralError(data.error || "Failed to import card offers. Please check your files.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setGeneralError("Network error or server timeout while uploading files. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadPhase("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <Icon icon="mdi:file-excel" className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 tracking-tight">
              Upload Card OfferS
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="Close"
          >
            <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-130px)] overflow-y-auto">
          
          {/* General Error Banner */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start gap-2.5">
              <Icon icon="solar:danger-circle-bold" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Upload Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{generalError}</p>
              </div>
            </div>
          )}

          {/* Result Summary View */}
          {resultSummary ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                resultSummary.failedCount === 0
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <div className="flex items-center gap-2">
                  <Icon
                    icon={resultSummary.failedCount === 0 ? "solar:check-circle-bold" : "solar:danger-triangle-bold"}
                    className={`w-6 h-6 ${resultSummary.failedCount === 0 ? "text-green-600" : "text-amber-600"}`}
                  />
                  <h4 className="font-semibold text-base">Import Completed</h4>
                </div>
                <p className="text-sm mt-1">{resultSummary.message}</p>

                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-gray-200/60 text-center">
                  <div className="bg-white/80 rounded p-2 border border-gray-100 shadow-xs">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Total Rows</p>
                    <p className="text-lg font-bold text-gray-800">{resultSummary.totalRows}</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-gray-100 shadow-xs">
                    <p className="text-[11px] text-green-600 uppercase tracking-wider font-semibold">Created</p>
                    <p className="text-lg font-bold text-green-700">{resultSummary.createdCount ?? resultSummary.importedCount}</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-gray-100 shadow-xs">
                    <p className="text-[11px] text-blue-600 uppercase tracking-wider font-semibold">Updated</p>
                    <p className="text-lg font-bold text-blue-700">{resultSummary.updatedCount ?? 0}</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-gray-100 shadow-xs">
                    <p className="text-[11px] text-amber-600 uppercase tracking-wider font-semibold">Errors</p>
                    <p className="text-lg font-bold text-amber-700">{resultSummary.failedCount}</p>
                  </div>
                </div>
              </div>

              {/* Row-Level Errors List */}
              {resultSummary.errors && resultSummary.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-100/80 px-4 py-2 border-b border-red-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Icon icon="solar:danger-circle-bold" className="w-4 h-4 text-red-600" />
                      Row Validation Errors ({resultSummary.errors.length})
                    </span>
                    <span className="text-xs text-red-600">These rows were skipped</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-red-100 bg-red-50/40 text-xs text-red-900">
                    {resultSummary.errors.map((err, idx) => (
                      <div key={idx} className="px-4 py-2 flex items-start gap-2">
                        <span className="font-mono font-semibold bg-red-200/80 text-red-800 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                          Row {err.row}
                        </span>
                        <span className="flex-1">
                          {err.title && <span className="font-semibold">{err.title} — </span>}
                          <span>{err.message}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons after completion */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setResultSummary(null);
                    setExcelFile(null);
                    setZipFile(null);
                    if (excelInputRef.current) excelInputRef.current.value = "";
                    if (zipInputRef.current) zipInputRef.current.value = "";
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium shadow-xs transition-colors"
                >
                  Done & View Offers
                </button>
              </div>
            </div>
          ) : (
            /* Upload Form Matching Reference Screenshot 1 */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Offer Timer Title Field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Offer Timer Title
                </label>
                <select
                  value={selectedTimerId}
                  onChange={(e) => setSelectedTimerId(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 cursor-pointer"
                >
                  {timers.length > 0 ? (
                    timers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.title} {t.timerId ? `(ID: ${t.timerId})` : ""}
                      </option>
                    ))
                  ) : (
                    <option value={currentTimerId}>
                      {currentTimerTitle || `Current Offer Timer (ID: ${currentTimerId})`}
                    </option>
                  )}
                </select>
              </div>

              {/* Choose Excel / CSV File */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Choose Excel / CSV File
                </label>
                <div className="border border-gray-300 rounded bg-white p-2">
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={handleExcelChange}
                    disabled={isUploading}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3.5 file:rounded file:border file:border-gray-300 file:text-xs file:font-medium file:bg-gray-100 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Accepted: <span className="font-medium">.xlsx</span>,{" "}
                  <span className="font-medium">.xls</span>,{" "}
                  <span className="font-medium">.csv</span>
                </p>
                <div>
                  <a
                    href="/samples/sample-card-offers.xlsx"
                    download="sample-card-offers.xlsx"
                    className="text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium mt-0.5"
                  >
                    <Icon icon="mdi:download-outline" className="w-3.5 h-3.5" />
                    Sample Excel Download
                  </a>
                </div>
              </div>

              {/* Choose Image zip File */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Choose Image zip File
                </label>
                <div className="border border-gray-300 rounded bg-white p-2">
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleZipChange}
                    disabled={isUploading}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-1.5 file:px-3.5 file:rounded file:border file:border-gray-300 file:text-xs file:font-medium file:bg-gray-100 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer"
                  />
                </div>
                <div>
                  <a
                    href="/samples/sample-card-offers-images.zip"
                    download="sample-card-offers-images.zip"
                    className="text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium mt-0.5"
                  >
                    <Icon icon="mdi:download-outline" className="w-3.5 h-3.5" />
                    Download Sample Images Zip
                  </a>
                </div>
              </div>

              {/* Action Buttons: Cancel and Upload */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !excelFile || !zipFile}
                  className="px-5 py-1.5 bg-[#5cb85c] hover:bg-[#4cae4c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Upload</span>
                  )}
                </button>
              </div>

              {/* Progress Indicator */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      {uploadPhase === "uploading" && "Uploading spreadsheet & ZIP files..."}
                      {uploadPhase === "processing" && "Extracting ZIP, parsing spreadsheet & saving offers..."}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-2 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Red Guideline / Warning Notice Matching Reference Screenshot 1 */}
              <p className="text-xs text-red-500 leading-relaxed pt-2">
                Please ensure that the Excel/CSV file contains image names with their proper extensions (e.g., image1.jpg, banner.png). The same image files must be included inside the uploaded ZIP file.
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
