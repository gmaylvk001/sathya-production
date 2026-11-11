"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getOfferStatus, calculateCountdown } from "@/lib/offerTimerHelper";

export default function HeaderOfferTimer({ timer, isMobile = false, mobileForceDesktopStyle = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1-second ticking live countdown
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const offerStatus = useMemo(() => {
    return getOfferStatus(timer, nowMs);
  }, [timer, nowMs]);

  const timeUnits = useMemo(() => {
    return calculateCountdown(offerStatus.diffMs);
  }, [offerStatus.diffMs]);

  if (!mounted || !timer || offerStatus.isExpired) return null;

  const title =
    timer.offerHeading ||
    timer.offerTitle ||
    timer.offer_title ||
    "Special Offer";

  const handleClick = (e) => {
    e.preventDefault();
    if (pathname === "/deals-offer") {
      window.dispatchEvent(new CustomEvent("openDealsModal"));
    } else {
      router.push("/deals-offer?openModal=true");
    }
  };

  // Compact Mobile Version
  if (isMobile && !mobileForceDesktopStyle) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold text-[11px] shadow-sm active:scale-95 transition-all cursor-pointer flex-shrink-0"
        title={`${title} - Click to view offer details`}
      >
        <span className="truncate max-w-[60px] hidden xs:block">{title}</span>
        <span className="bg-white/90 text-gray-900 px-1 py-0.2 rounded text-[10px] font-mono font-extrabold tracking-tight">
          {timeUnits.days}d {timeUnits.hours}h {timeUnits.minutes}m
        </span>
      </button>
    );
  }

  // Single Line Full-Width Mobile Version (Above Search Bar)
  if (isMobile && mobileForceDesktopStyle) {
    return (
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick(e);
        }}
        className="flex w-full items-stretch justify-between cursor-pointer group select-none transition-transform hover:scale-[1.01] active:scale-[0.99] rounded-md overflow-hidden shadow-sm border border-amber-300 mx-2"
        title={`${title} (${offerStatus.label}) - Click to view offer details`}
      >
        <div className="bg-[#fcd34d] hover:bg-amber-400 text-gray-950 font-extrabold text-[10px] sm:text-[11px] px-2 py-1 flex-1 text-center uppercase tracking-wide truncate transition-colors flex items-center justify-center min-w-0">
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-2 py-1 text-white shrink-0">
          <div className="flex flex-col items-center px-0.5 min-w-[26px]">
            <span className="font-mono font-extrabold text-[11px] leading-none text-white drop-shadow-sm">{timeUnits.days}</span>
            <span className="text-[7px] font-semibold tracking-wider text-amber-200 uppercase mt-0.5">Days</span>
          </div>
          <span className="text-[10px] text-white/50 font-bold -mt-1">:</span>
          <div className="flex flex-col items-center px-0.5 min-w-[26px]">
            <span className="font-mono font-extrabold text-[11px] leading-none text-white drop-shadow-sm">{timeUnits.hours}</span>
            <span className="text-[7px] font-semibold tracking-wider text-amber-200 uppercase mt-0.5">Hours</span>
          </div>
          <span className="text-[10px] text-white/50 font-bold -mt-1">:</span>
          <div className="flex flex-col items-center px-0.5 min-w-[26px]">
            <span className="font-mono font-extrabold text-[11px] leading-none text-white drop-shadow-sm">{timeUnits.minutes}</span>
            <span className="text-[7px] font-semibold tracking-wider text-amber-200 uppercase mt-0.5">Mins</span>
          </div>
          <span className="text-[10px] text-white/50 font-bold -mt-1">:</span>
          <div className="flex flex-col items-center px-0.5 min-w-[26px]">
            <span className="font-mono font-extrabold text-[11px] leading-none text-amber-300 drop-shadow-sm">{timeUnits.seconds}</span>
            <span className="text-[7px] font-semibold tracking-wider text-amber-200 uppercase mt-0.5">Secs</span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Version (Matches Screenshot Image 1)
  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick(e);
      }}
      className="hidden lg:flex flex-col items-center justify-center cursor-pointer group select-none flex-shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]"
      title={`${title} (${offerStatus.label}) - Click to view offer details`}
    >
      {/* Yellow / Amber Pill Title Bar on Top */}
      <div className="w-full bg-[#fcd34d] hover:bg-amber-400 text-gray-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-t-md text-center uppercase tracking-wide truncate max-w-[210px] shadow-sm border border-amber-300 transition-colors">
        {title}
      </div>

      {/* 4 Mini Timer Cells Below */}
      <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm border border-black/20 rounded-b-md px-1 py-0.5 shadow-sm text-white">
        {/* Days */}
        <div className="flex flex-col items-center px-1.5 py-0.5 min-w-[34px]">
          <span className="font-mono font-extrabold text-[12px] leading-none text-white drop-shadow-sm">
            {timeUnits.days}
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-amber-200 uppercase leading-tight mt-0.5">
            Days
          </span>
        </div>

        <span className="text-[10px] text-white/50 font-bold">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center px-1.5 py-0.5 min-w-[34px]">
          <span className="font-mono font-extrabold text-[12px] leading-none text-white drop-shadow-sm">
            {timeUnits.hours}
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-amber-200 uppercase leading-tight mt-0.5">
            Hours
          </span>
        </div>

        <span className="text-[10px] text-white/50 font-bold">:</span>

        {/* Mins */}
        <div className="flex flex-col items-center px-1.5 py-0.5 min-w-[34px]">
          <span className="font-mono font-extrabold text-[12px] leading-none text-white drop-shadow-sm">
            {timeUnits.minutes}
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-amber-200 uppercase leading-tight mt-0.5">
            Mins
          </span>
        </div>

        <span className="text-[10px] text-white/50 font-bold">:</span>

        {/* Secs */}
        <div className="flex flex-col items-center px-1.5 py-0.5 min-w-[34px]">
          <span className="font-mono font-extrabold text-[12px] leading-none text-amber-300 drop-shadow-sm">
            {timeUnits.seconds}
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-amber-200 uppercase leading-tight mt-0.5">
            Secs
          </span>
        </div>
      </div>
    </div>
  );
}
