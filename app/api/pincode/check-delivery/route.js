import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Store from "@/models/store";
import PincodeLocation from "@/models/PincodeLocation";
import {
  calculateHaversineDistance,
  calculateDeliveryDays,
  formatDeliveryMessage,
  resolveStoreCoordinates,
} from "@/lib/distanceCalculator";
import {
  isValidPincode,
  isKarnatakaPincode,
  lookupPincode,
} from "@/lib/regionHelper";
import { resolveProductPrice } from "@/lib/priceResolver";
import {
  resolveRegionalFulfillment,
  resolveRegionVendorContext,
} from "@/lib/regionalFulfillment";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode")?.trim();
    const itemCode = searchParams.get("item_code")?.trim();
    const productId = searchParams.get("productId")?.trim();
    const quantity = Math.max(1, Math.floor(Number(searchParams.get("quantity") || 1) || 1));

    if (!pincode || !isValidPincode(pincode)) {
      return NextResponse.json(
        {
          status: 0,
          available: false,
          serviceable: false,
          deliveryAvailable: false,
          message: "Please enter a valid 6-digit pincode",
          deliveryMessage: "Please enter a valid 6-digit pincode",
          pickupAvailable: false,
          pickupMessage: "Not Available",
          codAvailable: false,
          isCodAvailable: false,
        },
        { status: 400 }
      );
    }

    // Invalid / unserviceable civil pincode prefix check (Indian postal pincodes start with 1-8)
    if (pincode.startsWith("0") || pincode.startsWith("9")) {
      return NextResponse.json({
        status: 0,
        available: false,
        serviceable: false,
        deliveryAvailable: false,
        days: 0,
        deliveryDays: 0,
        message: "Not Available for Delivery at Your Location",
        deliveryMessage: "Not Available for Delivery at Your Location",
        pickupAvailable: false,
        pickupMessage: "Not Available",
        codAvailable: false,
        isCodAvailable: false,
      });
    }

    // 1. Resolve target location and verify actual existence & serviceability
    let targetLat = null;
    let targetLng = null;
    let region = "tamilnadu";
    let stateName = "Tamil Nadu";
    let isPincodeVerified = false;

    // Check physical stores first for exact store match
    const stores = await Store.find({ status: "Active" }).lean();
    const exactMatch = stores.find((s) => s.zipcode === pincode);
    if (exactMatch) {
      isPincodeVerified = true;
      const exactCoords = resolveStoreCoordinates(exactMatch);
      targetLat = exactCoords?.lat ?? exactMatch.location_map?.lat ?? null;
      targetLng = exactCoords?.lng ?? exactMatch.location_map?.lng ?? null;
      region = exactMatch.region || "tamilnadu";
      stateName = exactMatch.state || "Tamil Nadu";
    }

    if (!isPincodeVerified) {
      const cachedLoc = await PincodeLocation.findOne({ pincode }).lean();
      if (cachedLoc && cachedLoc.latitude && cachedLoc.longitude) {
        isPincodeVerified = true;
        targetLat = cachedLoc.latitude;
        targetLng = cachedLoc.longitude;
        region = cachedLoc.region || "tamilnadu";
        stateName = cachedLoc.state || "Tamil Nadu";
      }
    }

    if (!isPincodeVerified) {
      const geo = await lookupPincode(pincode);
      if (geo.status !== "success" || !geo.isValid || !geo.latitude || !geo.longitude) {
        // STOP HERE! Pincode is invalid, unknown, or non-existent
        return NextResponse.json({
          status: 0,
          available: false,
          serviceable: false,
          deliveryAvailable: false,
          days: 0,
          deliveryDays: 0,
          message: "Not Available for Delivery at Your Location",
          deliveryMessage: "Not Available for Delivery at Your Location",
          pickupAvailable: false,
          pickupMessage: "Not Available",
          codAvailable: false,
          isCodAvailable: false,
        });
      }

      isPincodeVerified = true;
      targetLat = geo.latitude;
      targetLng = geo.longitude;
      region = geo.region || "tamilnadu";
      stateName = geo.stateName || "Tamil Nadu";

      // Cache verified pincode in PincodeLocation
      await PincodeLocation.findOneAndUpdate(
        { pincode },
        {
          pincode,
          latitude: targetLat,
          longitude: targetLng,
          district: geo.city || "unknown",
          state: stateName,
          region,
        },
        { upsert: true, new: true }
      ).catch((err) => console.error("Cache location error:", err.message));
    }

    // 2. Distance calculation & store pickup eligibility (radius <= 35 km)
    let minDistance = 9999;
    const eligiblePickupStores = [];

    if (stores.length > 0) {
      for (const store of stores) {
        let dist = 9999;
        const storeCoords = resolveStoreCoordinates(store);
        if (store.zipcode === pincode) {
          dist = 0;
        } else if (targetLat && targetLng && storeCoords?.lat && storeCoords?.lng) {
          dist = calculateHaversineDistance(
            targetLat,
            targetLng,
            storeCoords.lat,
            storeCoords.lng
          );
        }

        if (dist < minDistance) {
          minDistance = dist;
        }

        if (dist <= 35) {
          eligiblePickupStores.push({
            _id: store._id,
            name: store.organisation_name || "Sathya Store",
            city: store.city || "",
            zipcode: store.zipcode || "",
            distanceKm: Math.round(dist),
          });
        }
      }
    }

    // 3. Serviceability check (Sathya covered territory: South Indian states or within 600km)
    const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra", "telangana", "puducherry"];
    const targetStateLower = (stateName || "").toLowerCase();
    const isSouthIndianState = southIndianStates.some((s) => targetStateLower.includes(s));

    if (!exactMatch && (!isSouthIndianState || minDistance > 600 || minDistance === 9999)) {
      return NextResponse.json({
        status: 0,
        available: false,
        serviceable: false,
        deliveryAvailable: false,
        days: 0,
        deliveryDays: 0,
        message: "Not Available for Delivery at Your Location",
        deliveryMessage: "Not Available for Delivery at Your Location",
        pickupAvailable: false,
        pickupMessage: "Not Available",
        codAvailable: false,
        isCodAvailable: false,
      });
    }

    const regionCtx = resolveRegionVendorContext({
      pincode,
      state: stateName,
      region,
    });
    const isKarnataka = regionCtx.isKarnataka;
    const resolvedRegion = regionCtx.region || region;

    // 4. Unified Regional Serviceability & Fulfillment Resolution
    let product = null;
    let ownerProduct = null;
    let availableStock = null;
    if (productId || itemCode) {
      const fulfillment = await resolveRegionalFulfillment({
        pincode,
        state: isKarnataka ? "Karnataka" : stateName,
        region: resolvedRegion,
        productId,
        itemCode,
        quantity,
        geoCheckResult: { serviceable: true },
      });

      if (!fulfillment.isDeliverable) {
        const failureMsg =
          fulfillment.errorReason || "Not Available for Delivery at Your Location";
        return NextResponse.json({
          status: 0,
          available: false,
          serviceable: false,
          deliveryAvailable: false,
          days: 0,
          deliveryDays: 0,
          message: failureMsg,
          deliveryMessage: failureMsg,
          errorReason: failureMsg,
          pickupAvailable: false,
          pickupMessage: "Not Available",
          codAvailable: false,
          isCodAvailable: false,
          assignedVendor: fulfillment.assignedVendor,
          vendorId: fulfillment.vendorId,
          vendorName: fulfillment.vendorName,
          availableStock: fulfillment.availableStock,
          state: isKarnataka ? "Karnataka" : stateName,
          isKarnataka,
          region: fulfillment.region || resolvedRegion,
        });
      }

      product = fulfillment.product;
      ownerProduct = fulfillment.ownerProduct;
      availableStock = fulfillment.availableStock;
    }

    // 5. Server cutoff evaluation (5:00 PM / 17:00 IST)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcMs + 330 * 60000); // UTC+5:30
    const isCutoffPassed = istDate.getHours() >= 17;
    const cutoffOffset = isCutoffPassed ? 1 : 0;

    // 6. Delivery SLA days
    let baseDays = 2;
    if (exactMatch) {
      baseDays = 1;
      minDistance = 0;
    } else if (minDistance < 9999) {
      baseDays = calculateDeliveryDays(minDistance, 100, 1);
    }
    const days = baseDays + cutoffOffset;
    // Karnataka (Unilet) deliveries on the product page show location availability,
    // not a day-count SLA such as "Delivery in One Day".
    const message = isKarnataka
      ? "Delivery Available at Your Location"
      : formatDeliveryMessage(days, false);

    // 7. Store Pickup availability
    const pickupAvailable = eligiblePickupStores.length > 0;
    const pickupMessage = pickupAvailable
      ? "Reserve & Collect at Store"
      : "Not Available";

    // 8. COD availability (serviceable & selling price <= 50,000)
    // Same selling priority as PDP/cart/order: Unilet → LSP → special → MRP
    let sellingPrice = 0;
    if (product) {
      const priceInfo = resolveProductPrice(
        product,
        ownerProduct,
        isKarnataka ? "karnataka" : resolvedRegion || "tamilnadu"
      );
      sellingPrice = Number(priceInfo.effectivePrice) || 0;
    }
    const isCodAvailable = sellingPrice <= 50000;

    return NextResponse.json({
      status: 1,
      available: true,
      serviceable: true,
      deliveryAvailable: true,
      days,
      deliveryDays: days,
      distanceKm: minDistance < 9999 ? Math.round(minDistance) : null,
      message,
      deliveryMessage: message,
      pickupAvailable,
      pickupMessage,
      pickupStores: eligiblePickupStores.slice(0, 5),
      codAvailable: isCodAvailable,
      isCodAvailable,
      assignedVendor: regionCtx.assignedVendor,
      vendorId: regionCtx.vendorId,
      vendorName: regionCtx.vendorName,
      ...(availableStock != null ? { availableStock } : {}),
      region: resolvedRegion,
      isKarnataka,
      state: isKarnataka ? "Karnataka" : stateName,
    });
  } catch (err) {
    console.error("Check delivery pincode error:", err);
    return NextResponse.json(
      {
        status: 0,
        available: false,
        serviceable: false,
        deliveryAvailable: false,
        message: "Unable to calculate delivery estimate at this time",
        deliveryMessage: "Unable to calculate delivery estimate at this time",
        pickupAvailable: false,
        pickupMessage: "Not Available",
        codAvailable: false,
        isCodAvailable: false,
      },
      { status: 500 }
    );
  }
}
