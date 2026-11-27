/**
 * Shared client + server per-item delivery date calculation helpers.
 * Combines header pincode distance SLA, 5 PM IST cutoff, and product category handling.
 */

const HEAVY_APPLIANCE_REGEX =
  /\b(ac|a\.c\.|split\s+ac|window\s+ac|inverter\s+ac|air\s*conditioner|refrigerator|fridge|washing\s*machine|front\s*load|top\s*load|dryer|washer|dishwasher|television|smart\s*tv|led\s*tv|oled|qled|uhd\s*tv|deep\s*freezer|chest\s*freezer|microwave|oven|chimney|hob)\b/i;

const METRO_FAST_PINCODE_PREFIXES = ["600", "641", "625", "620", "627", "560", "500", "682", "695"];

export function getIstDateParts(now = new Date()) {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 330 * 60000);
  return {
    year: ist.getFullYear(),
    month: ist.getMonth(),
    day: ist.getDate(),
    hours: ist.getHours(),
  };
}

export function addDaysFormatted(offsetDays, now = new Date()) {
  const { year, month, day } = getIstDateParts(now);
  const target = new Date(Date.UTC(year, month, day + Math.max(1, Math.round(offsetDays))));
  const weekdayDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(target);
  const shortDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(target);

  return {
    isoDate: target.toISOString().slice(0, 10),
    weekdayDate,
    shortDate,
  };
}

export function isHeavyInstallationProduct(item = {}) {
  const text = [
    item.categoryName,
    item.category_name,
    item.sub_category_new_name,
    item.product_type,
    item.name,
  ]
    .filter(Boolean)
    .join(" ");

  return HEAVY_APPLIANCE_REGEX.test(text);
}

export function isValidDeliveryPincode(pincode) {
  const pin = String(pincode || "").replace(/\D/g, "").trim();
  return pin.length === 6 && !pin.startsWith("0") && !pin.startsWith("9");
}

export function getClientFallbackBaseDays(pincode, region = "") {
  const pin = String(pincode || "").replace(/\D/g, "").trim();
  if (!isValidDeliveryPincode(pin)) return 2;

  const prefix3 = pin.slice(0, 3);
  const prefix2 = Number(pin.slice(0, 2));

  if (METRO_FAST_PINCODE_PREFIXES.includes(prefix3)) {
    return 1;
  }
  if (prefix2 >= 60 && prefix2 <= 64) {
    return 2;
  }
  if (String(region || "").toLowerCase() === "karnataka" || (prefix2 >= 56 && prefix2 <= 59)) {
    return 2;
  }
  if (prefix2 >= 67 && prefix2 <= 69) {
    return 3;
  }
  if (prefix2 >= 50 && prefix2 <= 53) {
    return 4;
  }
  return 4;
}

export function computeItemDeliveryEstimate({
  item = {},
  baseDays,
  pincode = "",
  region = "",
  isCutoffPassed,
  now = new Date(),
}) {
  const isDeliverable = item.isDeliverable !== false;
  if (!isDeliverable) {
    return {
      available: false,
      label: item.deliveryErrorReason || "Unavailable for delivery at this pincode",
      isHeavyAppliance: isHeavyInstallationProduct(item),
      minDays: 0,
      maxDays: 0,
    };
  }

  const ist = getIstDateParts(now);
  const cutoffPassed = typeof isCutoffPassed === "boolean" ? isCutoffPassed : ist.hours >= 17;
  const cutoffOffset = cutoffPassed ? 1 : 0;

  const isHeavy = isHeavyInstallationProduct(item);
  const isCusOrder = String(item.movement || "").trim().toUpperCase() === "CUS-ORDER";
  const resolvedBase =
    Number(baseDays) > 0
      ? Number(baseDays)
      : getClientFallbackBaseDays(pincode, item.region || region);

  const explicitOwnerDays =
    Number(item.ownerDeliveryDays ?? item.deliveryDays ?? 0) || 0;
  const effectiveBase =
    explicitOwnerDays > 1 ? Math.max(resolvedBase, explicitOwnerDays) : resolvedBase;

  let minDays = effectiveBase + cutoffOffset;
  let maxDays = minDays;

  if (isHeavy) {
    minDays += 2;
    maxDays = minDays + 2;
  } else if (effectiveBase >= 2) {
    maxDays = minDays + 1;
  }

  if (isCusOrder) {
    minDays += 2;
    maxDays += 3;
  }

  minDays = Math.max(1, Math.min(minDays, 12));
  maxDays = Math.max(minDays, Math.min(maxDays, 14));

  const minInfo = addDaysFormatted(minDays, now);
  const maxInfo = addDaysFormatted(maxDays, now);

  const label =
    minDays === maxDays
      ? `Delivery by ${minInfo.weekdayDate}`
      : `Estimated Delivery: ${minInfo.shortDate} – ${maxInfo.shortDate}`;

  return {
    available: true,
    pincode: String(pincode || "").replace(/\D/g, "").trim(),
    isHeavyAppliance: isHeavy,
    isExpress: !isHeavy && minDays <= 2,
    minDays,
    maxDays,
    minDate: minInfo.isoDate,
    maxDate: maxInfo.isoDate,
    label,
  };
}
