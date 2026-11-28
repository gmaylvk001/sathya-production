"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { FiMenu, FiChevronDown, FiMapPin, FiUser } from "react-icons/fi";
import {
  HiOutlineBuildingStorefront,
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlinePhone,
} from "react-icons/hi2";
import HeaderMenuSidebar from "@/components/HeaderMenuSidebar";
import HeaderOfferTimer from "@/components/HeaderOfferTimer";

/**
 * Design A: "Modern Retail" 3-row header layout.
 * All colors are driven by CSS variables (--hdr-*) set on the <header> root.
 */
export default function HeaderModern({
  settings,
  previewViewport = null,
  categories,
  menuItems,
  renderDesktopSearch,
  effectiveOfferTimer,
  // Region / location
  openRegionModal,
  city,
  district,
  pincode,
  selectedRegion,
  // Auth / account
  isAuthenticated,
  userData,
  userDisplayName,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  accountMenuRef,
  handleMenuMouseEnter,
  handleMenuMouseLeave,
  renderAccountDropdown,
  setShowAuthModal,
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
      {/* Row 1: Top Announcement Bar */}
      {topbar?.enabled !== false && (
        <div
          className="hidden sm:block w-full select-none hdr-topbar"
          style={{
            background: "var(--hdr-topbar-bg)",
            color: "var(--hdr-topbar-text)",
          }}
        >
          <div className="site-container hdr-inner justify-between text-xs py-1.5 gap-4 min-h-[var(--hdr-topbar-h)]">
            {/* Left: Flash Sale Badge + Message + Deals pill */}
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <span className="text-amber-400 text-sm font-bold shrink-0">⚡</span>
              {topbar?.badge_text && (
                <span className="bg-[#d72828] text-white text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  {topbar.badge_text}
                </span>
              )}
              <span className="text-[11px] sm:text-xs truncate font-medium">
                {topbar?.message}
              </span>
              {show.deals !== false && topbar?.deals_label && (
                <Link
                  href={topbar.deals_link || "/deals-offer"}
                  className="hidden sm:inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-black font-bold text-[11px] leading-tight shrink-0 transition-opacity hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #00b4db 0%, #f44336 55%, #ffc107 100%)",
                  }}
                >
                  🔥 {topbar.deals_label}
                </Link>
              )}
            </div>

            {/* Right: Stores, Helpline & User */}
            <div className="hidden md:flex items-center gap-6 shrink-0 text-[11px] sm:text-xs font-medium">
              {show.store !== false && topbar?.stores_text && (
                <a
                  href="https://sathya.adtarbo.com/stores"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:opacity-85 transition-opacity whitespace-nowrap"
                >
                  <HiOutlineBuildingStorefront className="w-4 h-4 shrink-0" />
                  <span>{topbar.stores_text}</span>
                </a>
              )}

              {show.contact !== false && topbar?.helpline && (
                <>
                  <span className="h-3 w-px bg-white/30" />
                  <a
                    href={`tel:${topbar.helpline.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center gap-1.5 hover:opacity-85 transition-opacity whitespace-nowrap"
                  >
                    <HiOutlinePhone className="w-3.5 h-3.5 shrink-0" />
                    <span>24/7 Helpline:</span>
                    <span className="font-bold tracking-tight">{topbar.helpline}</span>
                  </a>
                </>
              )}

              {show.user !== false && (
                <>
                  <span className="h-3 w-px bg-white/30" />
                  <div
                    className="relative"
                    ref={accountMenuRef}
                    onMouseEnter={handleMenuMouseEnter}
                    onMouseLeave={handleMenuMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isAuthenticated) {
                          setIsAccountMenuOpen((prev) => !prev);
                        } else {
                          setShowAuthModal(true);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
                      aria-label={isAuthenticated ? "Account Menu" : "Login"}
                      aria-expanded={isAccountMenuOpen}
                      aria-haspopup="true"
                    >
                      <FiUser className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">
                        {isAuthenticated ? (userDisplayName || "Account") : "Sign In"}
                      </span>
                      <FiChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                    {isAccountMenuOpen && renderAccountDropdown()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Main Header Row */}
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

          {/* Deliver To Box */}
          {show.deliver_to !== false && previewViewport !== "tablet" && (
            <button
              type="button"
              onClick={openRegionModal}
              aria-label={`Deliver to: ${city || "Chennai"}, ${pincode || "600001"}`}
              className="hidden md:flex items-center gap-2 bg-[#f8f9fa] hover:bg-gray-100 border border-gray-200/90 hover:border-red-300 rounded-xl px-2.5 lg:px-3 py-1.5 h-[44px] w-auto min-w-[125px] lg:min-w-[165px] max-w-[175px] lg:max-w-[240px] shrink-0 text-left transition-all group cursor-pointer"
              title={`Deliver to: ${city || "Chennai"}, ${pincode || "600001"} (${selectedRegion?.name || "Tamil Nadu"})`}
              suppressHydrationWarning
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FiMapPin className="w-4 h-4 text-[#d72828]" />
              </div>
              <div className="flex flex-col leading-none pr-1 min-w-0">
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Deliver to</span>
                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                  <span className="text-[11px] font-bold text-gray-900 whitespace-nowrap truncate capitalize" suppressHydrationWarning>
                    {pincode ? `${pincode} ` : ""}{district || city || "Chennai"}
                  </span>
                  <FiChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
                </div>
              </div>
            </button>
          )}

          {/* Search Bar */}
          {renderDesktopSearch()}

          {/* Offer Countdown Widget (when active) */}
          {effectiveOfferTimer && <HeaderOfferTimer timer={effectiveOfferTimer} />}

          {/* Right Icons (Store, Wishlist, Cart) */}
          <div className="hidden sm:flex items-center gap-3 md:gap-5 lg:gap-[28px] shrink-0 ml-auto">
            {show.store !== false && (
              <a
                href="https://sathya.adtarbo.com/stores"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Store Locations"
                className="hidden md:flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--hdr-icon-color)" }}
                title="Store Locations"
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineBuildingStorefront className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-medium mt-1 leading-none">Store</span>
              </a>
            )}

            {show.wishlist !== false && (
              <Link
                href="/wishlist"
                aria-label={`Wishlist (${wishlistCount || 0} items)`}
                className="flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--hdr-icon-color)" }}
                title="Wishlist"
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineHeart className="w-6 h-6" />
                  <span
                    className="absolute -top-1 -right-2 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none"
                    style={{ background: "var(--hdr-badge-bg)" }}
                    suppressHydrationWarning
                  >
                    {wishlistCount}
                  </span>
                </div>
                <span className="text-[11px] font-medium mt-1 leading-none">Wishlist</span>
              </Link>
            )}

            {show.cart !== false && (
              <Link
                href="/cart"
                aria-label={`Cart (${cartCount || 0} items)`}
                className="flex flex-col items-center justify-center min-w-[48px] transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--hdr-icon-color)" }}
                title="Shopping Cart"
              >
                <div className="relative flex items-center justify-center w-7 h-7">
                  <HiOutlineShoppingBag className="w-6 h-6" />
                  <span
                    className="absolute -top-1 -right-2 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none"
                    style={{ background: "var(--hdr-badge-bg)" }}
                    suppressHydrationWarning
                  >
                    {cartCount}
                  </span>
                </div>
                <span className="text-[11px] font-medium mt-1 leading-none">Cart</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Optional Accent Line */}
      {menu?.accent_line?.enabled && previewViewport !== "tablet" && (
        <div
          className="hidden md:block w-full"
          style={{
            height: "var(--hdr-accent-height)",
            background: "var(--hdr-accent-color)",
          }}
        />
      )}

      {/* Row 3: Menu Bar — "All Categories" aligned to .site-container left edge, full-width edge-to-edge background */}
      {previewViewport !== "tablet" && (
        <div
          className="hidden md:flex relative w-full items-center select-none z-30 hdr-menu-bar"
          style={{ background: "var(--hdr-menu-bg)" }}
        >
          <div className="site-container hdr-inner hdr-menu-row relative">
            {(menuButtonEnabled !== false) && (
              <div
                className="relative flex-shrink-0 h-full w-[180px]"
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
                  className="w-full h-full px-3 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-opacity hover:opacity-95 cursor-pointer"
                  style={{
                    background: "var(--hdr-btn-bg)",
                    color: "var(--hdr-btn-text)",
                  }}
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
                  <span className="whitespace-nowrap">All Categories</span>
                  <FiChevronDown size={14} className="opacity-90 shrink-0" />
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

            <div className="relative min-w-0 flex-1 pl-6 pr-4 overflow-hidden flex items-center h-full">
              <div className="flex items-center gap-4 xl:gap-[28px] whitespace-nowrap overflow-x-auto scrollbar-hide">
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
                          className={`hdr-menu-link inline-flex items-center text-xs xl:text-sm font-semibold transition-colors duration-150 whitespace-nowrap ${isHovered ? "hdr-menu-link-active font-bold" : ""
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
                          className="hdr-menu-link inline-flex items-center text-xs xl:text-sm font-semibold transition-colors duration-150 whitespace-nowrap"
                        >
                          {entry.label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="hdr-menu-link inline-flex items-center text-xs xl:text-sm font-semibold transition-colors duration-150 whitespace-nowrap"
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
