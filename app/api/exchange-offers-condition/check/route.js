import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";
import StoreZone from "@/models/store_zones";
import StoreListing from "@/models/store_listings";
import PincodeServiceability from "@/models/PincodeServiceability";
import {
  categoryMatches,
  cityForPincodePrefix,
  collectZoneAliases,
  fieldMatches,
  zoneMatchesOffer,
  specificityScore,
} from "@/lib/exchangeOfferMatch";
import { isValidPincode, lookupPincode } from "@/lib/regionHelper";

async function resolveZonesForPincode(pincode, geo) {
  const zoneNames = [];
  const cityHint = cityForPincodePrefix(pincode) || geo?.city || "";
  const prefix3 = String(pincode).slice(0, 3);
  const prefixStart = Number(`${prefix3}000`);
  const prefixEnd = Number(`${prefix3}999`);

  const [exactListings, nearbyListings, serviceRows, namedZones] = await Promise.all([
    StoreListing.find({
      $or: [{ zipcode: Number(pincode) }, { zipcode: pincode }],
    })
      .select("zone_code zipcode title")
      .lean(),
    Number.isFinite(prefixStart)
      ? StoreListing.find({
          zipcode: { $gte: prefixStart, $lte: prefixEnd },
        })
          .select("zone_code zipcode")
          .lean()
      : Promise.resolve([]),
    PincodeServiceability.find({ serviceablePincode: String(pincode) })
      .select("branchName branchPincode sapCode")
      .lean(),
    cityHint
      ? StoreZone.find({
          zonename: {
            $regex: new RegExp(String(cityHint).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
          },
        })
          .select("zonename slug exist_id")
          .lean()
      : Promise.resolve([]),
  ]);

  const zoneCodes = [...exactListings, ...nearbyListings]
    .map((row) => row.zone_code)
    .filter((code) => code != null && code !== "");

  if (zoneCodes.length) {
    const codedZones = await StoreZone.find({
      $or: [
        { exist_id: { $in: zoneCodes.map(String) } },
        { slug: { $in: zoneCodes.map(String) } },
      ],
    })
      .select("zonename slug")
      .lean();
    zoneNames.push(...codedZones.map((z) => z.zonename || z.slug));
  }

  zoneNames.push(...namedZones.map((z) => z.zonename || z.slug));
  zoneNames.push(...serviceRows.map((row) => row.branchName).filter(Boolean));

  return collectZoneAliases({
    pincode,
    city: geo?.city,
    region: geo?.region,
    stateName: geo?.stateName,
    zoneNames,
  });
}

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const { categoryName, type, brand, condition, zone } = data;

    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: "Missing required field (categoryName)" },
        { status: 400 }
      );
    }

    const pin = String(zone || "").trim();
    if (!isValidPincode(pin)) {
      return NextResponse.json(
        {
          success: false,
          invalidPincode: true,
          error: "Please enter a valid 6-digit Indian pincode.",
        },
        { status: 400 }
      );
    }

    let geo = null;
    try {
      geo = await lookupPincode(pin);
    } catch (err) {
      console.warn("[Exchange Offer] Pincode lookup failed:", err.message);
    }

    if (!geo || geo.status !== "success" || geo.isValid === false) {
      return NextResponse.json(
        {
          success: false,
          invalidPincode: true,
          error: "This is not a valid Indian pincode. Please enter a real postal code.",
        },
        { status: 400 }
      );
    }

    const records = await ExchangeOfferCondition.find({ status: "Active" }).lean();
    const zoneAliases = await resolveZonesForPincode(pin, geo);

    const matches = records.filter((offer) => {
      return (
        categoryMatches(offer.categoryName, categoryName) &&
        fieldMatches(offer.type, type) &&
        fieldMatches(offer.brand, brand) &&
        fieldMatches(offer.condition, condition) &&
        zoneMatchesOffer(offer.zone, zoneAliases)
      );
    });

    if (!matches.length) {
      return NextResponse.json(
        { success: false, error: "No matching exchange offer found." },
        { status: 404 }
      );
    }

    matches.sort((a, b) => {
      const scoreDiff =
        specificityScore(b, { zone: pin, zoneAliases }) -
        specificityScore(a, { zone: pin, zoneAliases });
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    });

    return NextResponse.json({
      success: true,
      data: matches[0],
    });
  } catch (error) {
    console.error("Error checking Exchange Offer:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
