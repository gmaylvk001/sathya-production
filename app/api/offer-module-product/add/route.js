import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OfferModuleProduct from "@/models/OfferModuleProduct";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    
    const productName = formData.get("productName");
    const offerId = formData.get("offerId");
    const productSellingType = formData.get("productSellingType") || "Price";
    const price = formData.get("price");
    const specialPrice = formData.get("specialPrice");
    const emiStartsFrom = formData.get("emiStartsFrom");
    const categories = formData.get("categories");
    const isCombo = formData.get("isCombo") || "No";
    const file = formData.get("primaryImage");

    if (!productName || !offerId) {
      return NextResponse.json({ success: false, error: "Product name and Offer are required" }, { status: 400 });
    }

    let image_url = "";
    if (file) {
      const uploadDir = path.join(process.cwd(), "public/uploads/OfferProducts");
      
      // Ensure the directory exists
      await mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const ext = path.extname(file.name || "") || ".img";
      const filename = `offer-product-${timestamp}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      image_url = filename;
    }

    const sellingType = ["Price", "EMI", "GIFT"].includes(productSellingType)
      ? productSellingType
      : "Price";

    const newOfferProduct = new OfferModuleProduct({
      productName,
      offerId,
      productSellingType: sellingType,
      price: sellingType === "Price" && price ? parseFloat(price) : null,
      specialPrice: sellingType === "Price" && specialPrice ? parseFloat(specialPrice) : null,
      emiStartsFrom: sellingType === "EMI" && emiStartsFrom ? parseFloat(emiStartsFrom) : null,
      categories,
      isCombo,
      primaryImage: image_url,
    });

    await newOfferProduct.save();
    return NextResponse.json({ success: true, message: "Offer Product added successfully", data: newOfferProduct }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/offer-module-product/add:", error);
    return NextResponse.json({ success: false, error: "Error adding offer product", message: error?.message }, { status: 500 });
  }
}
