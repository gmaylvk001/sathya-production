import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeSuperCategories from "@/models/homeSuperCategories";
import HomePage from "@/models/homePage";
import { saveSuperCategoryImage } from "@/lib/superCategoriesUpload";

/**
 * GET /api/home-super-categories?instanceId= | ?configId=
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
      doc = await HomeSuperCategories.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeSuperCategories.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    if (!doc) {
      return NextResponse.json({ success: true, data: null, items: [] });
    }

    let items = [...(doc.items || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    if (activeOnly) {
      if (doc.status !== "active") {
        return NextResponse.json({ success: true, data: doc, items: [] });
      }
      items = items.filter((i) => i.isActive !== false);
    }

    return NextResponse.json({ success: true, data: doc, items });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/home-super-categories
 * multipart: instanceId, pageId, name, kicker, viewAllText, viewAllUrl, status, itemsMeta JSON + image_0, image_1...
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "Explore Super-Categories").trim();
    const kicker = String(formData.get("kicker") || "DEPARTMENT MATRIX").trim();
    const viewAllText = String(formData.get("viewAllText") || "View All 84 Sub-Categories").trim();
    const viewAllUrl = String(formData.get("viewAllUrl") || "/categories").trim();
    const status = formData.get("status") || "active";

    if (!instanceId || !pageId) {
      return NextResponse.json(
        { success: false, message: "instanceId and pageId required" },
        { status: 400 }
      );
    }

    const page = await HomePage.findById(pageId);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    const metaRaw = formData.get("itemsMeta");
    const meta = metaRaw ? JSON.parse(String(metaRaw)) : [];
    const items = [];

    for (let i = 0; i < meta.length; i++) {
      const item = meta[i] || {};
      let image = item.image || "";
      const file = formData.get(`image_${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        const saved = await saveSuperCategoryImage(file);
        image = saved.path;
      }
      if (!image) continue;
      const slugVal = String(item.slug || item.url || "").trim();
      items.push({
        image,
        badgeText: String(item.badgeText || "").trim(),
        badgeColor: String(item.badgeColor || "red").trim(),
        title: String(item.title || item.imageName || "").trim(),
        subtitle: String(item.subtitle || "").trim(),
        slug: slugVal,
        url: slugVal,
        isActive: item.isActive !== false,
        order: typeof item.order === "number" ? item.order : i,
      });
    }

    let doc = await HomeSuperCategories.findOne({ instanceId });
    const payload = {
      name,
      kicker,
      viewAllText,
      viewAllUrl,
      status,
      items,
      pageId: page._id,
    };

    if (doc) {
      await HomeSuperCategories.updateOne({ instanceId }, { $set: payload });
    } else {
      await HomeSuperCategories.create({
        instanceId,
        ...payload,
      });
    }

    doc = await HomeSuperCategories.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST home-super-categories", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/home-super-categories?instanceId=
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

    const doc = await HomeSuperCategories.findOneAndDelete({ instanceId });
    const pageId = doc?.pageId;
    if (pageId) {
      const page = await HomePage.findById(pageId);
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
      await HomePage.updateOne(
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
