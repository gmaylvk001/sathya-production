"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaFilePdf } from "react-icons/fa";
import { FiDownload, FiX, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { readStoredSession } from "@/lib/clientAuthSession";

/**
 * DealsPdfModal
 * Centered popup modal matching Sathya reference design (Image 2).
 * Displays "Click Generate PDF Button and Click Download Button".
 * Generates and downloads PDF with `{ status: 1, file_name: "<random_4_digit>.pdf" }`
 * matching reference Image 2 and Image 3.
 */
export default function DealsPdfModal({
  isOpen,
  onClose,
  dealsData = null,
  activeTimer = null,
  exportType = "deals-offer",
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleGeneratePdf = useCallback(async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);

      // 1. Check frontend auth token
      const session = typeof window !== "undefined" ? readStoredSession() : null;
      const token =
        session?.token ||
        (typeof window !== "undefined" ? localStorage.getItem("token") : null);

      if (!token) {
        setErrorMessage("Please sign in to generate and download Deals Offer PDF.");
        setIsGenerating(false);
        return;
      }

      const effectiveSections =
        dealsData ||
        (typeof window !== "undefined" ? window.__dealsOfferSections : null);
      const effectiveTimer =
        activeTimer ||
        (typeof window !== "undefined" ? window.__dealsOfferTimers?.[0] : null);

      const endpoint = exportType === "deals-offer" ? "/api/deals-offer/pdf" : "/api/pdf-export";
      const requestBody =
        exportType === "deals-offer"
          ? { sections: effectiveSections, activeTimer: effectiveTimer }
          : { type: exportType };

      // 2. Request PDF generation from backend API with auth guard
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errText = "Failed to generate PDF. Please try again.";
        try {
          const errJson = await response.json();
          if (errJson?.error) errText = errJson.error;
        } catch (_) {}
        throw new Error(errText);
      }

      const data = await response.json();

      // Backend returns { status: 1, file_name: "<random_4_digit>.pdf" }
      if (data?.status === 1 && data?.file_name) {
        const fileTargetUrl = data.url || `/php-excel-export/${data.file_name}`;
        setFileName(data.file_name);
        setDownloadUrl(fileTargetUrl);

        // Automatically open the PDF in a new tab (Matches reference Image 3 URL: sathya.store/php-excel-export/7933.pdf)
        try {
          const newWindow = window.open(fileTargetUrl, "_blank", "noopener,noreferrer");
          if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
            // Popup was blocked: trigger download link as fallback
            const link = document.createElement("a");
            link.href = fileTargetUrl;
            link.download = data.file_name;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (_) {
          const link = document.createElement("a");
          link.href = fileTargetUrl;
          link.download = data.file_name;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        throw new Error(data?.error || "Invalid response from PDF generation server.");
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      setErrorMessage(err.message || "An error occurred while generating PDF.");
    } finally {
      setIsGenerating(false);
    }
  }, [dealsData, activeTimer]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 sm:p-9 text-center border border-gray-100 transition-all transform animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
        >
          <FiX size={20} />
        </button>

        {/* Modal Prompt Text (Matches Reference Image 2) */}
        <p
          id="pdf-modal-title"
          className="text-gray-700 text-sm sm:text-base font-semibold leading-relaxed mb-6 sm:mb-8"
        >
          Click Generate PDF Button and Click Download Button
        </p>

        {/* Action Button Area */}
        <div className="flex flex-col items-center justify-center gap-3">
          {!downloadUrl ? (
            <button
              type="button"
              id="generate-pdf-btn"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className={`inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 rounded-md text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-md transition-all duration-200 cursor-pointer ${
                isGenerating
                  ? "bg-[#d72828]/85 cursor-wait"
                  : "bg-[#d72828] hover:bg-red-700 active:scale-95 hover:shadow-lg"
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FaFilePdf size={17} />
                  <span>GENERATE PDF</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <a
                href={downloadUrl}
                download={fileName || "Deals-Offer-PDF-Export.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                id="pdf-download-btn"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-md border-2 border-[#d72828] text-[#d72828] hover:bg-[#d72828] hover:text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 shadow-xs hover:shadow active:scale-95"
              >
                <FiDownload size={18} />
                <span>DOWNLOAD NOW</span>
              </a>

              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors pt-1 cursor-pointer"
              >
                <FiRefreshCw size={13} className={isGenerating ? "animate-spin" : ""} />
                <span>Regenerate PDF</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-red-600 font-medium bg-red-50 border border-red-200/80 rounded-lg px-3.5 py-2.5 mt-3 text-left">
              <FiAlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
