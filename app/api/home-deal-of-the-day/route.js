import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HomeDealOfTheDay from "@/models/homeDealOfTheDay";
import HomePage from "@/models/homePage";
import Product from "@/models/product";
import {
  enrichDealProduct,
  normalizeHighlightSpecs,
} from "@/lib/dealOfTheDay";

/**
 * GET /api/home-deal-of-the-day?instanceId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await HomeDealOfTheDay.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeDealOfTheDay.findOne({ instanceId }).lean();
    } else {
      return NextResponse.json(
        { success: false, message: "instanceId or configId required" },
        { status: 400 }
      );
    }

    if (!doc) {
      return NextResponse.json({ success: true, data: null, product: null });
    }

    const product = await enrichDealProduct(doc);
    return NextResponse.json({ success: true, data: doc, product });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST — save deal config for a home page builder instance
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { instanceId, pageId } = body;

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

    if (!body.productId || !mongoose.Types.ObjectId.isValid(body.productId)) {
      return NextResponse.json(
        { success: false, message: "Select a product" },
        { status: 400 }
      );
    }

    const product = await Product.findById(body.productId).select("_id name").lean();
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    if (!body.startAt || !body.endAt) {
      return NextResponse.json(
        { success: false, message: "Start and end time are required" },
        { status: 400 }
      );
    }

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid start or end time" },
        { status: 400 }
      );
    }
    if (endAt <= startAt) {
      return NextResponse.json(
        { success: false, message: "End time must be after start time" },
        { status: 400 }
      );
    }

    const payload = {
      pageId: page._id,
      productId: body.productId,
      startAt,
      endAt,
      status: body.status === "inactive" ? "inactive" : "active",
      eyebrow: body.eyebrow ?? "DEAL OF THE DAY",
      badgeLabel: body.badgeLabel ?? "Spotlight 24H",
      bannerSubtitle: body.bannerSubtitle ?? "",
      tagline: body.tagline ?? "",
      scarcityLabel: body.scarcityLabel ?? "High Demand",
      scarcityQtyOverride:
        body.scarcityQtyOverride === "" || body.scarcityQtyOverride == null
          ? null
          : Number(body.scarcityQtyOverride),
      showScarcity: body.showScarcity !== false,
      show360Button: Boolean(body.show360Button),
      studioViewLabel: body.studioViewLabel ?? "360° Studio View",
      highlightSpecs: normalizeHighlightSpecs(body.highlightSpecs),
      deliveryHint: body.deliveryHint ?? "",
      emiHint: body.emiHint ?? "",
      primaryCtaLabel: body.primaryCtaLabel ?? "Buy Now with Express Delivery",
      secondaryCtaLabel: body.secondaryCtaLabel ?? "Add to Bag",
      dealPrice:
        body.dealPrice === "" || body.dealPrice == null
          ? null
          : Number(body.dealPrice),
      mrpPrice:
        body.mrpPrice === "" || body.mrpPrice == null
          ? null
          : Number(body.mrpPrice),
    };

    let doc = await HomeDealOfTheDay.findOne({ instanceId });
    if (doc) {
      Object.assign(doc, payload);
      await doc.save();
    } else {
      doc = await HomeDealOfTheDay.create({ instanceId, ...payload });
    }

    const instance = page.components.find((c) => c.instanceId === instanceId);
    if (instance) {
      instance.configId = doc._id;
      instance.title = product.name || "Deal of the Day";
      await page.save();
    }

    const enriched = await enrichDealProduct(doc.toObject());
    return NextResponse.json({
      success: true,
      message: "Deal of the Day saved",
      data: doc,
      product: enriched,
    });
  } catch (err) {
    console.error("home-deal-of-the-day save:", err);
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

    const doc = await HomeDealOfTheDay.findOneAndDelete({ instanceId });
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
