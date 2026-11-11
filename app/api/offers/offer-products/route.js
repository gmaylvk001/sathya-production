import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Offer from "@/models/ecom_offer_info";
import Product from "@/models/product";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';

const extractToken = (req) => {
  const authHeader = req.headers.get("authorization");
  return authHeader?.split(" ")[1];
};

const verifyToken = (token) => {
  if (!token) throw new Error("Authorization token required");
   try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else {
      throw new Error("Invalid token");
    }
  }
};

// Date-only helpers (UTC) to ignore time/timezone in comparisons
const toDateOnlyUTC = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
const getFirst = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};
const isOfferActiveToday = (offer, today = todayUTC()) => {
  const fromRaw = getFirst(offer, [
    "from_date", "fromDate", "start_date", "startDate",
    "valid_from", "offer_from_date"
  ]);
  const toRaw = getFirst(offer, [
    "to_date", "toDate", "end_date", "endDate",
    "valid_to", "offer_to_date"
  ]);

  const from = toDateOnlyUTC(fromRaw);
  const to = toDateOnlyUTC(toRaw);

  const afterFrom = from ? today >= from : true;
  const beforeTo = to ? today <= to : true;

  return afterFrom && beforeTo;
};

// Normalize an offer to a consistent response shape with real status
const normalizeOfferForResponse = (offer) => {
  const pct = Number(offer.percentage ?? offer.percent ?? offer.discountValue ?? 0) || 0;
  const fixed = Number(offer.fixed_price ?? offer.fixed ?? offer.amount ?? 0) || 0;
  const offer_type = pct > 0 ? "percentage" : (fixed > 0 ? "fixed_price" : "");
  const status = String(offer.fest_offer_status || offer.status || "").toLowerCase();

  return {
    id: String(offer._id || ""),
    offer_code: String(offer.offer_code || ""),
    offer_type,
    percentage: pct > 0 ? pct : 0,
    fixed_price: fixed > 0 ? fixed : 0,
    offer_product: Array.isArray(offer.offer_product) ? offer.offer_product.map(String) : [],
    fest_offer_status: status, // expose canonical field
    status // also expose generic "status" for clients already using it
  };
};

export async function GET(req) {
  try {
    const token = extractToken(req);
    // Make token optional for read-only code listing; keep for other flows
    let decoded = null;
    let userId = null;
    try {
      if (token) {
        decoded = verifyToken(token);
        // Replace deprecated constructor with createFromHexString
        userId = mongoose.Types.ObjectId.createFromHexString(String(decoded.userId));
      }
    } catch {
      // guest / invalid token: proceed for code listing, restrict where needed later
      decoded = null;
      userId = null;
    }

    await connectDB();

    // Parse optional query params
    const { searchParams } = new URL(req.url);
    const enteredCode = (searchParams.get("code") || "").trim().toLowerCase();
    const offerId = (searchParams.get("offerId") || "").trim();
    const listActiveCodes = ["1", "true", "yes"].includes(
      (searchParams.get("listActiveCodes") || "").toLowerCase()
    );

    // If listActiveCodes requested, query DB for offers that are active + date-valid today
    if (listActiveCodes) {
      try {
        const today = new Date();

        // Match offers that are active in both status fields and whose date window includes today.
        // Treat missing from_date or to_date as open-ended (i.e., valid).
        const query = {
          $and: [
            { fest_offer_status: { $regex: /^active$/i } },
            { fest_offer_status2: { $regex: /^active$/i } },
            {
              $or: [
                { from_date: { $lte: today } },
                { from_date: { $exists: false } },
                { from_date: null }
              ]
            },
            {
              $or: [
                { to_date: { $gte: today } },
                { to_date: { $exists: false } },
                { to_date: null }
              ]
            }
          ]
        };

        const activeOffers = await Offer.find(query).lean();

        const codes = [
          ...new Set(
            activeOffers
              .map((o) => String(o.offer_code || "").trim())
              .filter(Boolean)
          ),
        ];

        const offers = activeOffers.map((o) => {
          const pct = Number(o.percentage ?? o.percent ?? o.discountValue ?? 0) || 0;
          const fixed = Number(o.fixed_price ?? o.fixed ?? o.amount ?? 0) || 0;
          return {
            code: String(o.offer_code || "").trim(),
            percentage: pct > 0 ? pct : 0,
            fixed_price: fixed > 0 ? fixed : 0,
            from_date: o.from_date ?? o.fromDate ?? o.valid_from ?? null,
            to_date: o.to_date ?? o.toDate ?? o.valid_to ?? null,
          };
        }).filter(x => x.code);

        if (!offers.length) {
          return NextResponse.json({ success: true, codes: [], offers: [], message: "No active offers" });
        }

        return NextResponse.json({ success: true, codes, offers });
      } catch (err) {
        console.error("Error fetching active codes:", err);
        return NextResponse.json(
          { success: false, codes: [], offers: [], message: "Failed to fetch active offers" },
          { status: 500 }
        );
      }
    }

    // Fetch ALL offers (we'll filter per use-case below)
    const allOffers = await Offer.find({});

    // New: return all offer_code where both fest_offer_status2 and fest_offer_status are active
    if (listActiveCodes) {
      const active = allOffers.filter(
        (o) =>
          String(o.fest_offer_status2 || "").toLowerCase() === "active" &&
          String(o.fest_offer_status || "").toLowerCase() === "active"
      );

      const codes = [
        ...new Set(
          active
            .map((o) => String(o.offer_code || "").trim())
            .filter(Boolean)
        ),
      ];

      // Also return offer details for UI cards
      const offers = active.map((o) => {
        const pct = Number(o.percentage ?? o.percent ?? o.discountValue ?? 0) || 0;
        const fixed = Number(o.fixed_price ?? o.fixed ?? o.amount ?? 0) || 0;
        return {
          code: String(o.offer_code || "").trim(),
          percentage: pct > 0 ? pct : 0,
          fixed_price: fixed > 0 ? fixed : 0,
        };
      }).filter(x => x.code);

      return NextResponse.json({ success: true, codes, offers });
    }

    if (!allOffers.length) {
      return NextResponse.json({
        success: false,
        hasActiveOfferProduct: false,
        message: "No offers found"
      });
    }

    // Active users (current user) - only if we have a decoded user
    const activeUsers = userId
      ? await User.find({ "_id": userId, status: "Active" }).select('_id')
      : [];

    const allowedForUser = (offer) => {
      if (!offer.selected_users || offer.selected_users.length === 0) return true;
      if (!activeUsers.length) return false; // no logged-in user -> not allowed for selected lists
      return offer.selected_users.some(selUserId =>
        activeUsers.some(activeUser => activeUser._id.equals(selUserId))
      );
    };

    // 1) Fetch single offer by ID for Edit Offer form initialization
    if (offerId) {
      if (!mongoose.Types.ObjectId.isValid(offerId)) {
        return NextResponse.json({
          success: false,
          message: "Invalid offerId"
        }, { status: 400 });
      }
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return NextResponse.json({
          success: false,
          message: "Offer not found"
        }, { status: 404 });
      }
      // You may restrict access if needed; currently we only ensure user token is valid.
      const normalized = normalizeOfferForResponse(offer);
      return NextResponse.json({
        success: true,
        offer: normalized
      });
    }

    // Offers for product listing: active + date-valid + allowed for user
    const offersForProducts = allOffers.filter(o =>
      String(o.fest_offer_status || "").toLowerCase() === "active" &&
      isOfferActiveToday(o) &&
      allowedForUser(o)
    );

    // Get all unique product IDs from valid product offers
    const productIds = [];
    offersForProducts.forEach(offer => {
      if (offer.offer_product && offer.offer_product.length) {
        productIds.push(...offer.offer_product);
      }
    });

    let offerProducts = [];
    if (productIds.length) {
      const products = await Product.find({
        _id: { $in: productIds },
        status: "Active"
      }).select('_id name slug price special_price images item_code');

      // Map products with their best offer
      offerProducts = products.map(product => {
        const pidStr = product._id.toString();
        const productOffers = offersForProducts.filter(offer => {
          const ids = (offer.offer_product || []).map(id => id.toString());
          return ids.includes(pidStr);
        });

        const bestOffer = productOffers.reduce((best, current) => {
          if (current.offer_type === 'percentage') {
            return (!best || Number(current.percentage) > Number(best.percentage)) ? current : best;
          } else if (current.offer_type === 'fixed' || current.offer_type === 'fixed_price') {
            return (!best || Number(current.fixed_price) < Number(best.fixed_price)) ? current : best;
          }
          return best;
        }, null);

        let finalPrice = product.price;
        if (bestOffer) {
          if (bestOffer.offer_type === 'percentage') {
            finalPrice = product.price * (1 - Number(bestOffer.percentage) / 100);
          } else if (bestOffer.offer_type === 'fixed' || bestOffer.offer_type === 'fixed_price') {
            finalPrice = Number(bestOffer.fixed_price);
          }
        }

        return {
          ...product.toObject(),
          price: Number(finalPrice).toFixed(2),
          special_price: product.special_price || null
        };
      });
    }

    const hasActiveOfferProduct = offerProducts.length > 0;

    // 2) If code is provided, validate and return normalized coupon WITH REAL STATUS
    if (enteredCode) {
      // Allow lookup regardless of active status or date; still restrict to user visibility
      const match = allOffers.find(o =>
        String(o.offer_code || "").toLowerCase() === enteredCode && allowedForUser(o)
      );

      const normalizeOffer = (offer) => normalizeOfferForResponse(offer);

      if (!match) {
        return NextResponse.json({
          success: true,
          hasActiveOfferProduct,
          validOffer: false,
          message: "Invalid or inaccessible offer code"
        });
      }

      const coupon = normalizeOffer(match);

      // Always return the coupon with its true status so clients can render toggle correctly.
      // Client-side can still reject applying if status !== "active".
      return NextResponse.json({
        success: true,
        hasActiveOfferProduct,
        validOffer: false,
        coupon
      });
    }

    // 3) Default response without code validation
    return NextResponse.json({
      success: true,
      hasActiveOfferProduct,
      data: offerProducts
    });
  } catch (err) {
    console.error("Error fetching offer products:", err);
    return NextResponse.json(
      { success: false, hasActiveOfferProduct: false, error: "Failed to fetch offer products" },
      { status: 500 }
    );
  }
}

// Persist Offer status changes from the Edit Offer toggle
export async function PATCH(req) {
  try {
    const token = extractToken(req);
    verifyToken(token);
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { offerId, status } = body;

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      return NextResponse.json({ success: false, message: "Invalid or missing offerId" }, { status: 400 });
    }
    if (!status || !["active", "inactive"].includes(String(status).toLowerCase())) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const normalizedStatus = String(status).toLowerCase();

    const updated = await Offer.findByIdAndUpdate(
      offerId,
      { 
        fest_offer_status: normalizedStatus,
        fest_offer_status2: normalizedStatus // NEW: keep in sync
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      offer: normalizeOfferForResponse(updated)
    });
  } catch (err) {
    console.error("Error updating offer status:", err);
    return NextResponse.json({ success: false, message: "Failed to update offer status" }, { status: 500 });
  }
}