import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SingleBannerNew from "@/models/singlebanner";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/adminRequest";

// ✅ Save File Function with 1900x400 dimension validation
async function saveFile(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        if (metadata.width !== 1900 || metadata.height !== 400) {
          throw new Error(
            `Image must be exactly 1900x400 pixels. Your image is ${metadata.width}x${metadata.height} pixels.`
          );
        }
      }
    } catch (err) {
      if (String(err.message || "").startsWith("Image must be exactly")) {
        throw err;
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "singlebanner");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    return "/uploads/singlebanner/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

// ✅ GET all banners
export async function GET() {
  try {
    await dbConnect();
    const banners = await SingleBannerNew.find({}).sort({ order: 1 });
    return NextResponse.json({ success: true, banners: banners || [] });
  } catch (err) {
    console.error("Error in GET /api/singlebanner:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST add new banner
export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const formData = await req.formData();

    const file = formData.get("banner_image");
    const redirect_url = formData.get("redirect_url");
    const status = formData.get("status") || "Active";

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!redirect_url) {
      return NextResponse.json(
        { success: false, message: "Redirect URL is required" },
        { status: 400 }
      );
    }

    let filePath;
    try {
      filePath = await saveFile(file);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 400 }
      );
    }

    const lastBanner = await SingleBannerNew.findOne().sort({ order: -1 });
    const newOrder =
      lastBanner && typeof lastBanner.order === "number" ? lastBanner.order + 1 : 1;

    const newBanner = new SingleBannerNew({
      banner_image: filePath,
      redirect_url,
      status,
      order: newOrder,
    });

    await newBanner.save();

    return NextResponse.json({ success: true, banner: newBanner });
  } catch (err) {
    console.error("POST ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ PUT update banner
export async function PUT(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const formData = await req.formData();

    const id = formData.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Banner ID is required" },
        { status: 400 }
      );
    }

    const existingBanner = await SingleBannerNew.findById(id);
    if (!existingBanner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    let updateData = { updatedAt: new Date() };

    const redirect_url = formData.get("redirect_url");
    if (redirect_url !== null) updateData.redirect_url = redirect_url;

    const status = formData.get("status");
    if (status !== null) updateData.status = status;

    const file = formData.get("banner_image");
    if (file && file.size > 0) {
      try {
        const filePath = await saveFile(file);
        updateData.banner_image = filePath;

        if (existingBanner.banner_image) {
          const oldFilePath = path.join(
            process.cwd(),
            "public",
            existingBanner.banner_image
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

    const updatedBanner = await SingleBannerNew.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return NextResponse.json({ success: true, banner: updatedBanner });
  } catch (err) {
    console.error("PUT ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH reorder banners
export async function PATCH(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { orderedIds } = await req.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, message: "orderedIds must be an array" },
        { status: 400 }
      );
    }

    await SingleBannerNew.bulkWrite(
      orderedIds.map((id, i) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: i + 1 } },
        },
      }))
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE banner
export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Banner ID is required" },
        { status: 400 }
      );
    }

    const banner = await SingleBannerNew.findById(id);
    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 }
      );
    }

    if (banner.banner_image) {
      const filePath = path.join(process.cwd(), "public", banner.banner_image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await SingleBannerNew.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
