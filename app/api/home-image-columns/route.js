import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeImageColumns from "@/models/homeImageColumns";
import HomePage from "@/models/homePage";
import { saveCategoryImageColumnsImage } from "@/lib/categoryImageColumnsUpload";

const VALID_LAYOUTS = ["center_big", "left_big", "right_big"];

const LAYOUT_SLOTS = {
  center_big: ["tl", "bl", "center", "tr", "br"],
  left_big: ["left", "c1", "c2", "tr", "br"],
  right_big: ["tl", "bl", "c1", "c2", "right"],
};

function parseShowGap(value) {
  return value === true || value === "true" || value === "1";
}

/**
 * GET /api/home-image-columns?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await HomeImageColumns.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeImageColumns.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
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
 * POST multipart — create or update image columns set
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "").trim();
    const status = formData.get("status") || "active";
    const layoutRaw = String(formData.get("layout") || "center_big");
    const layout = VALID_LAYOUTS.includes(layoutRaw) ? layoutRaw : "center_big";
    const imagesMetaRaw = formData.get("imagesMeta");
    const imagesMeta = imagesMetaRaw ? JSON.parse(String(imagesMetaRaw)) : [];
    const showGap = parseShowGap(formData.get("showGap"));

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

    const expectedSlots = LAYOUT_SLOTS[layout];
    const existing = await HomeImageColumns.findOne({ instanceId });
    const existingBySlot = Object.fromEntries(
      (existing?.images || []).map((img) => [img.slot, img])
    );

    const images = [];
    for (let i = 0; i < expectedSlots.length; i++) {
      const slot = expectedSlots[i];
      const meta = Array.isArray(imagesMeta)
        ? imagesMeta.find((m) => m.slot === slot) || imagesMeta[i] || {}
        : {};
      const file = formData.get(`image_${slot}`) || formData.get(`image_${i}`);
      let imagePath = String(meta.existingImage || existingBySlot[slot]?.image || "");

      if (file && typeof file === "object" && typeof file.arrayBuffer === "function") {
        imagePath = await saveCategoryImageColumnsImage(file);
      }

      if (!imagePath) {
        return NextResponse.json(
          {
            success: false,
            message: `Image required for slot "${slot}" (${i + 1} of ${expectedSlots.length})`,
          },
          { status: 400 }
        );
      }

      images.push({
        image: imagePath,
        url: String(meta.url || "").trim(),
        slot,
        order: i,
      });
    }

    const payload = {
      pageId: page._id,
      instanceId,
      name,
      layout,
      showGap,
      images,
      status: status === "inactive" ? "inactive" : "active",
    };

    let doc;
    if (existing) {
      Object.assign(existing, payload);
      doc = await existing.save();
    } else {
      doc = await HomeImageColumns.create(payload);
    }

    const inst = page.components.find((c) => c.instanceId === instanceId);
    if (inst) {
      inst.configId = doc._id;
      inst.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc.toObject() });
  } catch (err) {
    console.error("home-image-columns POST:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/home-image-columns?instanceId=
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

    const doc = await HomeImageColumns.findOneAndDelete({ instanceId });
    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Config not found" },
        { status: 404 }
      );
    }

    const page = await HomePage.findById(doc.pageId);
    if (page) {
      page.components = page.components.filter(
        (c) => c.instanceId !== instanceId
      );
      page.components.forEach((c, i) => {
        c.order = i;
      });
      await page.save();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
