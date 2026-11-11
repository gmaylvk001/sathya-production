import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HomeBannerGrid from "@/models/homeBannerGrid";
import HomePage from "@/models/homePage";
import Product from "@/models/product";
import { saveCategoryBannerGridImage } from "@/lib/categoryBannerGridUpload";

const MIN_PRODUCTS = 6;

function parseShowGap(value) {
  return value === true || value === "true" || value === "1";
}

/**
 * GET /api/home-banner-grid?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await HomeBannerGrid.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeBannerGrid.findOne({ instanceId }).lean();
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
    const ids = refs.map((ref) => ref.productId).filter(Boolean);
    const found = ids.length
      ? await Product.find({ _id: { $in: ids }, status: "Active" })
          .select(
            "name slug images price special_price model_number item_code stock_status quantity brand movement"
          )
          .lean()
      : [];
    const byId = Object.fromEntries(
      found.map((product) => [String(product._id), product])
    );
    const products = refs
      .map((ref) => byId[String(ref.productId)])
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
 * POST multipart — create or update banner grid set
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "").trim();
    const productName = String(formData.get("productName") || "").trim();
    const seeAllLink = String(formData.get("seeAllLink") || "").trim();
    const status = formData.get("status") || "active";
    const imageCountRaw = parseInt(String(formData.get("imageCount") || "4"), 10);
    const imageCount = [2, 3, 4].includes(imageCountRaw) ? imageCountRaw : 4;
    const bannersMetaRaw = formData.get("bannersMeta");
    const bannersMeta = bannersMetaRaw ? JSON.parse(String(bannersMetaRaw)) : [];
    const productIdsRaw = formData.get("productIds");
    const productIds = productIdsRaw ? JSON.parse(String(productIdsRaw)) : [];
    const showGap = parseShowGap(formData.get("showGap"));

    if (!instanceId || !pageId) {
      return NextResponse.json(
        { success: false, message: "instanceId and pageId required" },
        { status: 400 }
      );
    }

    const validProductIds = (Array.isArray(productIds) ? productIds : []).filter(
      (id) => mongoose.Types.ObjectId.isValid(id)
    );
    if (productName || validProductIds.length > 0) {
      if (!productName) {
        return NextResponse.json(
          { success: false, message: "Products name is required when products are selected" },
          { status: 400 }
        );
      }
      if (validProductIds.length < MIN_PRODUCTS) {
        return NextResponse.json(
          {
            success: false,
            message: `Add at least ${MIN_PRODUCTS} products, or leave the product section empty`,
          },
          { status: 400 }
        );
      }
    }

    const page = await HomePage.findById(pageId);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    const banners = [];
    for (let i = 0; i < imageCount; i++) {
      const meta = bannersMeta[i] || {};
      let image = meta.image || "";
      const file = formData.get(`bannerImage_${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        image = await saveCategoryBannerGridImage(file);
      }
      if (!image) {
        return NextResponse.json(
          { success: false, message: `Banner image ${i + 1} is required` },
          { status: 400 }
        );
      }
      banners.push({
        image,
        url: String(meta.url || "").trim(),
        order: i,
      });
    }

    const payload = {
      name,
      status: status === "inactive" ? "inactive" : "active",
      imageCount,
      banners,
      productName,
      seeAllLink,
      products: validProductIds.map((id, index) => ({
        productId: new mongoose.Types.ObjectId(id),
        order: index,
      })),
      showGap,
      pageId: page._id,
    };

    let doc = await HomeBannerGrid.findOne({ instanceId });
    if (doc) {
      await HomeBannerGrid.updateOne({ instanceId }, { $set: payload });
    } else {
      await HomeBannerGrid.create({
        instanceId,
        ...payload,
      });
    }

    doc = await HomeBannerGrid.findOne({ instanceId }).lean();

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST home-banner-grid", err);
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

    const doc = await HomeBannerGrid.findOneAndDelete({ instanceId });
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
