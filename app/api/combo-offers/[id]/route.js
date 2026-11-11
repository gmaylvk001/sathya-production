import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ComboOffer from "@/models/comboOffer";
import Product from "@/models/product";
import {
  syncComboCategoryVisibility,
  upsertComboProduct,
  normalizeComboImageFilename,
} from "@/lib/comboOffers";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const combo = await ComboOffer.findById(id)
      .populate(
        "productIds",
        "name images price special_price slug item_code description product_highlights meta_title brand"
      )
      .populate("productId", "name slug status stock_status images");

    if (!combo) {
      return NextResponse.json(
        { success: false, error: "Combo offer not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: combo });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const combo = await ComboOffer.findById(id);
    if (!combo) {
      return NextResponse.json(
        { success: false, error: "Combo offer not found" },
        { status: 404 }
      );
    }

    const fields = [
      "purpose",
      "brandName",
      "companyLogo",
      "productIds",
      "name",
      "shortDescription",
      "longDescription",
      "metaTitle",
      "metaDescription",
      "metaKeywords",
      "highlights",
      "keyBenefits",
      "whyBuy",
      "tagline",
      "offerTitle",
      "ctaContent",
      "socialCaption",
      "originalPrice",
      "discountPercent",
      "offerPrice",
      "savingsAmount",
      "comboStock",
      "status",
    ];

    for (const key of fields) {
      if (body[key] !== undefined) combo[key] = body[key];
    }
    if (body.marketingImage !== undefined) {
      combo.marketingImage = normalizeComboImageFilename(body.marketingImage);
    }
    if (body.startDate) combo.startDate = new Date(body.startDate);
    if (body.endDate) combo.endDate = new Date(body.endDate);

    await combo.save();
    const product = await upsertComboProduct(combo, {
      images: combo.marketingImage ? [combo.marketingImage] : [],
    });

    return NextResponse.json({ success: true, data: combo, product });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const combo = await ComboOffer.findById(id);
    if (!combo) {
      return NextResponse.json(
        { success: false, error: "Combo offer not found" },
        { status: 404 }
      );
    }

    if (combo.productId) {
      await Product.findByIdAndUpdate(combo.productId, {
        status: "Inactive",
        stock_status: "Out of Stock",
        quantity: 0,
      });
    }

    await ComboOffer.findByIdAndDelete(id);
    await syncComboCategoryVisibility();

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
