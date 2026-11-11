import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import HomePage from "@/models/homePage";
import HomeTopBanner from "@/models/homeTopBanner";
import {
  allowsMultipleInstances,
  COMPONENT_TYPES,
  isValidComponentType,
} from "@/lib/categoryPageComponents/registry";
import { getHomeConfigModel } from "@/lib/homePageComponents/configModels";

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

    const page = await HomePage.findById(id);
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
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

    if (type === COMPONENT_TYPES.TOP_BANNER) {
      const existingBanner = await HomeTopBanner.findOne({ pageId: page._id });
      if (existingBanner) {
        configId = existingBanner._id;
      } else {
        const created = await HomeTopBanner.create({
          pageId: page._id,
          name: "Home Page",
          banners: [],
          status: "active",
        });
        configId = created._id;
      }
    } else {
      const ConfigModel = getHomeConfigModel(type);
      if (ConfigModel) {
        const defaults = {
          instanceId,
          pageId: page._id,
          name: title || "",
          status: "active",
        };
        if (
          type === COMPONENT_TYPES.IMAGE_CAROUSEL ||
          type === COMPONENT_TYPES.BRAND_CAROUSEL ||
          type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL
        ) {
          defaults.items = [];
        } else if (type === COMPONENT_TYPES.PRODUCT_CAROUSEL) {
          defaults.products = [];
        } else if (type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
          defaults.products = [];
        } else if (type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
          defaults.tiles = [];
          defaults.products = [];
        } else if (type === COMPONENT_TYPES.BANNER_GRID) {
          defaults.imageCount = 4;
          defaults.banners = [];
          defaults.products = [];
        } else if (type === COMPONENT_TYPES.IMAGE_COLUMNS) {
          defaults.layout = "center_big";
          defaults.images = [];
        } else if (type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS) {
          defaults.products = [];
        } else if (type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER) {
          defaults.bannerImage = "";
          defaults.hotspots = [];
        } else if (type === COMPONENT_TYPES.CATEGORY_CONTENT) {
          defaults.content = "";
        } else if (type === COMPONENT_TYPES.SPLIT_BANNER) {
          defaults.bannerCount = 1;
          defaults.banners = [];
        }
        const config = await ConfigModel.create(defaults);
        configId = config._id;
      }
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

    return NextResponse.json({ success: true, page: page.toObject(), instance }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await HomePage.findById(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }
    const components = [...(page.components || [])].sort((a, b) => a.order - b.order);
    return NextResponse.json({ success: true, components });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { instanceId, title, isActive } = body;

    if (!instanceId) {
      return NextResponse.json({ success: false, message: "instanceId required" }, { status: 400 });
    }

    const page = await HomePage.findById(id);
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    const instance = page.components.find((c) => c.instanceId === instanceId);
    if (!instance) {
      return NextResponse.json({ success: false, message: "Component not found" }, { status: 404 });
    }

    if (typeof title === "string") instance.title = title;
    if (typeof isActive === "boolean") instance.isActive = isActive;

    await page.save();
    return NextResponse.json({ success: true, page: page.toObject(), instance });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const instanceId = new URL(req.url).searchParams.get("instanceId");

    if (!instanceId) {
      return NextResponse.json({ success: false, message: "instanceId required" }, { status: 400 });
    }

    const page = await HomePage.findById(id);
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }

    const instance = page.components.find((c) => c.instanceId === instanceId);
    if (!instance) {
      return NextResponse.json({ success: false, message: "Component not found" }, { status: 404 });
    }

    if (instance.type === COMPONENT_TYPES.TOP_BANNER) {
      await HomeTopBanner.deleteOne({ pageId: page._id });
    } else {
      const ConfigModel = getHomeConfigModel(instance.type);
      if (ConfigModel) {
        await ConfigModel.deleteOne({ instanceId });
      }
    }

    page.components = page.components.filter((c) => c.instanceId !== instanceId);
    page.components.sort((a, b) => a.order - b.order).forEach((c, i) => {
      c.order = i;
    });
    await page.save();

    return NextResponse.json({ success: true, page: page.toObject() });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
