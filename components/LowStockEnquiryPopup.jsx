"use client";

import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const HELPDESK_PHONE_DISPLAY = "88805 98985";

/** Exist #displayStockModal vs #displayStockModal_cusorder */
export const ENQUIRY_VARIANT_NORMAL = "normal";
export const ENQUIRY_VARIANT_CUSORDER = "cusorder";

export const LEAD_TITLE_NORMAL = "Product Page Enquiry";
export const LEAD_TITLE_CUSORDER = "Product Page Enquiry - CUSorder";

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function isCusOrderMovement(movement) {
  return /cus[\s-]?order/i.test(String(movement || "").trim());
}

/**
 * Least / display-store stock enquiry modal.
 * - normal → Exist #displayStockModal, lead "Product Page Enquiry"
 * - cusorder → Exist #displayStockModal_cusorder, lead "Product Page Enquiry - CUSorder"
 */
export default function LowStockEnquiryPopup({
  onClose,
  productName = "",
  productSlug = "",
  productCategory = "",
  stockQuantity = 0,
  variant = ENQUIRY_VARIANT_NORMAL,
}) {
  const isCusOrder = variant === ENQUIRY_VARIANT_CUSORDER;
  const leadTitle = isCusOrder ? LEAD_TITLE_CUSORDER : LEAD_TITLE_NORMAL;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const clearFields = () => {
      if (cancelled) return;
      setName("");
      setPhone("");
      setEmail("");
      setLoadingProfile(false);
    };

    const fillFromProfile = async () => {
      setLoadingProfile(true);
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        clearFields();
        return;
      }

      try {
        const res = await fetch("/api/user/enquiry-profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (res.ok && data?.success && data?.loggedIn) {
          setName(String(data.name || "").trim());
          setPhone(String(data.phone || "").trim());
          setEmail(String(data.email || "").trim());
          setLoadingProfile(false);
          return;
        }

        clearFields();
      } catch {
        clearFields();
      }
    };

    fillFromProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = String(name || "").trim();
    const trimmedEmail = String(email || "").trim();
    const trimmedMobile = String(phone || "").replace(/\D/g, "");

    if (!trimmedName || !/^[a-zA-Z0-9\s.,/]*$/.test(trimmedName)) {
      toast.error("Please enter a valid name");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    const productUrl =
      typeof window !== "undefined"
        ? window.location.href
        : productSlug
          ? `/product/${productSlug}`
          : "";

    let utm_source = "";
    let utm_campaign = "";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      utm_source = params.get("utm_source") || "";
      utm_campaign = params.get("utm_campaign") || "";
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/connect-store-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          mobile: trimmedMobile,
          lead_title: leadTitle,
          product: productName || "",
          product_category: productCategory || "",
          product_url: productUrl,
          referrel_url: productUrl,
          utm_source,
          utm_campaign,
          cookie_id: getCookie("emaduuid") || "",
          lead_type: "Enquiry",
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        toast.success(
          data.message ||
            "Thank you!. Your message has been sent. We will Contact you shortly."
        );
        if (typeof onClose === "function") onClose();
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.reload();
        }, 1500);
        return;
      }

      toast.error(data?.message || "Failed to submit enquiry. Please try again.");
    } catch (err) {
      console.error("Low stock enquiry submit error:", err);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const introCopy = isCusOrder
    ? "This Cus-Order product has least stock. Kindly contact our helpdesk at"
    : "This product has least stock. Kindly contact our helpdesk at";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-stock-enquiry-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function" && !submitting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded shadow-xl border border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          disabled={submitting}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1.5 cursor-pointer disabled:opacity-50"
        >
          <FaTimes size={14} />
        </button>

        <p className="text-sm sm:text-[15px] text-gray-700 leading-relaxed pr-6">
          {introCopy}{" "}
          <a
            href={`tel:${HELPDESK_PHONE_DISPLAY.replace(/\s/g, "")}`}
            className="font-medium text-gray-900 hover:underline"
          >
            {HELPDESK_PHONE_DISPLAY}
          </a>{" "}
          to know stock availability before placing order.
        </p>

        <h3
          id="low-stock-enquiry-title"
          className="mt-6 mb-4 text-base sm:text-lg font-bold tracking-wide text-gray-900 uppercase"
        >
          Send an Enquiry
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="name"
            disabled={loadingProfile || submitting}
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white disabled:bg-gray-50"
          />
          <input
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
            autoComplete="tel"
            disabled={loadingProfile || submitting}
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white disabled:bg-gray-50"
          />
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            disabled={loadingProfile || submitting}
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white disabled:bg-gray-50"
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loadingProfile || submitting}
              className="bg-[#d72828] hover:bg-[#b91f1f] text-white text-sm font-bold uppercase tracking-wide px-8 py-2.5 rounded cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>

        <input type="hidden" name="productName" value={productName || ""} readOnly />
        <input type="hidden" name="productSlug" value={productSlug || ""} readOnly />
        <input type="hidden" name="stockQuantity" value={stockQuantity || 0} readOnly />
        <input type="hidden" name="leadTitle" value={leadTitle} readOnly />
      </div>
    </div>
  );
}
