"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useHeaderdetails } from "@/context/HeaderContext";
import { readStoredSession } from "@/lib/clientAuthSession";
import { FaRegFilePdf } from "react-icons/fa6";
import DealsPdfModal from "./DealsPdfModal";

/**
 * Validates if the given token string is strictly valid:
 * Must be non-empty string, not "undefined", not "null", and non-empty after trimming.
 */
function isStrictlyValidToken(token) {
  return Boolean(
    token &&
      typeof token === "string" &&
      token !== "undefined" &&
      token !== "null" &&
      token.trim() !== ""
  );
}

/**
 * Validates if the user object or session has a valid identifier (userId or phone).
 */
function hasValidUserIdentity(user, session) {
  const uid =
    user?.userId ||
    user?._id ||
    user?.id ||
    session?.userId;

  const phone =
    user?.mobile ||
    user?.phone ||
    user?.mobileNumber ||
    user?.phoneNumber;

  const hasValidUid = Boolean(
    uid &&
      uid !== "undefined" &&
      uid !== "null" &&
      String(uid).trim() !== ""
  );

  const hasValidPhone = Boolean(
    phone &&
      phone !== "undefined" &&
      phone !== "null" &&
      String(phone).trim() !== ""
  );

  return Boolean(hasValidUid || hasValidPhone);
}

/**
 * DealsPdfButton
 * Header PDF icon button matching Reference Image 1 & 2.
 * - Visible ONLY when:
 *   1. User is authenticated (logged in with valid auth session/token & valid user)
 *   2. User is on /deals-offer (or /category, /search)
 * - Positioned between Location Pin icon and User Profile icon.
 * - Clean white circle with soft drop shadow (no red border), red icon inside.
 * - Clicking it opens the DealsPdfModal with backdrop.
 * - Guest / Logged-out users: strictly return null (DOM-la complete-ah hide aagum).
 */
export default function DealsPdfButton({ className = "", forceVisible = false }) {
  const pathname = usePathname();
  const { isLoggedIn, userData } = useHeaderdetails();

  // Strict Condition 1: Initial state MUST default to false. Never show by default.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Synchronize authentication status from HeaderContext + client session + localStorage + events
  const checkAuth = useCallback(
    (e) => {
      if (typeof window === "undefined") {
        setIsAuthenticated(false);
        return;
      }

      // Explicit auth-changed event carrying false status
      if (e?.detail && e.detail.isLoggedIn === false) {
        setIsAuthenticated(false);
        return;
      }

      // 1. Stored token strictly valid check
      let token = null;
      try {
        token = localStorage.getItem("token");
      } catch (err) {
        token = null;
      }

      const validToken = isStrictlyValidToken(token);
      if (!validToken) {
        setIsAuthenticated(false);
        return;
      }

      // 2. Stored session / user object validation (must have valid userId or phone)
      const session = readStoredSession();
      const validUser = hasValidUserIdentity(userData, session);
      if (!validUser) {
        setIsAuthenticated(false);
        return;
      }

      // 3. User must have confirmed login in HeaderContext or valid session
      const hasAuth = Boolean(validToken && validUser && (isLoggedIn || userData));
      setIsAuthenticated(hasAuth);
    },
    [isLoggedIn, userData]
  );

  useEffect(() => {
    setMounted(true);
    checkAuth();

    // Listen for storage / login / logout events across tabs and components
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
    };
  }, [checkAuth]);

  // Listen for openDealsPdfModal custom window event
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpen = () => setIsModalOpen(true);
    window.addEventListener("openDealsPdfModal", handleOpen);
    return () => window.removeEventListener("openDealsPdfModal", handleOpen);
  }, []);

  // SSR / before mount guard: return null
  if (!mounted) return null;

  const isSupportedPage =
    pathname?.startsWith("/deals-offer") ||
    pathname?.startsWith("/category") ||
    pathname?.startsWith("/search");

  // Strict Rule: ONLY show when authenticated AND on supported page (or forceVisible)
  // Guest / Logged-out user-ku intha PDF icon DOM-la complete-ah hide (null) aagi irukanum.
  if (!forceVisible && (!isAuthenticated || !isSupportedPage)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        id="pdf-export-url"
        onClick={() => setIsModalOpen(true)}
        className={`deals-pdf-btn relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg border border-gray-100 text-[#d72828] hover:bg-red-50/40 active:scale-95 transition-all duration-200 cursor-pointer group shrink-0 ${className}`}
        title="Deals Offer PDF Export"
        aria-label="Deals Offer PDF Export"
      >
        <FaRegFilePdf className="w-[18px] h-[18px] text-[#d72828] group-hover:scale-105 transition-transform flex-shrink-0" />
      </button>

      {/* Popup Modal */}
      <DealsPdfModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        exportType={
          pathname?.startsWith("/category")
            ? "category"
            : pathname?.startsWith("/search")
            ? "search"
            : "deals-offer"
        }
      />
    </>
  );
}
