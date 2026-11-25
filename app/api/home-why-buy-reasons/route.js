import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeWhyBuyReasons from "@/models/homeWhyBuyReasons";
import HomePage from "@/models/homePage";
import { saveWhyBuyIconImage } from "@/lib/whyBuyReasonsUpload";

/**
 * GET /api/home-why-buy-reasons?instanceId= | ?configId=
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
      doc = await HomeWhyBuyReasons.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeWhyBuyReasons.findOne({ instanceId }).lean();
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
 * POST /api/home-why-buy-reasons
 * multipart: instanceId, pageId, name, kicker, subtitle, status, itemsMeta JSON + iconFile_0, iconFile_1...
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "Why Buy From Sathya?").trim();
    const kicker = String(formData.get("kicker") || "THE OMNICHANNEL ADVANTAGE").trim();
    const subtitle = String(formData.get("subtitle") || "").trim();
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
      let icon = item.icon || "mdi:storefront-outline";
      let iconType = item.iconType || "iconify";
      const file = formData.get(`iconFile_${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        const saved = await saveWhyBuyIconImage(file);
        icon = saved.path;
        iconType = "image";
      }

      items.push({
        icon: String(icon).trim(),
        iconType,
        iconColor: String(item.iconColor || "light_red").trim(),
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        tagText: String(item.tagText || "").trim(),
        tagColor: String(item.tagColor || "red").trim(),
        link: String(item.link || "").trim(),
        isActive: item.isActive !== false,
        order: typeof item.order === "number" ? item.order : i,
      });
    }

    let doc = await HomeWhyBuyReasons.findOne({ instanceId });
    const payload = {
      name,
      kicker,
      subtitle,
      status,
      items,
      pageId: page._id,
    };

    if (doc) {
      await HomeWhyBuyReasons.updateOne({ instanceId }, { $set: payload });
    } else {
      await HomeWhyBuyReasons.create({
        instanceId,
        ...payload,
      });
    }

    doc = await HomeWhyBuyReasons.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST home-why-buy-reasons", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/home-why-buy-reasons?instanceId=
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

    const doc = await HomeWhyBuyReasons.findOneAndDelete({ instanceId });
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
