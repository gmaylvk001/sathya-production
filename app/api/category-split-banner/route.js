import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategorySplitBanner from "@/models/categorySplitBanner";
import CategoryPage from "@/models/categoryPage";
import { saveCategorySplitBannerImage } from "@/lib/categorySplitBannerUpload";

/**
 * GET /api/category-split-banner?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");
    const activeOnly = searchParams.get("activeOnly") === "1";

    let doc = null;
    if (configId) {
      doc = await CategorySplitBanner.findById(configId).lean();
    } else if (instanceId) {
      doc = await CategorySplitBanner.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    if (!doc) {
      return NextResponse.json({ success: true, data: null, banners: [] });
    }

    let banners = [...(doc.banners || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    if (activeOnly) {
      if (doc.status !== "active") {
        return NextResponse.json({ success: true, data: doc, banners: [] });
      }
    }

    return NextResponse.json({ success: true, data: doc, banners });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/category-split-banner
 * multipart: instanceId, pageId, status, bannerCount, bannersMeta + image_0, image_1
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const status = formData.get("status") || "active";
    const bannerCount = Number(formData.get("bannerCount")) === 2 ? 2 : 1;

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

    const metaRaw = formData.get("bannersMeta");
    const meta = metaRaw ? JSON.parse(String(metaRaw)) : [];
    const banners = [];

    for (let i = 0; i < bannerCount; i++) {
      const item = meta[i] || {};
      let image = item.image || "";
      const file = formData.get(`image_${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        image = await saveCategorySplitBannerImage(file);
      }
      if (!image) continue;
      banners.push({
        image,
        url: item.url || "",
        order: i,
      });
    }

    if (banners.length < bannerCount) {
      return NextResponse.json(
        {
          success: false,
          message:
            bannerCount === 1
              ? "Please upload 1 banner image."
              : "Please upload both left and right banner images.",
        },
        { status: 400 }
      );
    }

    const title = bannerCount === 2 ? "Double Banner" : "Single Banner";
    const payload = {
      bannerCount,
      status,
      banners,
      categoryId: page.categoryId,
      pageId: page._id,
    };

    let doc = await CategorySplitBanner.findOne({ instanceId });
    if (doc) {
      await CategorySplitBanner.updateOne({ instanceId }, { $set: payload });
    } else {
      await CategorySplitBanner.create({ instanceId, ...payload });
    }

    doc = await CategorySplitBanner.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = title;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST category-split-banner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/category-split-banner?instanceId=
 */
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

    const doc = await CategorySplitBanner.findOneAndDelete({ instanceId });
    const pageId = doc?.pageId;
    if (pageId) {
      const page = await CategoryPage.findById(pageId);
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
