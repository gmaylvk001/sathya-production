import Store from "@/models/store";
import PincodeLocation from "@/models/PincodeLocation";
import {
  calculateHaversineDistance,
  calculateDeliveryDays,
  resolveStoreCoordinates,
} from "@/lib/distanceCalculator";
import { lookupPincode } from "@/lib/regionHelper";
import {
  getIstDateParts,
  getClientFallbackBaseDays,
  isValidDeliveryPincode,
} from "@/lib/cart/deliveryEstimate";

/**
 * Resolve base pincode delivery SLA once per cart request using active store distance + 5 PM IST cutoff.
 */
export async function resolvePincodeBaseSla({ pincode = "", region = "" } = {}) {
  const cleanPin = String(pincode || "").replace(/\D/g, "").trim();
  const ist = getIstDateParts(new Date());
  const isCutoffPassed = ist.hours >= 17;

  if (!isValidDeliveryPincode(cleanPin)) {
    return {
      pincode: cleanPin,
      baseDays: getClientFallbackBaseDays(cleanPin, region),
      isCutoffPassed,
    };
  }

  try {
    const stores = await Store.find({ status: "Active" })
      .select("zipcode zip_code pincode location_map website location city")
      .lean();

    const exactMatch = stores.find(
      (s) => String(s.zipcode || s.zip_code || s.pincode || "").trim() === cleanPin
    );
    if (exactMatch) {
      return { pincode: cleanPin, baseDays: 1, isCutoffPassed };
    }

    let targetLat = null;
    let targetLng = null;

    const cachedLoc = await PincodeLocation.findOne({ pincode: cleanPin })
      .select("latitude longitude")
      .lean();
    if (cachedLoc?.latitude && cachedLoc?.longitude) {
      targetLat = cachedLoc.latitude;
      targetLng = cachedLoc.longitude;
    } else {
      const geo = await lookupPincode(cleanPin).catch(() => null);
      if (geo?.status === "success" && geo?.isValid && geo.latitude && geo.longitude) {
        targetLat = geo.latitude;
        targetLng = geo.longitude;
      }
    }

    let minDistance = Infinity;
    if (targetLat && targetLng && stores.length > 0) {
      for (const store of stores) {
        const coords = resolveStoreCoordinates(store);
        if (coords?.lat && coords?.lng) {
          const dist = calculateHaversineDistance(targetLat, targetLng, coords.lat, coords.lng);
          if (dist < minDistance) minDistance = dist;
        }
      }
    }

    if (Number.isFinite(minDistance)) {
      const baseDays = calculateDeliveryDays(minDistance, 100, 1);
      return { pincode: cleanPin, baseDays, isCutoffPassed };
    }
  } catch (err) {
    console.warn("resolvePincodeBaseSla fallback:", err?.message || err);
  }

  return {
    pincode: cleanPin,
    baseDays: getClientFallbackBaseDays(cleanPin, region),
    isCutoffPassed,
  };
}
