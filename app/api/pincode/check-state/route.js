import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PincodeLocation from "@/models/PincodeLocation";
import {
  lookupPincode,
  reverseGeocode,
  isValidPincode,
  DEFAULT_LOCATION,
} from "@/lib/regionHelper";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { pincode, latitude, longitude } = body;

    let result = null;

    if (latitude !== undefined && longitude !== undefined && latitude !== "" && longitude !== "") {
      result = await reverseGeocode(latitude, longitude);
    } else if (pincode && isValidPincode(pincode)) {
      // Check cache in PincodeLocation first
      const cached = await PincodeLocation.findOne({ pincode: pincode.toString().trim() });
      if (cached && cached.latitude && cached.longitude) {
        result = {
          status: "success",
          pincode: cached.pincode,
          city: cached.district || "unknown",
          district: cached.district || "unknown",
          stateName: cached.state || "Tamil Nadu",
          region: cached.region || "tamilnadu",
          latitude: cached.latitude,
          longitude: cached.longitude,
        };
      } else {
        result = await lookupPincode(pincode);
      }
    } else {
      result = {
        status: "success",
        ...DEFAULT_LOCATION,
      };
    }

    if (!result || result.status === "error") {
      result = { status: "success", ...DEFAULT_LOCATION };
    }

    // Cache coordinate location if available
    if (result.pincode && result.latitude && result.longitude) {
      await PincodeLocation.findOneAndUpdate(
        { pincode: result.pincode },
        {
          pincode: result.pincode,
          latitude: result.latitude,
          longitude: result.longitude,
          district: result.district || result.city,
          state: result.stateName,
          region: result.region,
        },
        { upsert: true, new: true }
      ).catch((err) => console.error("Cache location error:", err.message));
    }

    const responsePayload = {
      status: true,
      pincode: result.pincode || DEFAULT_LOCATION.pincode,
      city: result.city || DEFAULT_LOCATION.city,
      district: result.district || result.city || DEFAULT_LOCATION.district || DEFAULT_LOCATION.city,
      locality: result.locality || "",
      state: result.stateName || DEFAULT_LOCATION.stateName,
      region: result.region || DEFAULT_LOCATION.region,
      code: result.code || DEFAULT_LOCATION.code,
    };

    const response = NextResponse.json(responsePayload);

    // Synchronize cookie for SSR components
    const cookieData = JSON.stringify(responsePayload);
    response.cookies.set("sathya_location", cookieData, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Check pincode state error:", err);
    return NextResponse.json(
      {
        status: false,
        message: err.message || "Failed to check pincode state",
        ...DEFAULT_LOCATION,
      },
      { status: 500 }
    );
  }
}
