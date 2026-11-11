"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { FiX } from "react-icons/fi";
import { getOfferStatus, calculateCountdown, resolveImageUrl } from "@/lib/offerTimerHelper";

export default function DealsOfferModal({
  isOpen,
  onClose,
  timer,
  onTimerExpire,
}) {
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1-second ticking live countdown
  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, mounted]);

  const offerStatus = useMemo(() => getOfferStatus(timer, nowMs), [timer, nowMs]);
  const timeUnits = useMemo(() => calculateCountdown(offerStatus.diffMs), [offerStatus.diffMs]);

  // Trigger optional callback when timer expires / transitions
  useEffect(() => {
    if (offerStatus.diffMs <= 0 && onTimerExpire) {
      onTimerExpire();
    }
  }, [offerStatus.diffMs, onTimerExpire]);

  if (!mounted || !isOpen || !timer) return null;

  // Resolve banner image (dealsPopupImage -> topBanner -> fallback)
  const rawImg =
    timer.dealsPopupImage ||
    timer.popup_image_url ||
    timer.topBanner ||
    timer.top_banner_url ||
    null;

  const resolvedImg = resolveImageUrl(rawImg, "topbanner");
  const fallbackImg = "/uploads/topbanner/deals-popup-1789045708272-Screenshot_2026-09-09_173902.png";
  const displayImg = imgError || !resolvedImg ? fallbackImg : resolvedImg;

  // Resolve title
  const offerTitle =
    timer.offerHeading ||
    timer.offerTitle ||
    timer.offer_title ||
    "Special Deals & Offers";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deals-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-[3px] transition-opacity duration-200"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-gray-100/90 w-full max-w-[460px] relative p-5 sm:p-7 flex flex-col items-center text-center transform transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button 'X' */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center z-10 cursor-pointer focus:outline-none"
        >
          <FiX size={18} strokeWidth={2.5} />
        </button>

        {/* Top Deals Banner Image */}
        <div className="w-full max-w-[340px] h-20 sm:h-24 relative mb-3.5 rounded-xl overflow-hidden bg-gray-50/80 border border-gray-100/80 flex items-center justify-center p-2">
          <Image
            src={displayImg}
            alt={offerTitle}
            fill
            className="object-contain p-1"
            sizes="(max-width: 640px) 280px, 340px"
            priority
            onError={() => setImgError(true)}
            unoptimized
          />
        </div>

        {/* Offer Title (e.g. THALAPATHY) */}
        <h2
          id="deals-modal-title"
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase font-sans mb-2 px-2 leading-tight"
        >
          {offerTitle}
        </h2>

        {/* Dynamic Status Pill: "Starts In" / "Ends In" */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-xs bg-red-50 text-[#d72828] border border-red-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d72828] animate-pulse" />
            <span>{offerStatus.label}</span>
          </span>
        </div>

        {/* 4 Premium Compact Countdown Cards (Sathya Red) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-[410px] px-0.5 sm:px-1">
          {/* Days */}
          <div className="bg-gradient-to-b from-[#e52d2d] to-[#c91e1e] rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-1 flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(215,40,40,0.22)] border border-red-400/30">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-mono tracking-tight">
              {timeUnits.days}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-100 uppercase tracking-wider mt-1.5">
              DAYS
            </span>
          </div>

          {/* Hours */}
          <div className="bg-gradient-to-b from-[#e52d2d] to-[#c91e1e] rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-1 flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(215,40,40,0.22)] border border-red-400/30">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-mono tracking-tight">
              {timeUnits.hours}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-100 uppercase tracking-wider mt-1.5">
              HOURS
            </span>
          </div>

          {/* Minutes */}
          <div className="bg-gradient-to-b from-[#e52d2d] to-[#c91e1e] rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-1 flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(215,40,40,0.22)] border border-red-400/30">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-mono tracking-tight">
              {timeUnits.minutes}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-100 uppercase tracking-wider mt-1.5">
              MINUTES
            </span>
          </div>

          {/* Seconds */}
          <div className="bg-gradient-to-b from-[#e52d2d] to-[#c91e1e] rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-1 flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(215,40,40,0.22)] border border-red-400/30">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-mono tracking-tight">
              {timeUnits.seconds}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-100 uppercase tracking-wider mt-1.5">
              SECONDS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
