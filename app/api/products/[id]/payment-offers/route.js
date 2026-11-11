import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import PaymentOffer from "@/models/PaymentOffer";
import Bank from "@/models/Bank";
import {
  resolveOffersForProduct,
  getSellingPrice,
} from "@/lib/offerCalculator";

export const dynamic = "force-dynamic";

/**
 * Fast Cached API Endpoint for Payment Offers & EMI
 * Route: GET /api/products/[id]/payment-offers
 *
 * Requirements:
 * - Fast read with MongoDB .populate('bank') and lean query (.lean())
 * - Cache-Control headers: s-maxage=300, stale-while-revalidate=600
 * - Return clean structured JSON:
 *   {
 *     "bestPrice": 32375.00,
 *     "emiOffers": [...],
 *     "bankOffers": [...]
 *   }
 */
export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: "Product identifier is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // 1. Fetch Product efficiently with lean query
    const isObjectId = mongoose.isValidObjectId(id);
    const productFilter = isObjectId
      ? { $or: [{ _id: id }, { slug: id }, { item_code: id }] }
      : { $or: [{ slug: id }, { item_code: id }] };

    const product = await Product.findOne(productFilter)
      .select("_id name price special_price category sub_category item_code slug status")
      .lean();

    // Determine target product price
    let targetPrice = 0;
    let targetCategory = null;

    if (product) {
      targetPrice = getSellingPrice(product);
      targetCategory = product.category || product.sub_category || null;
    } else {
      // Fallback: check query parameter ?price=xxx
      const url = new URL(request.url);
      const queryPrice = parseFloat(url.searchParams.get("price") || "0");
      if (queryPrice > 0) {
        targetPrice = queryPrice;
      } else {
        // If product not found in DB and no price param, return 404
        return NextResponse.json(
          { error: "Product not found", id },
          { status: 404 }
        );
      }
    }

    // 2. Fetch Active Payment Offers using lean query with .populate('bank')
    const now = new Date();
    const offersQuery = {
      isActive: { $ne: false },
      status: { $nin: ["INACTIVE", "Inactive"] },
      $or: [
        { validFrom: null, validTill: null },
        { validFrom: { $lte: now }, validTill: { $gte: now } },
        { validFrom: { $lte: now }, validTill: null },
        { validFrom: null, validTill: { $gte: now } },
      ],
    };

    let rawOffers = await PaymentOffer.find(offersQuery)
      .populate({
        path: "bank",
        select: "name code shortCode logoUrl logo isActive",
      })
      .lean();

    // Resolve legacy bankId if bank was not populated
    if (Array.isArray(rawOffers) && rawOffers.length > 0) {
      const missingBankIds = rawOffers
        .filter((o) => !o.bank && o.bankId)
        .map((o) => o.bankId);

      if (missingBankIds.length > 0) {
        const banks = await Bank.find({ _id: { $in: missingBankIds } }).lean();
        const bankMap = new Map(banks.map((b) => [b._id.toString(), b]));
        rawOffers.forEach((o) => {
          if (!o.bank && o.bankId) {
            o.bank = bankMap.get(o.bankId.toString());
          }
        });
      }
    }

    // 3. Resolve best price, EMI plans, and bank discounts
    const result = resolveOffersForProduct(targetPrice, rawOffers, {
      categoryId: targetCategory,
      currentDate: now,
    });

    const responsePayload = {
      bestPrice: result.bestPrice,
      emiOffers: result.emiOffers,
      bankOffers: result.bankOffers,
      bestBankOffer: result.bestBankOffer,
      bestEmiOffer: result.bestEmiOffer,
    };

    // 4. Return with standard Cache-Control headers
    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error in /api/products/[id]/payment-offers:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
