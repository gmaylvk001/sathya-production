/**
 * Offer Expiry Engine — start/end date lifecycle
 */

export function evaluateOfferWindow(startDate, endDate, now = new Date()) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end) {
    return { visible: false, phase: "invalid", suggestedStatus: "inactive" };
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { visible: false, phase: "invalid", suggestedStatus: "inactive" };
  }
  if (now < start) {
    return { visible: false, phase: "scheduled", suggestedStatus: "inactive" };
  }
  if (now > end) {
    return { visible: false, phase: "expired", suggestedStatus: "expired" };
  }
  return { visible: true, phase: "active", suggestedStatus: "active" };
}

/**
 * Returns whether a combo should appear on the storefront.
 */
export function isComboStorefrontVisible(combo, now = new Date()) {
  if (!combo) return false;

  // Manual / lifecycle blocks
  if (["draft", "inactive", "expired", "out_of_stock"].includes(combo.status)) {
    return false;
  }

  const stock = Number(combo.comboStock) || 0;
  if (stock <= 0) return false;

  const window = evaluateOfferWindow(combo.startDate, combo.endDate, now);
  if (!window.visible) return false;

  return true;
}

export function syncComboLifecycleStatus(combo, now = new Date()) {
  const stock = Number(combo.comboStock) || 0;
  if (stock <= 0) {
    return "out_of_stock";
  }
  const window = evaluateOfferWindow(combo.startDate, combo.endDate, now);
  if (window.phase === "expired") return "expired";
  if (window.phase === "scheduled") return "inactive";
  if (combo.status === "draft") return "draft";
  if (combo.status === "inactive") return "inactive";
  return "active";
}
