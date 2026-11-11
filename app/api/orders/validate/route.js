import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import StoreListing from "@/models/store_listings";
import { resolveOrderItemsFulfillment } from "@/lib/regionalFulfillment";

async function resolvePickupStoreMeta(selectedStore) {
  const codeOrId = String(selectedStore || "").trim();
  if (!codeOrId) return { storeOwner: null, storeZipcode: "" };

  const or = [{ branch_code: codeOrId }];
  if (mongoose.isValidObjectId(codeOrId)) {
    or.push({ _id: new mongoose.Types.ObjectId(codeOrId) });
  }
  const storeDoc = await StoreListing.findOne({ $or: or })
    .select("store_owner zipcode branch_code")
    .lean();

  if (!storeDoc) return { storeOwner: null, storeZipcode: "" };
  return {
    storeOwner: storeDoc.store_owner ? String(storeDoc.store_owner).trim().toLowerCase() : null,
    storeZipcode: storeDoc.zipcode ? String(storeDoc.zipcode).trim() : "",
  };
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const {
      pincode = "",
      state = "",
      region = "",
      deliveryType = "home",
      selectedStore = "",
      items = [],
    } = body || {};

    let storeOwner = null;
    let effectivePincode = String(pincode || "").replace(/\D/g, "").trim();
    if ((deliveryType === "store" || deliveryType === "store_pickup") && selectedStore) {
      const meta = await resolvePickupStoreMeta(selectedStore);
      storeOwner = meta.storeOwner;
      if (!effectivePincode && meta.storeZipcode) {
        effectivePincode = meta.storeZipcode;
      }
    }

    const result = await resolveOrderItemsFulfillment({
      pincode: effectivePincode,
      state,
      region,
      deliveryType,
      storeOwner,
      items: Array.isArray(items) ? items : [],
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/orders/validate error:", error);
    return NextResponse.json(
      {
        success: false,
        isValid: false,
        message: "Unable to validate delivery availability",
      },
      { status: 500 }
    );
  }
}

