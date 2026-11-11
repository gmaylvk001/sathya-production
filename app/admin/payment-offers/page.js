"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import AdminPageShell from "../components/AdminPageShell";

// ==========================================
// Vector SVG Fallback Icons for Major Banks
// ==========================================
function BankBuildingIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L2 7h20L12 2zm-8 7h2v9H4V9zm5 0h2v9H9V9zm5 0h2v9h-2V9zm5 0h2v9h-2V9zM2 20h20v2H2v-2z" />
    </svg>
  );
}

function SBILogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#0082cb" />
      <circle cx="12" cy="10" r="3.2" fill="#ffffff" />
      <rect x="10.8" y="10" width="2.4" height="7.5" fill="#ffffff" rx="1.2" />
    </svg>
  );
}

function AxisLogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="4" fill="#881337" />
      <path d="M12 5.5l5.5 11h-3.2L12 11.8l-2.3 4.7H6.5L12 5.5z" fill="#ffffff" />
    </svg>
  );
}

function HDFCLogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="44.4" y="44.4" width="11.2" height="11.2" fill="#004c8f" rx="0.5" />
      <path d="M22 22 H44.4 V33.2 H33.2 V44.4 H22 Z" fill="#ed1c24" />
      <path d="M55.6 22 H78 V44.4 H66.8 V33.2 H55.6 Z" fill="#ed1c24" />
      <path d="M22 55.6 H33.2 V66.8 H44.4 V78 H22 Z" fill="#ed1c24" />
      <path d="M66.8 55.6 H78 V78 H55.6 V66.8 H66.8 Z" fill="#ed1c24" />
    </svg>
  );
}

function ICICILogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="16" fill="#b02a30" />
      <circle cx="50" cy="34" r="10" fill="#f39c12" />
      <path d="M42 50 C42 46, 58 46, 58 50 L58 72 C58 76, 42 76, 42 72 Z" fill="#ffffff" />
      <path d="M50 20 C66 20, 80 34, 80 50 C80 66, 66 80, 50 80" stroke="#f39c12" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function KotakLogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="16" fill="#ed1c24" />
      <path d="M35 50 C35 40 45 35 50 45 C55 55 65 60 65 50 C65 40 55 35 50 45 C45 55 35 60 35 50 Z" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function SCBLogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="16" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M30 22 C22 22 16 30 16 42 C16 58 35 68 55 80 L62 70 C48 60 30 52 30 42 C30 36 34 32 40 32 Z" fill="#00965e" />
      <path d="M70 78 C78 78 84 70 84 58 C84 42 65 32 45 20 L38 30 C52 40 70 48 70 58 C70 64 66 68 60 68 Z" fill="#0072ce" />
    </svg>
  );
}

function RBLLogoVector({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="16" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M25 75 L50 25 L75 75 Z" fill="#003366" />
      <path d="M50 45 L68 75 L32 75 Z" fill="#cc0000" />
    </svg>
  );
}

/**
 * Intelligent Bank Logo Component
 * Tries image URL first with onError fallback to crisp vector SVG
 */
function BankLogoBadge({ bank = {}, size = 28 }) {
  const [hasError, setHasError] = useState(false);
  const code = (bank?.code || bank?.shortCode || "").toUpperCase();
  const logoUrl = bank?.logoUrl || bank?.logo || "";

  // Reset error state if logoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const renderVectorFallback = () => {
    const cls = `w-full h-full object-contain`;
    switch (code) {
      case "SBI":
        return <SBILogoVector className={cls} />;
      case "AXIS":
        return <AxisLogoVector className={cls} />;
      case "HDFC":
        return <HDFCLogoVector className={cls} />;
      case "ICICI":
        return <ICICILogoVector className={cls} />;
      case "KOTAK":
        return <KotakLogoVector className={cls} />;
      case "SCB":
        return <SCBLogoVector className={cls} />;
      case "RBL":
        return <RBLLogoVector className={cls} />;
      default:
        return (
          <div className="w-full h-full rounded bg-gray-100 flex items-center justify-center font-black text-[9px] text-gray-700">
            {code ? code.slice(0, 4) : "BANK"}
          </div>
        );
    }
  };

  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-full overflow-hidden bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs"
    >
      {logoUrl && !hasError ? (
        <Image
          src={logoUrl}
          alt={bank?.name || code || "Bank"}
          width={size}
          height={size}
          className="w-full h-full object-contain p-0.5"
          unoptimized
          onError={() => setHasError(true)}
        />
      ) : (
        renderVectorFallback()
      )}
    </div>
  );
}

// ==========================================
// Main Admin Dashboard Page Component
// ==========================================
export default function AdminPaymentOffersPage() {
  const [offers, setOffers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | BANK_OFFER | EMI_OFFER
  const [selectedBankFilter, setSelectedBankFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, isDestructive }
  const [toast, setToast] = useState(null); // { message, type: "success" | "error" | "info" }

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);

  // Form State
  const initialFormState = {
    bank: "",
    title: "",
    description: "",
    offerType: "BANK_OFFER",
    discountType: "PERCENTAGE",
    discountValue: 7.5,
    maxDiscountLimit: 15000,
    minOrderValue: 5000,
    cardType: "ALL",
    emiTenureMonths: 6,
    emiAnnualRate: 14,
    emiIsNoCost: false,
    validFrom: "",
    validTill: "",
    isActive: true,
    priority: 80,
  };

  const [formData, setFormData] = useState(initialFormState);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all payment offers & banks
  const fetchOffersData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/payment-offers");
      const data = await res.json();
      if (data.success) {
        setOffers(data.data || []);
        setBanks(data.banks || []);
        if (data.banks?.length > 0 && !formData.bank) {
          setFormData((prev) => ({ ...prev, bank: data.banks[0]._id }));
        }
      }
    } catch (err) {
      console.error("Failed to load offers:", err);
      showToast("Error loading payment offers", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersData();
  }, []);

  // Filtered List
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (activeTab !== "ALL" && o.offerType !== activeTab) return false;
      if (selectedBankFilter !== "ALL" && o.bank?._id !== selectedBankFilter) return false;
      if (selectedStatusFilter === "ACTIVE" && !o.isActive) return false;
      if (selectedStatusFilter === "DISABLED" && o.isActive) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (o.name || o.title || "").toLowerCase().includes(q);
        const matchDesc = (o.description || "").toLowerCase().includes(q);
        const matchBank = (o.bank?.name || o.bank?.code || "").toLowerCase().includes(q);
        return matchName || matchDesc || matchBank;
      }
      return true;
    });
  }, [offers, activeTab, selectedBankFilter, selectedStatusFilter, searchQuery]);

  // Selected Bank Object for active form
  const currentSelectedBank = useMemo(() => {
    return banks.find((b) => b._id === formData.bank) || banks[0] || null;
  }, [banks, formData.bank]);

  // ==========================================
  // Inline Status Toggle
  // ==========================================
  const handleToggleStatus = async (offerId, currentStatus) => {
    // Optimistic UI update
    setOffers((prev) =>
      prev.map((o) => (o._id === offerId ? { ...o, isActive: !currentStatus } : o))
    );

    try {
      const res = await fetch("/api/payment-offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerId, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Offer ${!currentStatus ? "activated" : "disabled"}`);
      } else {
        // Rollback
        setOffers((prev) =>
          prev.map((o) => (o._id === offerId ? { ...o, isActive: currentStatus } : o))
        );
        showToast(data.error || "Failed to update status", "error");
      }
    } catch (err) {
      // Rollback
      setOffers((prev) =>
        prev.map((o) => (o._id === offerId ? { ...o, isActive: currentStatus } : o))
      );
      showToast("Network error updating status", "error");
    }
  };

  // ==========================================
  // Single Offer Delete
  // ==========================================
  const handleDeleteOffer = (offerId, offerTitle) => {
    setConfirmDialog({
      title: "Delete Payment Offer",
      message: `Are you sure you want to permanently delete "${offerTitle || "this offer"}"? This cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/payment-offers?id=${offerId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            setOffers((prev) => prev.filter((o) => o._id !== offerId));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(offerId);
              return next;
            });
            showToast("Offer deleted successfully");
          } else {
            showToast(data.error || "Failed to delete offer", "error");
          }
        } catch (err) {
          showToast("Network error deleting offer", "error");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // ==========================================
  // Open Modal for Create or Edit
  // ==========================================
  const handleOpenCreateModal = () => {
    setEditingOfferId(null);
    setLogoPreview(null);
    setFormData({
      ...initialFormState,
      bank: banks.length > 0 ? banks[0]._id : "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (offer) => {
    setEditingOfferId(offer._id);
    setLogoPreview(null);
    setFormData({
      bank: offer.bank?._id || offer.bankId || (banks[0]?._id || ""),
      title: offer.title || offer.name || "",
      description: offer.description || "",
      offerType: offer.offerType || "BANK_OFFER",
      discountType: offer.discountType || "PERCENTAGE",
      discountValue: offer.discountValue ?? 0,
      maxDiscountLimit: offer.maxDiscountLimit ?? 0,
      minOrderValue: offer.minOrderValue ?? 0,
      cardType: offer.cardType || "ALL",
      emiTenureMonths: offer.emiDetails?.tenureMonths || 6,
      emiAnnualRate: offer.emiDetails?.annualInterestRate ?? 14,
      emiIsNoCost: Boolean(offer.emiDetails?.isNoCost),
      validFrom: offer.validFrom ? new Date(offer.validFrom).toISOString().slice(0, 10) : "",
      validTill: offer.validTill ? new Date(offer.validTill).toISOString().slice(0, 10) : "",
      isActive: Boolean(offer.isActive),
      priority: offer.priority ?? 50,
    });
    setIsModalOpen(true);
  };

  // ==========================================
  // Form Submission (Create or Edit)
  // ==========================================
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.bank) {
      showToast("Please select a partner bank", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        bank: formData.bank,
        title: formData.title || formData.description,
        name: formData.title || formData.description,
        description: formData.description,
        offerType: formData.offerType,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue) || 0,
        maxDiscountLimit: Number(formData.maxDiscountLimit) || 0,
        minOrderValue: Number(formData.minOrderValue) || 0,
        cardType: formData.cardType,
        emiDetails: {
          tenureMonths: Number(formData.emiTenureMonths) || 0,
          annualInterestRate: formData.emiIsNoCost ? 0 : Number(formData.emiAnnualRate) || 0,
          isNoCost: Boolean(formData.emiIsNoCost),
        },
        validFrom: formData.validFrom ? new Date(formData.validFrom) : null,
        validTill: formData.validTill ? new Date(formData.validTill) : null,
        isActive: Boolean(formData.isActive),
        priority: Number(formData.priority) || 0,
      };

      const url = editingOfferId
        ? `/api/payment-offers/${editingOfferId}`
        : "/api/payment-offers";
      const method = editingOfferId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEditingOfferId(null);
        showToast(
          editingOfferId
            ? "Payment offer updated successfully!"
            : "Payment offer created successfully!"
        );
        fetchOffersData();
      } else {
        showToast(data.error || "Failed to save offer", "error");
      }
    } catch (err) {
      console.error("Save offer error:", err);
      showToast("Network error saving offer", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Bank Logo Upload Handler
  // ==========================================
  const handleLogoFileChange = async (file) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo file exceeds 2MB limit", "error");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    try {
      setIsUploadingLogo(true);
      const data = new FormData();
      data.append("file", file);
      if (currentSelectedBank) {
        data.append("bankId", currentSelectedBank._id);
        data.append("bankCode", currentSelectedBank.code);
      }

      const res = await fetch("/api/payment-offers/upload-logo", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.success) {
        showToast("Bank logo uploaded successfully!");
        // Update bank in state
        if (currentSelectedBank) {
          setBanks((prev) =>
            prev.map((b) =>
              b._id === currentSelectedBank._id
                ? { ...b, logoUrl: json.url, logo: json.url }
                : b
            )
          );
        }
      } else {
        showToast(json.error || "Failed to upload logo", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Network error uploading logo", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // ==========================================
  // Bulk Actions
  // ==========================================
  const isAllFilteredSelected =
    filteredOffers.length > 0 &&
    filteredOffers.every((o) => selectedIds.has(o._id));

  const isIndeterminate =
    filteredOffers.some((o) => selectedIds.has(o._id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredOffers.forEach((o) => next.delete(o._id));
      } else {
        filteredOffers.forEach((o) => next.add(o._id));
      }
      return next;
    });
  };

  const handleToggleRowSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (isActive) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setIsBulkProcessing(true);
      const res = await fetch("/api/payment-offers/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) =>
          prev.map((o) => (ids.includes(o._id) ? { ...o, isActive } : o))
        );
        showToast(`Successfully ${isActive ? "activated" : "disabled"} ${ids.length} offers`);
      } else {
        showToast(data.error || "Failed to bulk update", "error");
      }
    } catch (err) {
      showToast("Network error during bulk update", "error");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirmDialog({
      title: "Bulk Delete Offers",
      message: `Are you sure you want to permanently delete all ${ids.length} selected offers? This operation cannot be reversed.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          setIsBulkProcessing(true);
          const res = await fetch("/api/payment-offers/bulk", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          const data = await res.json();
          if (data.success) {
            setOffers((prev) => prev.filter((o) => !ids.includes(o._id)));
            setSelectedIds(new Set());
            showToast(`Deleted ${data.deletedCount} offers`);
          } else {
            showToast(data.error || "Failed to delete offers", "error");
          }
        } catch (err) {
          showToast("Network error during bulk delete", "error");
        } finally {
          setIsBulkProcessing(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // ==========================================
  // CSV Template Download
  // ==========================================
  const handleDownloadTemplate = () => {
    const headers = [
      "bankCode",
      "offerType",
      "title",
      "description",
      "discountType",
      "discountValue",
      "maxLimit",
      "minOrder",
      "cardType",
      "tenureMonths",
      "interestRate",
      "isNoCost",
      "priority",
      "isActive",
    ];

    const sampleRows = [
      [
        "HDFC",
        "BANK_OFFER",
        "HDFC Cards 7.5% Instant Discount",
        "7.5% Instant Discount up to Rs. 15,000 on HDFC Cards",
        "PERCENTAGE",
        "7.5",
        "15000",
        "5000",
        "ALL",
        "0",
        "0",
        "false",
        "80",
        "true",
      ],
      [
        "SBI",
        "EMI_OFFER",
        "SBI No-Cost EMI 6 Months",
        "0% Interest No-Cost EMI for 6 Months",
        "PERCENTAGE",
        "0",
        "0",
        "5000",
        "CREDIT",
        "6",
        "0",
        "true",
        "85",
        "true",
      ],
      [
        "AXIS",
        "EMI_OFFER",
        "Axis Standard EMI 12 Months",
        "Low interest reducing rate EMI for 12 months",
        "PERCENTAGE",
        "0",
        "0",
        "5000",
        "ALL",
        "12",
        "14",
        "false",
        "60",
        "true",
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payment_offers_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Template CSV downloaded");
  };

  // ==========================================
  // Bulk CSV Import
  // ==========================================
  const handleImportCSVFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportSummary(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/payment-offers/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImportSummary({
          success: true,
          insertedCount: data.insertedCount,
          totalRows: data.totalRows,
          errors: data.errors || [],
        });
        showToast(`Imported ${data.insertedCount} payment offers!`);
        fetchOffersData();
      } else {
        setImportSummary({
          success: false,
          error: data.error,
          errors: data.errors || [],
        });
        showToast(data.error || "Failed to import CSV", "error");
      }
    } catch (err) {
      console.error("CSV import error:", err);
      showToast("Error processing CSV upload", "error");
    } finally {
      setIsImporting(false);
      e.target.value = ""; // reset file input
    }
  };

  return (
    <AdminPageShell>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-3 ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : toast.type === "info"
              ? "bg-blue-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all cursor-pointer shadow-sm ${
                  confirmDialog.isDestructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#d81b60] hover:bg-[#c2185b]"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Payment Offers & EMI Master
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-[#d81b60]">
              {offers.length} Configured
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Production control center for Bank Instant Discounts, No-Cost EMI, and partner schemes displayed on PDPs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download CSV Template */}
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Download CSV Template with sample records"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Template
          </button>

          {/* Bulk Import CSV */}
          <button
            onClick={() => {
              setImportSummary(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Bulk import payment offers from CSV"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Bulk Import (CSV)
          </button>

          {/* Add Offer Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d81b60] hover:bg-[#c2185b] text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <span className="text-sm leading-none">+</span> Add Payment Offer
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 my-4">
        {/* Type Tabs */}
        <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab("BANK_OFFER")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "BANK_OFFER"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Bank Instant Discounts ({offers.filter((o) => o.offerType === "BANK_OFFER").length})
          </button>
          <button
            onClick={() => setActiveTab("EMI_OFFER")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "EMI_OFFER"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            EMI Plans ({offers.filter((o) => o.offerType === "EMI_OFFER").length})
          </button>
        </div>

        {/* Bank & Status dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bank Filter */}
          <select
            value={selectedBankFilter}
            onChange={(e) => setSelectedBankFilter(e.target.value)}
            className="text-xs p-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">All Banks ({banks.length})</option>
            {banks.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs p-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search bank or offer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-56 pl-3 pr-7 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200">
            <tr>
              {/* Select All Checkbox */}
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-[#d81b60] rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Offer Title / Terms</th>
              <th className="px-4 py-3">Discount / EMI Details</th>
              <th className="px-4 py-3">Min Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4 text-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mx-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-200 rounded-full" />
                      <div className="space-y-1">
                        <div className="w-20 h-3 bg-gray-200 rounded" />
                        <div className="w-10 h-2 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-16 h-5 bg-gray-200 rounded-full" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-32 h-3 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-24 h-3 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-12 h-3 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-12 h-5 bg-gray-200 rounded-md" />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="w-16 h-4 bg-gray-200 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : filteredOffers.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <BankBuildingIcon className="w-8 h-8 text-gray-300" />
                    <p className="font-semibold text-gray-500">No payment offers match your criteria.</p>
                    <p className="text-[11px] text-gray-400">
                      Try clearing your search query or click &quot;+ Add Payment Offer&quot; above.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOffers.map((offer) => {
                const bank = offer.bank || {};
                const isEmi = offer.offerType === "EMI_OFFER";
                const isSelected = selectedIds.has(offer._id);

                return (
                  <tr
                    key={offer._id}
                    className={`transition-colors ${
                      isSelected ? "bg-pink-50/40" : "hover:bg-gray-50/80"
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRowSelect(offer._id)}
                        className="w-4 h-4 text-[#d81b60] rounded border-gray-300 cursor-pointer"
                      />
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <BankLogoBadge bank={bank} size={28} />
                        <div>
                          <div className="font-bold text-gray-900">
                            {bank.name || bank.code || "Partner Bank"}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase font-mono">
                            {bank.code || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEmi ? (
                        offer.emiDetails?.isNoCost ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            No-Cost EMI
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Standard EMI
                          </span>
                        )
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Bank Discount
                        </span>
                      )}
                    </td>

                    {/* Title / Description */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-bold text-gray-900 line-clamp-1">
                        {offer.title || offer.name}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        {offer.description || "-"}
                      </div>
                      {offer.cardType && offer.cardType !== "ALL" && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-600">
                          {offer.cardType} Only
                        </span>
                      )}
                    </td>

                    {/* Discount or EMI Details */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEmi ? (
                        <div>
                          <div className="font-bold text-gray-900">
                            {offer.emiDetails?.tenureMonths || 6} Months Tenure
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {offer.emiDetails?.isNoCost
                              ? "0% Interest (Subsidized)"
                              : `${offer.emiDetails?.annualInterestRate ?? 14}% p.a. Reducing`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-[#059669]">
                            {offer.discountType === "PERCENTAGE"
                              ? `${offer.discountValue}% Instant Discount`
                              : `Flat ₹${Number(offer.discountValue).toLocaleString("en-IN")}`}
                          </div>
                          {offer.maxDiscountLimit > 0 && (
                            <div className="text-[10px] text-gray-500">
                              Cap: ₹{Number(offer.maxDiscountLimit).toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Min Order Value */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                      ₹{Number(offer.minOrderValue || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Status Toggle (Interactive with Optimistic UI) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(offer._id, offer.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          offer.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title="Click to toggle offer active status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            offer.isActive ? "bg-green-600" : "bg-gray-400"
                          }`}
                        />
                        {offer.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(offer)}
                          className="px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit offer details"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer._id, offer.title)}
                          className="px-2 py-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete offer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d81b60] animate-pulse" />
            <span className="text-xs font-bold text-gray-200">
              {selectedIds.size} {selectedIds.size === 1 ? "offer" : "offers"} selected
            </span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          {/* Bulk Activate */}
          <button
            onClick={() => handleBulkStatus(true)}
            disabled={isBulkProcessing}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Activate All
          </button>

          {/* Bulk Deactivate */}
          <button
            onClick={() => handleBulkStatus(false)}
            disabled={isBulkProcessing}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Disable All
          </button>

          {/* Bulk Delete */}
          <button
            onClick={handleBulkDelete}
            disabled={isBulkProcessing}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Delete Selected
          </button>

          {/* Clear Selection */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white text-xs underline cursor-pointer ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* ==========================================
          CREATE / EDIT PAYMENT OFFER MODAL
         ========================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  {editingOfferId ? "Edit Payment Offer" : "Add New Payment Offer"}
                </h2>
                <p className="text-[11px] text-gray-500">
                  {editingOfferId
                    ? "Update discount values, EMI tenures, or partner terms."
                    : "Configure a partner bank discount or installment scheme."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4">
              {/* Partner Bank Selection & Logo Uploader */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Partner Bank *
                  </label>
                  <span className="text-[10px] text-gray-400">
                    Logo updates apply globally
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Bank Logo Preview Slot */}
                  <div className="shrink-0">
                    {logoPreview ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-300 shadow-2xs flex items-center justify-center bg-white">
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <BankLogoBadge bank={currentSelectedBank} size={40} />
                    )}
                  </div>

                  {/* Bank Select */}
                  <div className="flex-1">
                    <select
                      required
                      value={formData.bank}
                      onChange={(e) => {
                        setFormData({ ...formData, bank: e.target.value });
                        setLogoPreview(null);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:border-blue-500 font-medium"
                    >
                      {banks.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Drag & Drop Logo Upload Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleLogoFileChange(file);
                  }}
                  className="mt-2 border border-dashed border-gray-300 hover:border-[#d81b60] rounded-lg p-2.5 text-center bg-white transition-colors cursor-pointer"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept=".svg,.png,.webp,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileChange(file);
                    }}
                  />
                  <div className="text-[11px] text-gray-600">
                    {isUploadingLogo ? (
                      <span className="font-bold text-blue-600">Uploading new logo...</span>
                    ) : (
                      <>
                        <span className="font-bold text-[#d81b60]">Click or drag</span> to upload new logo (.svg, .png, max 2MB)
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Offer Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Offer Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, offerType: "BANK_OFFER" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      formData.offerType === "BANK_OFFER"
                        ? "border-[#d81b60] bg-pink-50 text-[#d81b60]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    💳 Bank Instant Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, offerType: "EMI_OFFER" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      formData.offerType === "EMI_OFFER"
                        ? "border-[#d81b60] bg-pink-50 text-[#d81b60]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    📅 EMI Plan
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Offer Title / PDP Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Cards 7.5% Instant Discount"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Marketing Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7.5% Instant Discount up to ₹15,000 on HDFC Credit & Debit Cards"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:border-blue-500"
                />
              </div>

              {/* Conditional: Bank Offer Fields */}
              {formData.offerType === "BANK_OFFER" && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Discount Type
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) =>
                          setFormData({ ...formData, discountType: e.target.value })
                        }
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Flat Rupee (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Discount Value *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({ ...formData, discountValue: e.target.value })
                        }
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg"
                        placeholder="7.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Max Discount Limit (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.maxDiscountLimit}
                        onChange={(e) =>
                          setFormData({ ...formData, maxDiscountLimit: e.target.value })
                        }
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg"
                        placeholder="15000 (0 for unlimited)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Card Type
                      </label>
                      <select
                        value={formData.cardType}
                        onChange={(e) =>
                          setFormData({ ...formData, cardType: e.target.value })
                        }
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg"
                      >
                        <option value="ALL">All (Credit / Debit / NetBanking)</option>
                        <option value="CREDIT">Credit Card Only</option>
                        <option value="DEBIT">Debit Card Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: EMI Offer Fields */}
              {formData.offerType === "EMI_OFFER" && (
                <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tenure (Months) *
                      </label>
                      <select
                        value={formData.emiTenureMonths}
                        onChange={(e) =>
                          setFormData({ ...formData, emiTenureMonths: e.target.value })
                        }
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg"
                      >
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="9">9 Months</option>
                        <option value="12">12 Months</option>
                        <option value="18">18 Months</option>
                        <option value="24">24 Months</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Annual Interest Rate (% p.a.)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.emiAnnualRate}
                        disabled={formData.emiIsNoCost}
                        onChange={(e) =>
                          setFormData({ ...formData, emiAnnualRate: e.target.value })
                        }
                        className={`w-full text-xs p-2 bg-white border border-gray-300 rounded-lg ${
                          formData.emiIsNoCost ? "opacity-50" : ""
                        }`}
                        placeholder="14"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emiIsNoCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emiIsNoCost: e.target.checked,
                            emiAnnualRate: e.target.checked ? 0 : 14,
                          })
                        }
                        className="w-4 h-4 text-[#d81b60] rounded border-gray-300"
                      />
                      <span className="text-xs font-bold text-gray-800">
                        Is No-Cost EMI (0% interest subsidized by merchant)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Min Order Value & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderValue: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Priority (0 - 100)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                    placeholder="80"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Valid From (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Valid Till (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.validTill}
                    onChange={(e) =>
                      setFormData({ ...formData, validTill: e.target.value })
                    }
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Active immediately
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#d81b60] hover:bg-[#c2185b] rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingOfferId
                    ? "Save Changes"
                    : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          BULK IMPORT CSV MODAL
         ========================================== */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  Bulk Import Payment Offers
                </h3>
                <p className="text-xs text-gray-500">
                  Upload a CSV file containing multiple bank discounts or EMI plans.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 hover:border-[#d81b60] rounded-xl p-8 text-center bg-gray-50 hover:bg-pink-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSVFile}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-10 h-10 text-gray-400 mx-auto"
                  strokeWidth="1.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div className="text-xs font-bold text-gray-800">
                  {isImporting ? "Processing CSV..." : "Select or drag .CSV file here"}
                </div>
                <div className="text-[11px] text-gray-500">
                  Must follow standard template headers (bankCode, offerType, etc.)
                </div>
              </div>
            </div>

            {/* Import Summary Results */}
            {importSummary && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  importSummary.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="font-bold">
                  {importSummary.success
                    ? `✓ Successfully imported ${importSummary.insertedCount} of ${importSummary.totalRows} rows`
                    : `⚠️ Import Failed: ${importSummary.error || "Validation errors occurred"}`}
                </div>

                {importSummary.errors?.length > 0 && (
                  <div className="mt-2 text-[11px] max-h-32 overflow-y-auto space-y-1">
                    <span className="font-semibold block">Row Notes:</span>
                    {importSummary.errors.map((err, idx) => (
                      <div key={idx} className="text-gray-700 bg-white/60 p-1 rounded">
                        • {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={handleDownloadTemplate}
                className="text-xs font-bold text-[#d81b60] hover:underline cursor-pointer"
              >
                Download Sample CSV
              </button>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
