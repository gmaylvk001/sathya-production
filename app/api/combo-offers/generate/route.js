import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import {
  generateComboContent,
  generateComboMarketingImage,
  calculateComboPricing,
} from "@/lib/comboOffers";

/**
 * POST /api/combo-offers/generate
 * Body: { productIds, purpose, brandName, companyLogo?, discountPercent?, generateImage? }
 */
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

    const products = await Product.find({ _id: { $in: productIds } }).lean();
    if (products.length < 2) {
      return NextResponse.json(
        { success: false, error: "Could not load selected products" },
        { status: 400 }
      );
    }

    // Preserve admin selection order
    const ordered = productIds
      .map((id) => products.find((p) => String(p._id) === String(id)))
      .filter(Boolean);

    const content = await generateComboContent({
      products: ordered,
      purpose: body.purpose || "",
      brandName: body.brandName || "",
    });

    const pricing = calculateComboPricing(
      ordered,
      Number(body.discountPercent) || 0
    );

    let marketingImage = "";
    if (body.generateImage !== false) {
      const productImages = ordered
        .map((p) => (Array.isArray(p.images) ? p.images[0] : null))
        .filter(Boolean);

      marketingImage = await generateComboMarketingImage({
        offerTitle: content.offerTitle || content.name,
        purpose: body.purpose || "",
        brandName: body.brandName || "",
        companyLogo: body.companyLogo || "",
        productImages,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...content,
        ...pricing,
        marketingImage,
        products: ordered.map((p) => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          special_price: p.special_price,
          images: p.images,
          slug: p.slug,
        })),
      },
    });
  } catch (error) {
    console.error("POST /api/combo-offers/generate:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
