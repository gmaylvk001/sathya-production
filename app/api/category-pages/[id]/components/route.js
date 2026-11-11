import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import CategoryPage from "@/models/categoryPage";
import CategoryImageCarousel from "@/models/categoryImageCarousel";
import CategoryProductCarousel from "@/models/categoryProductCarousel";
import CategoryBannerSideProducts from "@/models/categoryBannerSideProducts";
import CategoryBannerFourProducts from "@/models/categoryBannerFourProducts";
import CategoryBannerGrid from "@/models/categoryBannerGrid";
import CategoryImageColumns from "@/models/categoryImageColumns";
import CategorySingleBannerProducts from "@/models/categorySingleBannerProducts";
import CategoryBrandCarousel from "@/models/categoryBrandCarousel";
import CategoryImageHotspotBanner from "@/models/categoryImageHotspotBanner";
import CategoryContent from "@/models/categoryContent";
import CategorySplitBanner from "@/models/categorySplitBanner";
import CategoryCircleImageCarousel from "@/models/categoryCircleImageCarousel";
import CategoryTopBanner from "@/models/categoryTopbanner";
import {
  allowsMultipleInstances,
  COMPONENT_TYPES,
  isValidComponentType,
} from "@/lib/categoryPageComponents/registry";

/**
 * POST /api/category-pages/[id]/components
 * Body: { type, title? }
 */
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { type, title = "" } = body;

    if (!type || !isValidComponentType(type)) {
      return NextResponse.json(
        { success: false, message: `Unsupported component: ${type}` },
        { status: 400 }
      );
    }

    const page = await CategoryPage.findById(id);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    const allowMulti = allowsMultipleInstances(type);

    if (!allowMulti) {
      const existing = page.components.find((c) => c.type === type);
      if (existing) {
        return NextResponse.json({
          success: true,
          page: page.toObject(),
          instance: existing,
          alreadyExists: true,
        });
      }
    }

    const maxOrder = page.components.reduce(
      (m, c) => Math.max(m, typeof c.order === "number" ? c.order : 0),
      -1
    );

    const instanceId = crypto.randomUUID();
    let configId = null;

    if (type === COMPONENT_TYPES.IMAGE_CAROUSEL) {
      const config = await CategoryImageCarousel.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        items: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.PRODUCT_CAROUSEL) {
      const config = await CategoryProductCarousel.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        products: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
      const config = await CategoryBannerSideProducts.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        products: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
      const config = await CategoryBannerFourProducts.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        tiles: [],
        products: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.BANNER_GRID) {
      const config = await CategoryBannerGrid.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        imageCount: 4,
        banners: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.IMAGE_COLUMNS) {
      const config = await CategoryImageColumns.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        layout: "center_big",
        images: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS) {
      const config = await CategorySingleBannerProducts.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        products: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.BRAND_CAROUSEL) {
      const config = await CategoryBrandCarousel.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        items: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER) {
      const config = await CategoryImageHotspotBanner.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        bannerImage: "",
        hotspots: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.CATEGORY_CONTENT) {
      const config = await CategoryContent.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        content: "",
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.SPLIT_BANNER) {
      const config = await CategorySplitBanner.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        bannerCount: 1,
        banners: [],
        status: "active",
      });
      configId = config._id;
    } else if (type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL) {
      const config = await CategoryCircleImageCarousel.create({
        instanceId,
        pageId: page._id,
        categoryId: page.categoryId,
        name: title || "",
        items: [],
        status: "active",
      });
      configId = config._id;
    }

    const instance = {
      instanceId,
      type,
      configId,
      title: title || "",
      order: maxOrder + 1,
      isActive: true,
    };
    page.components.push(instance);
    await page.save();

    return NextResponse.json(
      { success: true, page: page.toObject(), instance },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await CategoryPage.findById(id).lean();
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }
    const components = [...(page.components || [])].sort(
      (a, b) => a.order - b.order
    );
    return NextResponse.json({ success: true, components });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/category-pages/[id]/components?instanceId=
 * Removes both the page layout entry and its saved component configuration.
 */
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const instanceId = new URL(req.url).searchParams.get("instanceId");

    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: "instanceId required" },
        { status: 400 }
      );
    }

    const page = await CategoryPage.findById(id);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    const instance = page.components.find(
      (component) => component.instanceId === instanceId
    );
    if (!instance) {
      return NextResponse.json(
        { success: false, message: "Component not found" },
        { status: 404 }
      );
    }

    const configModels = {
      [COMPONENT_TYPES.IMAGE_CAROUSEL]: CategoryImageCarousel,
      [COMPONENT_TYPES.PRODUCT_CAROUSEL]: CategoryProductCarousel,
      [COMPONENT_TYPES.BANNER_SIDE_PRODUCTS]: CategoryBannerSideProducts,
      [COMPONENT_TYPES.BANNER_FOUR_PRODUCTS]: CategoryBannerFourProducts,
      [COMPONENT_TYPES.BANNER_GRID]: CategoryBannerGrid,
      [COMPONENT_TYPES.IMAGE_COLUMNS]: CategoryImageColumns,
      [COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS]: CategorySingleBannerProducts,
      [COMPONENT_TYPES.BRAND_CAROUSEL]: CategoryBrandCarousel,
      [COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER]: CategoryImageHotspotBanner,
      [COMPONENT_TYPES.CATEGORY_CONTENT]: CategoryContent,
      [COMPONENT_TYPES.SPLIT_BANNER]: CategorySplitBanner,
      [COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL]: CategoryCircleImageCarousel,
    };

    if (instance.type === COMPONENT_TYPES.TOP_BANNER) {
      await CategoryTopBanner.deleteOne({
        $or: [{ pageId: page._id }, { categoryId: page.categoryId }],
      });
    } else {
      const ConfigModel = configModels[instance.type];
      if (ConfigModel) {
        await ConfigModel.deleteOne({ instanceId });
      }
    }

    page.components = page.components.filter(
      (component) => component.instanceId !== instanceId
    );
    page.components
      .sort((a, b) => a.order - b.order)
      .forEach((component, index) => {
        component.order = index;
      });
    await page.save();

    return NextResponse.json({
      success: true,
      page: page.toObject(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
