"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { FiMenu, FiMapPin, FiUser } from "react-icons/fi";
import {
  HiOutlineBuildingStorefront,
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlinePhone,
} from "react-icons/hi2";
import HeaderMenuSidebar from "@/components/HeaderMenuSidebar";
import HeaderOfferTimer from "@/components/HeaderOfferTimer";
import DealsPdfButton from "@/components/deals-offer/DealsPdfButton";

/**
 * Design B: "Classic Sathya" 2-row header layout.
 * All colors are driven by CSS variables (--hdr-*) set on the <header> root.
 */
export default function HeaderClassic({
  settings,
  previewViewport = null,
  categories,
  menuItems,
  renderDesktopSearch,
  effectiveOfferTimer,
  // Region / location
  openRegionModal,
  city,
  pincode,
  selectedRegion,
  // Auth / account
  isAuthenticated,
  isLoggedIn,
  userData,
  userDisplayName,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  accountMenuRef,
  handleMenuMouseEnter,
  handleMenuMouseLeave,
  renderAccountDropdown,
  // Counts
  wishlistCount,
  cartCount,
  // Menu & Megamenu
  menuButtonEnabled,
  showMenu,
  setShowMenu,
  menuHoverLeaveTimer,
  cancelHide,
  setHoveredCategory,
  setActiveSubCategory,
  resolveCategoryNavHref,
  showDealsButton,
  toggleMobileMenu,
  hoveredCategory,
  slideRefs,
  handleMouseEnter,
  startHide,
  hideTimeout,
  handleCategoryClick,
}) {
  const hoverOpenedAtRef = useRef(0);
  const { logo, topbar, main, menu } = settings;
  const show = main?.show || {};
  const visibleItems = (menuItems || []).filter((item) => item.visible !== false);

  return (
    <>
      {/* Row 1: Main Header Row */}
      <div
        className="w-full relative z-40"
        style={{ background: "var(--hdr-main-bg)" }}
      >
        <div className="hidden sm:flex site-container hdr-inner hdr-main-row gap-3 lg:gap-5">
          {/* Tablet/Mobile Nav Menu Toggle (< 768px) */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`${previewViewport === "tablet" ? "flex" : "md:hidden flex"} items-center justify-center p-1.5 -ml-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shrink-0`}
            aria-label="Open menu"
          >
            <FiMenu size={24} />
          </button>

          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link href="/" aria-label="SATHYA Store Homepage" className="flex items-center shrink-0">
              <img
                src={logo?.url || "/uploads/sathya-header-logo.webp"}
                alt="SATHYA Store Logo"
                style={{ height: `${logo?.height || 48}px` }}
                className="w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Search Bar */}
          {renderDesktopSearch()}

          {/* Offer Countdown Widget (when active) */}
          {effectiveOfferTimer && <HeaderOfferTimer timer={effectiveOfferTimer} />}

          {/* Right Icons Group */}
          <div className="flex items-center gap-4 lg:gap-[28px] shrink-0 ml-auto">
            {/* Deals Pill */}
            {show.deals !== false && showDealsButton && (
              <Link
                href={topbar?.deals_link || "/deals-offer"}
                aria-label="View Deals & Special Offers"
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-[#000000] font-bold text-[13px] leading-tight transition-all duration-200 shadow-xs hover:opacity-95 active:scale-95 shrink-0"
                style={{
                  background: "linear-gradient(135deg, #00b4db 0%, #f44336 55%, #ffc107 100%)",
                }}
              >
                {topbar?.deals_label || "Deals"}
              </Link>
            )}

            {/* Pincode / Region */}
            {show.deliver_to !== false && (
              <button
                type="button"
                onClick={openRegionModal}
                aria-label={`Deliver to: ${city || "Chennai"}, ${pincode || "600001"}`}
                className="hidden lg:flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--hdr-icon-color)" }}
                title={`Deliver to: ${city || "Chennai"}, ${pincode || "600001"} (${selectedRegion?.name || "Tamil Nadu"})`}
                suppressHydrationWarning
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <FiMapPin size={19} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap" suppressHydrationWarning>
                  {pincode ? pincode : selectedRegion?.code || "Region"} ▾
                </span>
              </button>
            )}

            {/* Contact */}
            {show.contact !== false && (
              <Link
                href="/contact"
                aria-label="Contact Us"
                className="hidden lg:flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80"
                style={{ color: "var(--hdr-icon-color)" }}
                title="Contact Us"
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlinePhone size={19} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] font-medium mt-0.5 leading-none">Contact</span>
              </Link>
            )}

            {/* Store */}
            {show.store !== false && (
              <a
                href="https://sathya.adtarbo.com/stores"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Store Locations"
                className="hidden md:flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80"
                style={{ color: "var(--hdr-icon-color)" }}
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineBuildingStorefront size={19} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] font-medium mt-0.5 leading-none">Store</span>
              </a>
            )}

            {/* Wishlist */}
            {show.wishlist !== false && (
              <Link
                href="/wishlist"
                aria-label={`Wishlist (${wishlistCount || 0} items)`}
                className="flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80"
                style={{ color: "var(--hdr-icon-color)" }}
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineHeart size={19} strokeWidth={1.75} />
                  <span
                    className="absolute -top-1 -right-2 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none"
                    style={{ background: "var(--hdr-badge-bg)" }}
                    suppressHydrationWarning
                  >
                    {wishlistCount}
                  </span>
                </div>
                <span className="text-[10px] font-medium mt-0.5 leading-none">Wishlist</span>
              </Link>
            )}

            {/* Cart */}
            {show.cart !== false && (
              <Link
                href="/cart"
                aria-label={`Cart (${cartCount || 0} items)`}
                className="flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80"
                style={{ color: "var(--hdr-icon-color)" }}
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineShoppingBag size={19} strokeWidth={1.75} />
                  <span
                    className="absolute -top-1 -right-2 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none"
                    style={{ background: "var(--hdr-badge-bg)" }}
                    suppressHydrationWarning
                  >
                    {cartCount}
                  </span>
                </div>
                <span className="text-[10px] font-medium mt-0.5 leading-none">Cart</span>
              </Link>
            )}

            {/* Deals Offer PDF Button (Authenticated Users Only) */}
            {Boolean(isLoggedIn && userData) && <DealsPdfButton />}

            {/* User Account / Login */}
            {show.user !== false && (
              <div
                className="relative hidden sm:block"
                ref={accountMenuRef}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80 focus:outline-none cursor-pointer"
                  style={{ color: "var(--hdr-icon-color)" }}
                  aria-label={isAuthenticated ? "Account Menu" : "Login"}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="relative flex items-center justify-center w-7 h-7">
                    <FiUser size={19} strokeWidth={1.75} />
                  </div>
                  <span className="text-[10px] font-medium mt-0.5 max-w-[62px] truncate leading-none" suppressHydrationWarning>
                    {isAuthenticated ? userDisplayName : "Login"}
                  </span>
                </button>
                {isAccountMenuOpen && renderAccountDropdown()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional Accent Line (default yellow, 3px) */}
      {menu?.accent_line?.enabled !== false && previewViewport !== "tablet" && (
        <div
          className="hidden md:block w-full"
          style={{
            height: "var(--hdr-accent-height)",
            background: "var(--hdr-accent-color)",
          }}
        />
      )}

      {/* Row 2: Classic Menu Bar ("Menu" plain text on left aligned with logo, links centered) */}
      {previewViewport !== "tablet" && (
        <div
          className="hidden md:flex relative w-full items-center select-none z-30 hdr-menu-bar"
          style={{ background: "var(--hdr-menu-bg)" }}
        >
          <div className="site-container hdr-inner hdr-menu-row-classic relative">
            {(menuButtonEnabled !== false) && (
              <div
                className="relative flex-shrink-0 h-full"
                data-sathya-menu-toggle
                onMouseEnter={() => {
                  if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    return;
                  }
                  if (menuHoverLeaveTimer.current) {
                    clearTimeout(menuHoverLeaveTimer.current);
                    menuHoverLeaveTimer.current = null;
                  }
                  hoverOpenedAtRef.current = Date.now();
                  setShowMenu(true);
                  cancelHide();
                  setHoveredCategory(null);
                  setActiveSubCategory(null);
                }}
                onMouseLeave={() => {
                  if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    return;
                  }
                  if (menuHoverLeaveTimer.current) clearTimeout(menuHoverLeaveTimer.current);
                  menuHoverLeaveTimer.current = setTimeout(() => {
                    setShowMenu(false);
                    menuHoverLeaveTimer.current = null;
                  }, 200);
                }}
              >
                <button
                  type="button"
                  className="h-full pl-0 pr-4 flex items-center gap-2 font-bold text-sm whitespace-nowrap bg-transparent transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ color: "var(--hdr-menu-text)" }}
                  aria-label="Open menu"
                  aria-expanded={showMenu}
                  onClick={() => {
                    if (showMenu && Date.now() - hoverOpenedAtRef.current < 400) {
                      setShowMenu(true);
                    } else {
                      setShowMenu((prev) => !prev);
                    }
                    cancelHide();
                    setHoveredCategory(null);
                    setActiveSubCategory(null);
                  }}
                >
                  <FiMenu size={18} strokeWidth={2.5} className="shrink-0" />
                  <span className="whitespace-nowrap">Menu</span>
                </button>
                <HeaderMenuSidebar
                  open={showMenu}
                  onClose={() => setShowMenu(false)}
                  categories={categories}
                  resolveCategoryHref={resolveCategoryNavHref}
                  showDealsButton={showDealsButton}
                />
              </div>
            )}

            <div className="relative min-w-0 flex-1 pl-6 pr-4 overflow-hidden flex items-center justify-center h-full">
              <div className="flex items-center justify-center gap-4 xl:gap-[28px] whitespace-nowrap overflow-x-auto scrollbar-hide">
                {visibleItems.map((entry, idx) => {
                  if (entry.kind === "category" && entry.category) {
                    const { category } = entry;
                    const isHovered = hoveredCategory?._id === category._id;
                    return (
                      <div
                        key={entry.key || category._id || idx}
                        ref={(el) => {
                          if (slideRefs?.current) slideRefs.current[category._id] = el;
                        }}
                        onMouseEnter={() => handleMouseEnter(category._id, category)}
                        onMouseLeave={() => startHide(120)}
                        className="flex items-center shrink-0"
                      >
                        <Link
                          href={resolveCategoryNavHref([category.category_slug], category._id, 0)}
                          onClick={(e) => {
                            e.preventDefault();
                            if (hideTimeout.current) {
                              clearTimeout(hideTimeout.current);
                              hideTimeout.current = null;
                            }
                            setHoveredCategory(null);
                            setActiveSubCategory(null);
                            handleCategoryClick(
                              category.category_slug,
                              category.category_name,
                              category._id
                            );
                          }}
                          className={`hdr-menu-link inline-flex items-center text-sm font-bold transition-colors duration-150 whitespace-nowrap ${isHovered ? "hdr-menu-link-active" : ""
                            }`}
                        >
                          {entry.label}
                        </Link>
                      </div>
                    );
                  }

                  const href = entry.link || entry.href || "/";
                  const isExternal = /^https?:\/\//i.test(href);
                  return (
                    <div
                      key={entry.key || `${entry.label}-${idx}`}
                      onMouseEnter={() => {
                        cancelHide();
                        setHoveredCategory(null);
                      }}
                      className="flex items-center shrink-0"
                    >
                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hdr-menu-link inline-flex items-center text-sm font-bold transition-colors duration-150 whitespace-nowrap"
                        >
                          {entry.label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="hdr-menu-link inline-flex items-center text-sm font-bold transition-colors duration-150 whitespace-nowrap"
                        >
                          {entry.label}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
