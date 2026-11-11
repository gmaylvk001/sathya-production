import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ComboOffer from "@/models/comboOffer";
import {
  syncComboCategoryVisibility,
  isComboStorefrontVisible,
  syncComboLifecycleStatus,
  normalizeComboImageFilename,
  upsertComboProduct,
} from "@/lib/comboOffers";

export async function GET(req) {
  try {
    await dbConnect();
    await syncComboCategoryVisibility();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const storefront = searchParams.get("storefront") === "1";

    const query = {};
    if (status) query.status = status;

    const combos = await ComboOffer.find(query)
      .populate("productIds", "name images price special_price slug item_code")
      .populate("productId", "name slug status stock_status images")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const enriched = combos.map((c) => {
      const lifecycle = syncComboLifecycleStatus(c, now);
      return {
        ...c,
        lifecycleStatus: lifecycle,
        storefrontVisible: isComboStorefrontVisible(
          { ...c, status: lifecycle },
          now
        ),
      };
    });

    const list = storefront
      ? enriched.filter((c) => c.storefrontVisible)
      : enriched;

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("GET /api/combo-offers:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const productIds = body.productIds || [];
    if (!Array.isArray(productIds) || productIds.length < 2) {
      return NextResponse.json(
        { success: false, error: "Select at least 2 products" },
        { status: 400 }
      );
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Start and end dates are required" },
        { status: 400 }
      );
    }
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Combo product name is required" },
        { status: 400 }
      );
    }

    const combo = await ComboOffer.create({
      purpose: body.purpose || "",
      brandName: body.brandName || "",
      companyLogo: body.companyLogo || "",
      productIds,
      name: body.name,
      shortDescription: body.shortDescription || "",
      longDescription: body.longDescription || "",
      metaTitle: body.metaTitle || "",
      metaDescription: body.metaDescription || "",
      metaKeywords: body.metaKeywords || "",
      highlights: body.highlights || [],
      keyBenefits: body.keyBenefits || [],
      whyBuy: body.whyBuy || "",
      tagline: body.tagline || "",
      offerTitle: body.offerTitle || "",
      ctaContent: body.ctaContent || "",
      socialCaption: body.socialCaption || "",
      marketingImage: normalizeComboImageFilename(body.marketingImage || ""),
      originalPrice: Number(body.originalPrice) || 0,
      discountPercent: Number(body.discountPercent) || 0,
      offerPrice: Number(body.offerPrice) || 0,
      savingsAmount: Number(body.savingsAmount) || 0,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      comboStock: Number(body.comboStock) || 0,
      status: body.publish === false ? "draft" : "active",
    });

    const product = await upsertComboProduct(combo, {
      images: combo.marketingImage ? [combo.marketingImage] : [],
    });

    return NextResponse.json(
      { success: true, data: combo, product },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/combo-offers:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
