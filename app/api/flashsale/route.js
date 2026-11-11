import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import FlashSale from "@/models/flashsale";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Save File Function with Dimension Validation
async function saveFile(file, width, height) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width !== width || metadata.height !== height) {
          throw new Error(
            `Image must be exactly ${width}x${height} pixels. Your image is ${metadata.width}x${metadata.height} pixels.`
          );
        }
      }
    } catch (err) {
      if (String(err.message || "").startsWith("Image must be exactly")) {
        throw err;
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "flashsale");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    return "/uploads/flashsale/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

// GET all flash sales
export async function GET() {
  try {
    await dbConnect();
    const flashSales = await FlashSale.find({});
    return NextResponse.json({ success: true, flashSales: flashSales || [] });
  } catch (err) {
    console.error("Error in GET /api/flashsale:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// POST add new flash sale
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const background_image = formData.get("background_image");
    const banner_image = formData.get("banner_image");
    const title = formData.get("title");
    const redirect_url = formData.get("redirect_url");
    //const redirect_url2 = formData.get("redirect_url2");
    const status = formData.get("status") || "Active";

    if (!background_image || background_image.size === 0 || !banner_image || banner_image.size === 0) {
      return NextResponse.json(
        { success: false, message: "Both images are required" },
        { status: 400 }
      );
    }

    if (!title || !redirect_url ) {
      return NextResponse.json(
        { success: false, message: "Title and both redirect URLs are required" },
        { status: 400 }
      );
    }

    let backgroundImagePath, bannerImagePath;
    try {
      backgroundImagePath = await saveFile(background_image, 429, 250);
      bannerImagePath = await saveFile(banner_image, 260, 240);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 400 }
      );
    }

    const newFlashSale = new FlashSale({
      background_image: backgroundImagePath,
      banner_image: bannerImagePath,
      title,
       redirect_url, 
     
      status,
    });

    await newFlashSale.save();

    return NextResponse.json({ success: true, flashSale: newFlashSale });
  } catch (err) {
    console.error("POST ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// PUT update flash sale
export async function PUT(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const id = formData.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Flash Sale ID is required" },
        { status: 400 }
      );
    }

    const existingFlashSale = await FlashSale.findById(id);
    if (!existingFlashSale) {
      return NextResponse.json(
        { success: false, message: "Flash Sale not found" },
        { status: 404 }
      );
    }

    let updateData = { updatedAt: new Date() };

    const title = formData.get("title");
    if (title !== null) updateData.title = title;

    const redirect_url = formData.get("redirect_url");
if (redirect_url !== null) updateData.redirect_url = redirect_url;

    

    const status = formData.get("status");
    if (status !== null) updateData.status = status;

    const background_image = formData.get("background_image");
    if (background_image && background_image.size > 0) {
      try {
        const backgroundImagePath = await saveFile(background_image, 429, 250);
        updateData.background_image = backgroundImagePath;

        if (existingFlashSale.background_image) {
          const oldFilePath = path.join(
            process.cwd(),
            "public",
            existingFlashSale.background_image
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      } catch (err) {
        return NextResponse.json(
          { success: false, message: err.message },
          { status: 400 }
        );
      }
    }

    const banner_image = formData.get("banner_image");
    if (banner_image && banner_image.size > 0) {
      try {
        const bannerImagePath = await saveFile(banner_image, 260, 240);
        updateData.banner_image = bannerImagePath;

        if (existingFlashSale.banner_image) {
          const oldFilePath = path.join(
            process.cwd(),
            "public",
            existingFlashSale.banner_image
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      } catch (err) {
        return NextResponse.json(
          { success: false, message: err.message },
          { status: 400 }
        );
      }
    }

    const updatedFlashSale = await FlashSale.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return NextResponse.json({ success: true, flashSale: updatedFlashSale });
  } catch (err) {
    console.error("PUT ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// DELETE flash sale
export async function DELETE(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Flash Sale ID is required" },
        { status: 400 }
      );
    }

    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return NextResponse.json(
        { success: false, message: "Flash Sale not found" },
        { status: 404 }
      );
    }

    // Delete image files
    if (flashSale.background_image) {
      const filePath = path.join(process.cwd(), "public", flashSale.background_image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (flashSale.banner_image) {
      const filePath = path.join(process.cwd(), "public", flashSale.banner_image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await FlashSale.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Flash Sale deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}