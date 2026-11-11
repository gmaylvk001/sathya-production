import { NextResponse } from "next/server";
import { DEFAULT_LOCATION } from "@/lib/regionHelper";

export async function GET(req) {
  try {
    const cookieHeader = req.cookies.get("sathya_location")?.value;
    if (cookieHeader) {
      try {
        const parsed = JSON.parse(cookieHeader);
        if (parsed && parsed.pincode) {
          return NextResponse.json({
            status: "success",
            pincode: parsed.pincode,
            city: parsed.city || DEFAULT_LOCATION.city,
            state: parsed.state || parsed.stateName || DEFAULT_LOCATION.stateName,
            region: parsed.region || DEFAULT_LOCATION.region,
            code: parsed.code || DEFAULT_LOCATION.code,
          });
        }
      } catch {
        // ignore parse failure
      }
    }

    return NextResponse.json({
      status: "fallback",
      message: "No custom pincode found in session",
      ...DEFAULT_LOCATION,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "Failed to retrieve pincode",
        ...DEFAULT_LOCATION,
      },
      { status: 500 }
    );
  }
}
