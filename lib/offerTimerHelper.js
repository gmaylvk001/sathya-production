/**
 * Helper utilities for Deals & Offer countdown timer and modal
 */

/**
 * Calculates current status of an offer timer
 * @param {Object} timer - The offer timer object from API or DB
 * @param {number} [nowMs] - Current timestamp in milliseconds (defaults to Date.now())
 * @returns {Object} status object containing { status, label, targetTime, diffMs, isLive, isUpcoming, isExpired }
 */
export function getOfferStatus(timer, nowMs = Date.now()) {
  if (!timer) {
    return {
      status: "expired",
      label: "Offer Ended",
      targetTime: 0,
      diffMs: 0,
      isLive: false,
      isUpcoming: false,
      isExpired: true,
    };
  }

  const startVal = timer.startDate || timer.offer_start;
  const endVal = timer.endDate || timer.offer_end;

  const startMs = startVal ? new Date(startVal).getTime() : null;
  const endMs = endVal ? new Date(endVal).getTime() : null;

  // 1. If end date is in the past -> Expired
  if (endMs && nowMs >= endMs) {
    return {
      status: "expired",
      label: "Offer Ended",
      targetTime: endMs,
      diffMs: 0,
      isLive: false,
      isUpcoming: false,
      isExpired: true,
    };
  }

  // 2. If start date is in the future -> Upcoming ("Starts In")
  if (startMs && nowMs < startMs) {
    const diffMs = Math.max(0, startMs - nowMs);
    return {
      status: "upcoming",
      label: "Starts In",
      targetTime: startMs,
      diffMs,
      isLive: false,
      isUpcoming: true,
      isExpired: false,
    };
  }

  // 3. Otherwise -> Currently Live ("Ends In")
  const targetTime = endMs || nowMs + 24 * 60 * 60 * 1000;
  const diffMs = Math.max(0, targetTime - nowMs);

  return {
    status: "live",
    label: "Ends In",
    targetTime,
    diffMs,
    isLive: true,
    isUpcoming: false,
    isExpired: false,
  };
}

/**
 * Converts milliseconds difference to 2-digit padded days, hours, minutes, seconds
 * @param {number} diffMs
 * @returns {{ days: string, hours: string, minutes: string, seconds: string, totalSec: number }}
 */
export function calculateCountdown(diffMs) {
  if (!diffMs || diffMs <= 0) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSec: 0,
    };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    totalSec,
  };
}

/**
 * Resolves full URL for an image filename or path
 * @param {string} path - Image path or filename
 * @param {string} defaultFolder - Default folder under /uploads/ if no leading slash
 * @returns {string|null}
 */
export function resolveImageUrl(path, defaultFolder = "topbanner") {
  if (!path) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/uploads/${defaultFolder}/${trimmed}`;
}
