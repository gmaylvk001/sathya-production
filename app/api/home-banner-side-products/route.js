import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import HomeBannerSideProducts from "@/models/homeBannerSideProducts";
import HomePage from "@/models/homePage";
import Product from "@/models/product";
import { saveCategoryBannerSideProductsImage } from "@/lib/categoryBannerSideProductsUpload";

/**
 * GET /api/home-banner-side-products?instanceId= | ?configId=
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const configId = searchParams.get("configId");

    let doc = null;
    if (configId) {
      doc = await HomeBannerSideProducts.findById(configId).lean();
    } else if (instanceId) {
      doc = await HomeBannerSideProducts.findOne({ instanceId }).lean();
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

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

/**
 * POST multipart — save banners + products
 */
export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const instanceId = formData.get("instanceId");
    const pageId = formData.get("pageId");
    const name = String(formData.get("name") || "").trim();
    const status = formData.get("status") || "active";
    const mainBannerUrl = String(formData.get("mainBannerUrl") || "").trim();
    const sideBannerUrl = String(formData.get("sideBannerUrl") || "").trim();
    const sideBannerPosition =
      formData.get("sideBannerPosition") === "right" ? "right" : "left";
    const existingMainDesktop = String(
      formData.get("existingMainBannerDesktop") || ""
    );
    const existingMainMobile = String(
      formData.get("existingMainBannerMobile") || ""
    );
    const existingSideImage = String(formData.get("existingSideBannerImage") || "");
    const productIdsRaw = formData.get("productIds");
    const productIds = productIdsRaw ? JSON.parse(String(productIdsRaw)) : [];

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

    let mainBannerDesktop = existingMainDesktop;
    let mainBannerMobile = existingMainMobile;
    let sideBannerImage = existingSideImage;

    const mainDesktopFile = formData.get("mainBannerDesktop");
    const mainMobileFile = formData.get("mainBannerMobile");
    const sideFile = formData.get("sideBannerImage");

    if (
      mainDesktopFile &&
      typeof mainDesktopFile === "object" &&
      mainDesktopFile.size > 0
    ) {
      mainBannerDesktop = await saveCategoryBannerSideProductsImage(
        mainDesktopFile
      );
    }
    if (
      mainMobileFile &&
      typeof mainMobileFile === "object" &&
      mainMobileFile.size > 0
    ) {
      mainBannerMobile = await saveCategoryBannerSideProductsImage(
        mainMobileFile
      );
    }
    if (sideFile && typeof sideFile === "object" && sideFile.size > 0) {
      sideBannerImage = await saveCategoryBannerSideProductsImage(sideFile);
    }

    if (!mainBannerDesktop) {
      return NextResponse.json(
        { success: false, message: "Main banner desktop image is required" },
        { status: 400 }
      );
    }
    if (!sideBannerImage) {
      return NextResponse.json(
        { success: false, message: "Side banner image is required" },
        { status: 400 }
      );
    }

    const products = (Array.isArray(productIds) ? productIds : [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, i) => ({
        productId: new mongoose.Types.ObjectId(id),
        order: i,
      }));

    let doc = await HomeBannerSideProducts.findOne({ instanceId });
    if (doc) {
      doc.name = name;
      doc.status = status === "inactive" ? "inactive" : "active";
      doc.mainBannerDesktop = mainBannerDesktop;
      doc.mainBannerMobile = mainBannerMobile || mainBannerDesktop;
      doc.mainBannerUrl = mainBannerUrl;
      doc.sideBannerImage = sideBannerImage;
      doc.sideBannerUrl = sideBannerUrl;
      doc.sideBannerPosition = sideBannerPosition;
      doc.products = products;
      doc.pageId = page._id;
      await doc.save();
    } else {
      doc = await HomeBannerSideProducts.create({
        instanceId,
        pageId: page._id,
        name,
        status: status === "inactive" ? "inactive" : "active",
        mainBannerDesktop,
        mainBannerMobile: mainBannerMobile || mainBannerDesktop,
        mainBannerUrl,
        sideBannerImage,
        sideBannerUrl,
        sideBannerPosition,
        products,
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
    console.error("POST home-banner-side-products", err);
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

    const doc = await HomeBannerSideProducts.findOneAndDelete({
      instanceId,
    });
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

export { resolveHref };
