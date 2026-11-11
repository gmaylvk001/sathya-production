import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PincodeServiceability from "@/models/PincodeServiceability";
import Store from "@/models/store";
import PincodeLocation from "@/models/PincodeLocation";
import { calculateHaversineDistance } from "@/lib/distanceCalculator";
import {
  isValidPincode,
  lookupPincode,
  CITY_COORDINATES,
  SUPPORTED_REGIONS,
} from "@/lib/regionHelper";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode")?.trim();

    if (!pincode || !isValidPincode(pincode)) {
      return NextResponse.json(
        {
          success: false,
          serviceable: false,
          message: "Please provide a valid 6-digit pincode",
          stores: [],
        },
        { status: 400 }
      );
    }

    // 1. Check PincodeServiceability collection first
    const serviceRecords = await PincodeServiceability.find({
      serviceablePincode: pincode,
    }).lean();

    // 2. Lookup coordinates for target pincode
    let targetLat = null;
    let targetLng = null;
    let region = "tamilnadu";
    let city = "unknown";
    let stateName = "Tamil Nadu";

    let locationRecord = await PincodeLocation.findOne({ pincode }).lean();

    if (locationRecord && locationRecord.latitude && locationRecord.longitude) {
      targetLat = locationRecord.latitude;
      targetLng = locationRecord.longitude;
      region = locationRecord.region || "tamilnadu";
      city = locationRecord.district || "unknown";
      stateName = locationRecord.state || "Tamil Nadu";
    } else {
      const geo = await lookupPincode(pincode);
      region = geo.region || "tamilnadu";
      city = geo.city || "unknown";
      stateName = geo.stateName || "Tamil Nadu";
      targetLat = geo.latitude;
      targetLng = geo.longitude;

      if (targetLat && targetLng) {
        await PincodeLocation.findOneAndUpdate(
          { pincode },
          {
            pincode,
            latitude: targetLat,
            longitude: targetLng,
            district: city,
            state: stateName,
            region,
          },
          { upsert: true, new: true }
        ).catch((err) => console.error("Cache location error:", err.message));
      }
    }

    // 3. Fetch all active physical stores
    const allStores = await Store.find({ status: "Active" }).lean();

    const mappedStores = allStores.map((store) => {
      const exactMatch = serviceRecords.find(
        (sr) =>
          sr.branchPincode === store.zipcode ||
          sr.sapCode === store.location_id ||
          sr.branchName?.toLowerCase() === store.organisation_name?.toLowerCase()
      );

      let distanceKm = null;

      if (exactMatch && typeof exactMatch.distanceKm === "number") {
        distanceKm = exactMatch.distanceKm;
      } else if (store.zipcode === pincode) {
        distanceKm = 0;
      } else {
        // Resolve store coordinates
        let storeLat = store.location_map?.lat;
        let storeLng = store.location_map?.lng;

        if (!storeLat || !storeLng) {
          const storeCityKey = (store.city || "").toLowerCase();
          const cityCoords = CITY_COORDINATES[storeCityKey];
          if (cityCoords) {
            storeLat = cityCoords.lat;
            storeLng = cityCoords.lng;
          }
        }

        if (targetLat && targetLng && storeLat && storeLng) {
          distanceKm =
            Math.round(
              calculateHaversineDistance(targetLat, targetLng, storeLat, storeLng) * 10
            ) / 10;
        }
      }

      const isStoreServiceable =
        exactMatch ||
        store.zipcode === pincode ||
        (distanceKm !== null && distanceKm <= 500);

      return {
        _id: store._id,
        organisation_name: store.organisation_name,
        name: store.organisation_name,
        address: store.address || store.location || "",
        city: store.city || "",
        zipcode: store.zipcode || "",
        phone: store.phone || "",
        distanceKm: distanceKm !== null ? distanceKm : 9999,
        isServiceable: !!isStoreServiceable,
      };
    });

    // Sort stores by distance ascending
    mappedStores.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));

    // A pincode is serviceable if it belongs to South Indian covered states or has exact store match
    const southIndianStates = ["tamil nadu", "kerala", "karnataka", "andhra", "telangana"];
    const targetStateLower = (stateName || "").toLowerCase();
    const isSouthIndianState = southIndianStates.some((s) => targetStateLower.includes(s));

    const isServiceable =
      serviceRecords.length > 0 ||
      isSouthIndianState ||
      mappedStores.some((s) => s.distanceKm <= 500 || s.zipcode === pincode);

    return NextResponse.json({
      success: true,
      serviceable: isServiceable,
      pincode,
      region,
      city,
      stores: mappedStores,
    });
  } catch (err) {
    console.error("Pincode check error:", err);
    return NextResponse.json(
      {
        success: false,
        serviceable: false,
        message: err.message || "Failed to check pincode",
        stores: [],
      },
      { status: 500 }
    );
  }
}
