import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryImageHotspotBanner from "@/models/categoryImageHotspotBanner";
import CategoryPage from "@/models/categoryPage";
import { saveCategoryImageHotspotBannerImage } from "@/lib/categoryImageHotspotBannerUpload";

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function normalizeHotspots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((h, i) => {
    let x = clamp(h.x, 0, 100);
    let y = clamp(h.y, 0, 100);
    let width = clamp(h.width, 0.5, 100);
    let height = clamp(h.height, 0.5, 100);
    if (x + width > 100) width = Math.max(0.5, 100 - x);
    if (y + height > 100) height = Math.max(0.5, 100 - y);
    return {
      id: String(h.id || `hs-${i}-${Date.now()}`),
      label: String(h.label || "").trim(),
      link: String(h.link || "").trim(),
      openInNewTab: Boolean(h.openInNewTab),
      isActive: h.isActive !== false,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      order: typeof h.order === "number" ? h.order : i,
    };
  });
}

/**
 * GET /api/category-image-hotspot-banner?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await CategoryImageHotspotBanner.findById(configId).lean();
    } else if (instanceId) {
      doc = await CategoryImageHotspotBanner.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    if (!doc) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST multipart — banner image + hotspot regions (JSON)
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "").trim();
    const status = formData.get("status") || "active";
    const existingBannerImage = String(
      formData.get("existingBannerImage") || ""
    );
    const hotspotsRaw = formData.get("hotspots");
    const hotspots = normalizeHotspots(
      hotspotsRaw ? JSON.parse(String(hotspotsRaw)) : []
    );

    if (!instanceId || !pageId) {
      return NextResponse.json(
        { success: false, message: "instanceId and pageId required" },
        { status: 400 }
      );
    }

    const page = await CategoryPage.findById(pageId);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    let bannerImage = existingBannerImage;
    const file = formData.get("bannerImage");
    if (file && typeof file === "object" && file.size > 0) {
      bannerImage = await saveCategoryImageHotspotBannerImage(file);
    }

    if (!bannerImage) {
      return NextResponse.json(
        { success: false, message: "Banner image is required" },
        { status: 400 }
      );
    }

    const payload = {
      name,
      status: status === "inactive" ? "inactive" : "active",
      bannerImage,
      hotspots,
      categoryId: page.categoryId,
      pageId: page._id,
    };

    let doc = await CategoryImageHotspotBanner.findOne({ instanceId });
    if (doc) {
      await CategoryImageHotspotBanner.updateOne(
        { instanceId },
        { $set: payload }
      );
    } else {
      await CategoryImageHotspotBanner.create({
        instanceId,
        ...payload,
      });
    }

    doc = await CategoryImageHotspotBanner.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST category-image-hotspot-banner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const instanceId = new URL(req.url).searchParams.get("instanceId");
    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: "instanceId required" },
        { status: 400 }
      );
    }

    const doc = await CategoryImageHotspotBanner.findOneAndDelete({
      instanceId,
    });
    if (doc) {
      const page = await CategoryPage.findById(doc.pageId);
      if (page) {
        page.components = page.components.filter(
          (c) => c.instanceId !== instanceId
        );
        page.components
          .sort((a, b) => a.order - b.order)
          .forEach((c, i) => {
            c.order = i;
          });
        await page.save();
      }
    } else {
      await CategoryPage.updateOne(
        { "components.instanceId": instanceId },
        { $pull: { components: { instanceId } } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
