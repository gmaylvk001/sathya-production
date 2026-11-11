import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import CategoryPage, {
  ensureCategoryPageIndexes,
} from "@/models/categoryPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "brands");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const formData = await req.formData();
    const brand_name = formData.get("brand_name");
    const status = formData.get("status") || "Active";
    const file = formData.get("image");

    if (!brand_name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    let brand_slug = brand_name.toLowerCase().replace(/\s+/g, "-");

    // Check if Brand already exists
    let existingBrand = await Brand.findOne({ brand_slug });
    if (existingBrand) {
      return NextResponse.json(
        { error: "Brand already exists" },
        { status: 400 }
      );
    }

    let image_url = "";
    if (file) {
      const uploadDir = path.join(process.cwd(), "public/uploads/Brands");
      
      // Ensure the directory exists
      await mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const ext = path.extname(file.name || "") || ".img";
      const filename = `brand-${timestamp}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      image_url = filename;
    }

    const newBrand = new Brand({
      brand_name,
      brand_slug,
      status,
      image: image_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newBrand.save();

    // Auto-create Brand Page in CategoryPage collection
    let brandPage = null;
    try {
      await ensureCategoryPageIndexes();
      brandPage = await CategoryPage.findOne({
        pageType: PAGE_TYPES.BRAND,
        categoryId: newBrand._id,
      });

      if (!brandPage) {
        brandPage = await CategoryPage.create({
          pageType: PAGE_TYPES.BRAND,
          categoryId: newBrand._id,
          categoryName: newBrand.brand_name,
          categorySlug: newBrand.brand_slug,
          brandId: null,
          brandName: "",
          brandSlug: "",
          status: "active",
          components: [],
        });
      }
    } catch (pageErr) {
      console.error("Failed to auto-create CategoryPage for brand:", pageErr);
    }

    return NextResponse.json(
      {
        message: "Brand and Brand Page added successfully",
        brand: newBrand,
        brandPageId: brandPage ? brandPage._id : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding Brand:", error);
    return NextResponse.json(
      { error: "Failed to add Brand", details: error.message },
      { status: 500 }
    );
  }
}