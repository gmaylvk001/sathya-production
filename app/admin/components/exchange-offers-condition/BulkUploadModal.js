"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      setIsError(true);
      return;
    }

    setIsUploading(true);
    setMessage("");
    setIsError(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/exchange-offers-condition/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage(result.message);
        setIsError(false);
        setTimeout(() => {
          onSuccess();
          onClose();
          setFile(null);
          setMessage("");
        }, 1500);
      } else {
        setMessage(result.error || "Failed to upload file.");
        setIsError(true);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("An error occurred during upload.");
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white shadow-lg w-full max-w-md mx-4 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-medium text-gray-800">Bulk Upload</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel file (.xlsx, .xls) with columns:
            Category Name, Brand, Type, Condition, Zone, Price, Status.
          </p>
          <p className="text-xs text-gray-500">
            Use the same names as the admin dropdowns. Type <span className="font-semibold">ANY</span> (or leave Type / Condition / Zone blank) to apply that field to all values. Example: Category Name = Air Conditioner, Brand = ANY, Type = Split AC.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              className="hidden" 
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Icon icon="mdi:cloud-upload" className="text-4xl text-blue-500 mb-2" />
              <span className="text-sm text-gray-600">
                {file ? file.name : "Click to select a file"}
              </span>
            </label>
          </div>

          {message && (
            <div className={`p-3 rounded text-sm ${isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !file}
              className={`px-4 py-2 text-white rounded flex items-center gap-2 ${
                isUploading || !file ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? (
                <>
                  <Icon icon="eos-icons:loading" className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Icon icon="mdi:upload" /> Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
