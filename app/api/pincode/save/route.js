import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { lookupPincode, isValidPincode, DEFAULT_LOCATION } from "@/lib/regionHelper";

export async function POST(req) {
  try {
    await dbConnect();
    const { pincode } = await req.json().catch(() => ({}));

    if (!pincode || !isValidPincode(pincode)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Please enter a valid 6-digit pincode",
        },
        { status: 400 }
      );
    }

    const result = await lookupPincode(pincode);

    const payload = {
      status: "success",
      city: result.city || DEFAULT_LOCATION.city,
      district: result.district || result.city || DEFAULT_LOCATION.district || DEFAULT_LOCATION.city,
      pincode: result.pincode || pincode,
      state: result.stateName || DEFAULT_LOCATION.stateName,
      region: result.region || DEFAULT_LOCATION.region,
      code: result.code || DEFAULT_LOCATION.code,
    };

    const response = NextResponse.json(payload);

    response.cookies.set("sathya_location", JSON.stringify(payload), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Save pincode error:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "Failed to save pincode",
      },
      { status: 500 }
    );
  }
}
