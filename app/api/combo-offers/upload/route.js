import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import {
  calculateComboPricing,
  generateComboMarketingImage,
} from "@/lib/comboOffers";
import Product from "@/models/product";

/**
 * POST multipart:
 * - action=logo → company logo
 * - action=regenerate-image → AI/SVG marketing banner
 * - action=marketing-image → manual admin image upload
 * - action=pricing → recalculate prices
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") || "logo";

    if (action === "pricing") {
      await dbConnect();
      const productIds = JSON.parse(formData.get("productIds") || "[]");
      const discountPercent = Number(formData.get("discountPercent") || 0);
      const products = await Product.find({ _id: { $in: productIds } }).lean();
      const pricing = calculateComboPricing(products, discountPercent);
      return NextResponse.json({ success: true, data: pricing });
    }

    if (action === "regenerate-image") {
      await dbConnect();
      const productIds = JSON.parse(formData.get("productIds") || "[]");
      const products = await Product.find({ _id: { $in: productIds } }).lean();
      const productImages = products
        .map((p) => (Array.isArray(p.images) ? p.images[0] : null))
        .filter(Boolean);

      const marketingImage = await generateComboMarketingImage({
        offerTitle: formData.get("offerTitle") || "",
        purpose: formData.get("purpose") || "",
        brandName: formData.get("brandName") || "",
        companyLogo: formData.get("companyLogo") || "",
        productImages,
      });
      return NextResponse.json({ success: true, data: { marketingImage } });
    }

    if (action === "marketing-image") {
      const file = formData.get("image");
      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "No image file" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
      if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true });
      }

      const originalName = typeof file.name === "string" ? file.name : "image.png";
      const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0].toLowerCase() : ".png";
      const safeBase = String(originalName)
        .replace(/\.[^.]+$/, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 80) || "image";
      const filename = `combo-${Date.now()}-${safeBase}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!buffer.length) {
        return NextResponse.json(
          { success: false, error: "Empty image file" },
          { status: 400 }
        );
      }
      await writeFile(path.join(uploadDir, filename), buffer);

      return NextResponse.json({
        success: true,
        data: {
          // Product.images / ComboOffer.marketingImage store filename only
          marketingImage: filename,
          url: `/uploads/products/${filename}`,
        },
      });
    }

    const file = formData.get("logo");
    if (!file || typeof file.name !== "string") {
      return NextResponse.json(
        { success: false, error: "No logo file" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "combo-branding"
    );
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    const filename = `logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({
      success: true,
      data: { companyLogo: `/uploads/combo-branding/${filename}` },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
