import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HomeProductCarousel from "@/models/homeProductCarousel";
import HomePage from "@/models/homePage";
import Product from "@/models/product";

/**
 * GET /api/home-product-carousel?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await HomeProductCarousel.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeProductCarousel.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    if (!doc) {
      return NextResponse.json({ success: true, data: null, products: [] });
    }

    const refs = [...(doc.products || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const ids = refs.map((r) => r.productId).filter(Boolean);
    const found = ids.length
      ? await Product.find({ _id: { $in: ids }, status: "Active" })
          .select(
            "name slug images price special_price model_number item_code stock_status quantity brand movement"
          )
          .lean()
      : [];
    const byId = Object.fromEntries(found.map((p) => [String(p._id), p]));
    const products = refs
      .map((r) => byId[String(r.productId)])
      .filter(Boolean);

    return NextResponse.json({ success: true, data: doc, products });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST — save name + ordered productIds
 * Body JSON: { instanceId, pageId, name, status, productIds: [] }
 * categoryId in body is ignored when present.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { instanceId, pageId, name = "", seeAllLink = "", status = "active", productIds = [] } =
      body;

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

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, message: "Section name is required" },
        { status: 400 }
      );
    }
    const trimmedSeeAll = String(seeAllLink || "").trim();

    const products = (Array.isArray(productIds) ? productIds : [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, i) => ({
        productId: new mongoose.Types.ObjectId(id),
        order: i,
      }));

    if (products.length < 6) {
      return NextResponse.json(
        { success: false, message: "Add minimum 6 products." },
        { status: 400 }
      );
    }

    let doc = await HomeProductCarousel.findOne({ instanceId });
    if (doc) {
      doc.name = trimmedName;
      doc.seeAllLink = trimmedSeeAll;
      doc.status = status === "inactive" ? "inactive" : "active";
      doc.products = products;
      doc.pageId = page._id;
      await doc.save();
    } else {
      doc = await HomeProductCarousel.create({
        instanceId,
        pageId: page._id,
        name: trimmedName,
        seeAllLink: trimmedSeeAll,
        status: status === "inactive" ? "inactive" : "active",
        products,
      });
    }

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = trimmedName;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST home-product-carousel", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE ?instanceId=
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

    const doc = await HomeProductCarousel.findOneAndDelete({ instanceId });
    if (doc) {
      const page = await HomePage.findById(doc.pageId);
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
