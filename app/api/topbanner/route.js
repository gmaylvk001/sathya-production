import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TopBanner from "@/models/topbanner";
import fs from "fs";
import path from "path";
import { normalizeRegion, SUPPORTED_REGIONS } from "@/lib/regionHelper";
import { requireAdmin } from "@/lib/adminRequest";

async function verifyAdminRequest(req) {
  return await requireAdmin(req, "banners");
}

async function saveFile(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "topbanner");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return "/uploads/topbanner/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

// ✅ GET banners with state-based filtering and fallback
export async function GET(req) {
  try {
    await dbConnect();
    const url = req?.url ? new URL(req.url) : null;
    const rawState =
      url?.searchParams.get("state") ||
      url?.searchParams.get("region") ||
      req.cookies?.get("sathya_location")?.value;
    const isAdmin = url?.searchParams.get("admin") === "true";

    let region = "tamilnadu";
    if (rawState) {
      try {
        if (rawState.startsWith("{")) {
          const parsed = JSON.parse(rawState);
          region = normalizeRegion(parsed.region || parsed.state || parsed.stateName);
        } else {
          region = normalizeRegion(rawState);
        }
      } catch {
        region = normalizeRegion(rawState);
      }
    }

    if (isAdmin) {
      const filter = rawState && rawState !== "all" ? { state: normalizeRegion(rawState) } : {};
      const banners = await TopBanner.find(filter).sort({ order: 1 }).lean();
      return NextResponse.json({ success: true, region, banners: banners || [] });
    }

    const now = new Date();
    const dateFilter = {
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $exists: false } },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $exists: false } },
            { endDate: { $gte: now } },
          ],
        },
      ],
    };

    // 1. Try matching user's specific state
    let banners = await TopBanner.find({
      status: "Active",
      state: region,
      ...dateFilter,
    }).sort({ order: 1 }).lean();

    // 2. Fallback to 'all' banners if no state-specific banner found
    if (!banners || banners.length === 0) {
      banners = await TopBanner.find({
        status: "Active",
        $or: [{ state: "all" }, { state: { $exists: false } }, { state: null }],
        ...dateFilter,
      }).sort({ order: 1 }).lean();
    }

    return NextResponse.json({
      success: true,
      region,
      banners: banners || [],
    });
  } catch (err) {
    console.error("Error in GET /api/topbanner:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST add new banner
export async function POST(req) {
  try {
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const file = formData.get("banner_image");
    const redirect_url = formData.get("redirect_url");
    const status = formData.get("status") || "Active";
    const rawState = formData.get("state") || "all";
    const state = normalizeRegion(rawState);

    if (!file || typeof file !== "object" || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Valid image file is required" },
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

    const lastBanner = await TopBanner.findOne().sort({ order: -1 });
    const newOrder =
      lastBanner && typeof lastBanner.order === "number" ? lastBanner.order + 1 : 1;

    const mobile_banner_image = formData.get("mobile_banner_image") || "";

    const startDateRaw = formData.get("startDate");
    const endDateRaw = formData.get("endDate");
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;

    const newBanner = new TopBanner({
      banner_image: filePath,
      mobile_banner_image,
      redirect_url,
      state,
      status,
      order: newOrder,
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
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
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const id = formData.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Banner ID is required" },
        { status: 400 }
      );
    }

    const existingBanner = await TopBanner.findById(id);
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

    const state = formData.get("state");
    if (state !== null) updateData.state = normalizeRegion(state);

    const mobile_banner_image = formData.get("mobile_banner_image");
    if (mobile_banner_image !== null) updateData.mobile_banner_image = mobile_banner_image;

    if (formData.has("startDate")) {
      const startDateRaw = formData.get("startDate");
      const sDate = startDateRaw ? new Date(startDateRaw) : null;
      updateData.startDate = sDate && !isNaN(sDate.getTime()) ? sDate : null;
    }

    if (formData.has("endDate")) {
      const endDateRaw = formData.get("endDate");
      const eDate = endDateRaw ? new Date(endDateRaw) : null;
      updateData.endDate = eDate && !isNaN(eDate.getTime()) ? eDate : null;
    }

    const file = formData.get("banner_image");
    if (file && typeof file === "object" && file.size > 0) {
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

    const updatedBanner = await TopBanner.findByIdAndUpdate(id, updateData, {
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

// ✅ PATCH reorder banners (bulk update, 1-based)
export async function PATCH(req) {
  try {
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { orderedIds } = await req.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, message: "orderedIds must be an array" },
        { status: 400 }
      );
    }

    await TopBanner.bulkWrite(
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
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Banner ID is required" },
        { status: 400 }
      );
    }

    const banner = await TopBanner.findById(id);
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

    await TopBanner.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
