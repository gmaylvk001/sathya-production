import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryContent from "@/models/categoryContent";
import CategoryPage from "@/models/categoryPage";

/**
 * GET /api/category-content?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await CategoryContent.findById(configId).lean();
    } else if (instanceId) {
      doc = await CategoryContent.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: doc || null });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST JSON — create or update content block
 * Body: { instanceId, pageId, name?, content, status? }
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const instanceId = body.instanceId;
    const pageId = body.pageId;
    const name = String(body.name || "").trim();
    const content = String(body.content || "").trim();
    const status = body.status === "inactive" ? "inactive" : "active";

    if (!instanceId || !pageId) {
      return NextResponse.json(
        { success: false, message: "instanceId and pageId required" },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json(
        { success: false, message: "Content is required" },
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

    const payload = {
      name,
      content,
      status,
      categoryId: page.categoryId,
      pageId: page._id,
    };

    let doc = await CategoryContent.findOne({ instanceId });
    if (doc) {
      await CategoryContent.updateOne({ instanceId }, { $set: payload });
    } else {
      await CategoryContent.create({ instanceId, ...payload });
    }

    doc = await CategoryContent.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name || "Category Content";
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST category-content", err);
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

    const doc = await CategoryContent.findOneAndDelete({ instanceId });
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
