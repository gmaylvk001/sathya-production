import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OpenBoxBanner from "@/models/openboxbanner";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/adminRequest";

async function saveFile(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "openboxbanner");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return "/uploads/openboxbanner/" + filename;
  } catch (err) {
    throw err;
  }
}

// GET
export async function GET() {
  try {
    await dbConnect();
    const openBoxBanners = await OpenBoxBanner.findOne({});
    return NextResponse.json({ success: true, openBoxBanners });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST
export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const formData = await req.formData();

    let existingBanner = await OpenBoxBanner.findOne({});
    if (!existingBanner) {
      existingBanner = new OpenBoxBanner({ banners: [] });
    }

    for (let i = 1; i <= 4; i++) {
      const file = formData.get(`banner_image_${i}`);
      const redirect_url = formData.get(`redirect_url_${i}`);
      const status = formData.get(`status_${i}`) || "Active"; // 👈 per banner status

      if (!existingBanner.banners[i - 1]) {
        existingBanner.banners[i - 1] = {
          banner_image: "",
          redirect_url: "",
          order: i - 1,
          status: "Active"
        };
      }

      if (file && file.size > 0) {
        try {
          const filePath = await saveFile(file);
          if (existingBanner.banners[i - 1].banner_image) {
            const oldFilePath = path.join(process.cwd(), "public", existingBanner.banners[i - 1].banner_image);
            if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
          }
          existingBanner.banners[i - 1].banner_image = filePath;
        } catch (err) {
          return NextResponse.json({ success: false, message: err.message }, { status: 400 });
        }
      }

      if (redirect_url !== null) existingBanner.banners[i - 1].redirect_url = redirect_url;
      existingBanner.banners[i - 1].status = status; // 👈 per banner status save
    }

    existingBanner.updatedAt = new Date();
    await existingBanner.save();

    return NextResponse.json({ success: true, openBoxBanners: existingBanner });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE single banner

export async function PATCH(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { index } = await req.json();

    console.log("Deleting banner index:", index);

    const openBoxBanner = await OpenBoxBanner.findOne({});
    if (!openBoxBanner) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    // Image file delete
    if (openBoxBanner.banners[index]?.banner_image) {
      const filePath = path.join(process.cwd(), "public", openBoxBanner.banners[index].banner_image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // ✅ $set use பண்ணி specific index update
    openBoxBanner.banners[index].banner_image = "";
    openBoxBanner.banners[index].redirect_url = "";
    openBoxBanner.banners[index].status = "Active";
    openBoxBanner.markModified("banners"); 
    await openBoxBanner.save();

    return NextResponse.json({ success: true, openBoxBanners: openBoxBanner });
  } catch (err) {
    console.error("PATCH error:", err); 
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE all
export async function DELETE(req) {
  try {
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const openBoxBanner = await OpenBoxBanner.findOne({});
    if (!openBoxBanner) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    for (const banner of openBoxBanner.banners) {
      if (banner.banner_image) {
        const filePath = path.join(process.cwd(), "public", banner.banner_image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await OpenBoxBanner.deleteOne({ _id: openBoxBanner._id });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}