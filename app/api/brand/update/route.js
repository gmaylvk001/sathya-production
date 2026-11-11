import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import CategoryPage from "@/models/categoryPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { writeFile, unlink } from "fs/promises";
import { requireAdmin } from "@/lib/adminRequest";

// app/api/brand/route.js
export async function PUT(req) {
  try {
    const auth = await requireAdmin(req, "brands");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    
    const formData = await req.formData();
    const id = formData.get("id");
    const brand_name = formData.get("brand_name");
    const status = formData.get("status");
    const image = formData.get("image");
    const existingImage = formData.get("existingImage");

    // Validate required fields
    if (!id || !brand_name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the existing brand
    const existingBrand = await Brand.findById(id);
    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    // Existing image name from DB
    let imagePath = existingBrand.image;

    // Upload new image
    if (image && image.name) {

      // Delete old image
      if (existingBrand.image) {
        try {
          const oldImagePath = path.join(
            process.cwd(),
            "public",
            "uploads",
            "Brands",
            path.basename(existingBrand.image)
          );

          // Check file exists
          await fs.access(oldImagePath);

          // Delete file
          await fs.unlink(oldImagePath);

        } catch (err) {
          console.log("Old image not found or already deleted");
        }
      }

      // Save new image
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(image.name);
      const fileName = `brand_${Date.now()}${ext}`;

      const newFilePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        "Brands",
        fileName
      );
      await writeFile(newFilePath, buffer);
      
      imagePath = fileName;
    }

    const brand_slug = brand_name.toLowerCase().replace(/\s+/g, "-");

    // Update the brand
    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      {
        brand_name,
        brand_slug,
        status,
        image: imagePath
      },
      { new: true }
    );

    // Sync brand page name and slug
    try {
      await CategoryPage.updateMany(
        { pageType: PAGE_TYPES.BRAND, categoryId: id },
        {
          $set: {
            categoryName: brand_name,
            categorySlug: brand_slug,
          },
        }
      );
      await CategoryPage.updateMany(
        { pageType: PAGE_TYPES.CATEGORY_BRAND, brandId: id },
        {
          $set: {
            brandName: brand_name,
            brandSlug: brand_slug,
          },
        }
      );
    } catch (syncErr) {
      console.error("Error syncing CategoryPage on brand update:", syncErr);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Brand updated successfully",
        data: updatedBrand 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}