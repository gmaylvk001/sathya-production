import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryBanner from "@/models/categorybanner";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/adminRequest";

// ✅ Save File Function with Dimension Validation (801x704)
async function saveFile(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width !== 801 || metadata.height !== 704) {
          throw new Error(
            `Image must be exactly 801x704 pixels. Your image is ${metadata.width}x${metadata.height} pixels.`
          );
        }
      }
    } catch (err) {
      if (String(err.message || "").startsWith("Image must be exactly")) {
        throw err;
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "categorybanner");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    return "/uploads/categorybanner/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

// ✅ GET category banners
export async function GET() {
  try {
    await dbConnect();
    const categoryBanners = await CategoryBanner.findOne({});
    return NextResponse.json({ success: true, categoryBanners: categoryBanners || null });
  } catch (err) {
    console.error("Error in GET /api/categorybanner:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST create or update category banners
export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const formData = await req.formData();

    // Check if we already have a category banner document
    let existingBanner = await CategoryBanner.findOne({});
    
    // If it doesn't exist, create a new one
    if (!existingBanner) {
      existingBanner = new CategoryBanner({
        banners: Array(4).fill({ banner_image: "", redirect_url: "", order: 0 }),
        status: "Active"
      });
    }

    // Process all 4 banners
    for (let i = 1; i <= 4; i++) {
      const file = formData.get(`banner_image_${i}`);
      const redirect_url = formData.get(`redirect_url_${i}`);
      
      // Initialize banner if it doesn't exist
      if (!existingBanner.banners[i-1]) {
        existingBanner.banners[i-1] = {
          banner_image: "",
          redirect_url: "",
          order: i-1
        };
      }
      
      if (file && file.size > 0) {
        try {
          const filePath = await saveFile(file);
          
          // Delete old image if exists
          if (existingBanner.banners[i-1].banner_image) {
            const oldFilePath = path.join(
              process.cwd(),
              "public",
              existingBanner.banners[i-1].banner_image
            );
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }
          
          existingBanner.banners[i-1].banner_image = filePath;
        } catch (err) {
          return NextResponse.json(
            { success: false, message: err.message },
            { status: 400 }
          );
        }
      }
      
      // Always update the redirect URL
      if (redirect_url !== null) {
        existingBanner.banners[i-1].redirect_url = redirect_url;
      }
    }

    // Update status if provided
    const status = formData.get("status");
    if (status) {
      existingBanner.status = status;
    }

    existingBanner.updatedAt = new Date();
    await existingBanner.save();

    return NextResponse.json({ success: true, categoryBanners: existingBanner });
  } catch (err) {
    console.error("POST ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE category banner
export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    
    const categoryBanner = await CategoryBanner.findOne({});
    if (!categoryBanner) {
      return NextResponse.json(
        { success: false, message: "Category banner not found" },
        { status: 404 }
      );
    }

    // Delete all banner images
    for (const banner of categoryBanner.banners) {
      if (banner.banner_image) {
        const filePath = path.join(process.cwd(), "public", banner.banner_image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await CategoryBanner.deleteOne({ _id: categoryBanner._id });
    
    return NextResponse.json({ success: true, message: "Category banner deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}