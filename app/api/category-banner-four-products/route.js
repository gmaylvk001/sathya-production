import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import CategoryBannerFourProducts from "@/models/categoryBannerFourProducts";
import CategoryPage from "@/models/categoryPage";
import Product from "@/models/product";
import { saveCategoryBannerFourProductsImage } from "@/lib/categoryBannerFourProductsUpload";

const MIN_TILE_COUNT = 3;
const MAX_TILE_COUNT = 4;

/**
 * GET /api/category-banner-four-products?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await CategoryBannerFourProducts.findById(configId).lean();
    } else if (instanceId) {
      doc = await CategoryBannerFourProducts.findOne({ instanceId }).lean();
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
 * POST multipart
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "").trim();
    const status = formData.get("status") || "active";
    const bannerUrl = String(formData.get("bannerUrl") || "").trim();
    const tilesBgColor = String(formData.get("tilesBgColor") || "#0d9488").trim();
    const existingBannerDesktop = String(
      formData.get("existingBannerDesktop") || ""
    );
    const existingBannerMobile = String(
      formData.get("existingBannerMobile") || ""
    );
    const tilesMetaRaw = formData.get("tilesMeta");
    const tilesMeta = tilesMetaRaw ? JSON.parse(String(tilesMetaRaw)) : [];
    const productIdsRaw = formData.get("productIds");
    const productIds = productIdsRaw ? JSON.parse(String(productIdsRaw)) : [];

    if (!instanceId || !pageId) {
      return NextResponse.json(
        { success: false, message: "instanceId and pageId required" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(tilesMeta) ||
      tilesMeta.length < MIN_TILE_COUNT ||
      tilesMeta.length > MAX_TILE_COUNT
    ) {
      return NextResponse.json(
        { success: false, message: "Choose either 3 or 4 tile images" },
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

    let bannerDesktop = existingBannerDesktop;
    let bannerMobile = existingBannerMobile;

    const deskFile = formData.get("bannerDesktop");
    const mobFile = formData.get("bannerMobile");
    if (deskFile && typeof deskFile === "object" && deskFile.size > 0) {
      bannerDesktop = await saveCategoryBannerFourProductsImage(deskFile);
    }
    if (mobFile && typeof mobFile === "object" && mobFile.size > 0) {
      bannerMobile = await saveCategoryBannerFourProductsImage(mobFile);
    }

    if (!bannerDesktop) {
      return NextResponse.json(
        { success: false, message: "Top banner image is required" },
        { status: 400 }
      );
    }

    const tiles = [];
    const tileCount = tilesMeta.length;
    for (let i = 0; i < tileCount; i++) {
      const meta = tilesMeta[i] || {};
      let image = meta.image || "";
      const file = formData.get(`tileImage_${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        image = await saveCategoryBannerFourProductsImage(file);
      }
      if (!image) {
        return NextResponse.json(
          {
            success: false,
            message: `Image ${i + 1} of ${tileCount} is required`,
          },
          { status: 400 }
        );
      }
      tiles.push({
        image,
        url: String(meta.url || "").trim(),
        order: i,
      });
    }

    const products = (Array.isArray(productIds) ? productIds : [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, i) => ({
        productId: new mongoose.Types.ObjectId(id),
        order: i,
      }));

    const payload = {
      name,
      status: status === "inactive" ? "inactive" : "active",
      bannerDesktop,
      bannerMobile: bannerMobile || bannerDesktop,
      bannerUrl,
      tilesBgColor: /^#[0-9A-Fa-f]{3,8}$/.test(tilesBgColor)
        ? tilesBgColor
        : "#0d9488",
      tiles,
      products,
      categoryId: page.categoryId,
      pageId: page._id,
    };

    let doc = await CategoryBannerFourProducts.findOne({ instanceId });
    if (doc) {
      Object.assign(doc, payload);
      await doc.save();
    } else {
      doc = await CategoryBannerFourProducts.create({
        instanceId,
        ...payload,
      });
    }

    const comp = page.components.find((c) => c.instanceId === instanceId);
    if (comp) {
      comp.configId = doc._id;
      comp.title = name;
      await page.save();
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error("POST category-banner-four-products", err);
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

    const doc = await CategoryBannerFourProducts.findOneAndDelete({
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
