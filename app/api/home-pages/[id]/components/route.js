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
          type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL ||
          type === COMPONENT_TYPES.SUPER_CATEGORIES ||
          type === COMPONENT_TYPES.WHY_BUY_REASONS
        ) {
          defaults.items = [];
          if (type === COMPONENT_TYPES.WHY_BUY_REASONS) {
            defaults.name = "Why Buy From Sathya?";
            defaults.kicker = "THE OMNICHANNEL ADVANTAGE";
            defaults.subtitle = "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores.";
            defaults.items = [
              {
                icon: "mdi:store-clock-outline",
                iconType: "iconify",
                iconColor: "light_red",
                title: "60–Min Express Store Pickup",
                description: "Order online and collect your packaged device from any of our 140+ stores across Tamil Nadu & South India in 1 hour.",
                tagText: "ZERO SHIPPING CHARGE ALWAYS",
                tagColor: "red",
                link: "",
                isActive: true,
                order: 0,
              },
              {
                icon: "mdi:cash-multiple",
                iconType: "iconify",
                iconColor: "yellow",
                title: "Pay at Doorstep / COD",
                description: "Inspect the tamper-proof packaging at your home prior to paying via Cash, UPI QR, or Debit/Credit Card swipe on delivery.",
                tagText: "CARD–ON–DELIVERY MACHINE AVAILABLE",
                tagColor: "dark",
                link: "",
                isActive: true,
                order: 1,
              },
              {
                icon: "mdi:tag-check-outline",
                iconType: "iconify",
                iconColor: "dark_red",
                title: "Lowest Price Guarantee",
                description: "Find any active lower price from authorized organized electronics retailers, and Sathya refunds the exact difference within 24 hours.",
                tagText: "HASSLE–FREE PRICE MATCH PROMISE",
                tagColor: "red",
                link: "",
                isActive: true,
                order: 2,
              },
              {
                icon: "mdi:store-marker-outline",
                iconType: "iconify",
                iconColor: "light_red",
                title: "140+ Physical Superstores",
                description: "Experience live demos, compare models side-by-side, and get personalized advice from our expert instore product specialists.",
                tagText: "TRUSTED FOR OVER 70 YEARS",
                tagColor: "dark",
                link: "",
                isActive: true,
                order: 3,
              },
              {
                icon: "mdi:shield-check-outline",
                iconType: "iconify",
                iconColor: "green",
                title: "100% Genuine & Brand Warranty",
                description: "Direct authorized partnership with top global brands guarantees brand-new sealed products with official brand service support.",
                tagText: "DIRECT BRAND AUTHORIZED DEALER",
                tagColor: "green",
                link: "",
                isActive: true,
                order: 4,
              },
              {
                icon: "mdi:truck-fast-outline",
                iconType: "iconify",
                iconColor: "yellow",
                title: "Next-Day Delivery & Installation",
                description: "Safe doorstep delivery with specialized vehicle handling and expert unboxing & wall-mount installation by certified engineers.",
                tagText: "VERIFIED SATHYA TECHNICIANS",
                tagColor: "red",
                link: "",
                isActive: true,
                order: 5,
              },
              {
                icon: "mdi:credit-card-outline",
                iconType: "iconify",
                iconColor: "blue",
                title: "Easy No-Cost EMI & Exchange",
                description: "Upgrade seamlessly with zero down payment schemes, instant paperless finance, and best valuation for your old appliances.",
                tagText: "FLEXIBLE PAYMENT PLANS",
                tagColor: "dark",
                link: "",
                isActive: true,
                order: 6,
              },
              {
                icon: "mdi:headset",
                iconType: "iconify",
                iconColor: "light_red",
                title: "Dedicated After-Sales Support",
                description: "Round-the-clock priority assistance, warranty claim guidance, and dedicated store managers ready to assist you anytime.",
                tagText: "CUSTOMER FIRST COMMITTED",
                tagColor: "red",
                link: "",
                isActive: true,
                order: 7,
              },
            ];
          } else if (type === COMPONENT_TYPES.SUPER_CATEGORIES) {
            defaults.name = "Explore Super-Categories";
            defaults.kicker = "DEPARTMENT MATRIX";
            defaults.viewAllText = "View All 84 Sub-Categories";
            defaults.viewAllUrl = "/categories";
            defaults.items = [
              {
                image: "/uploads/circle-image-carousel/1795169955594-Minimalist_White_AC_on_Warm_Waves.webp",
                badgeText: "Exchange Bonus",
                badgeColor: "olive",
                title: "Air Conditioners",
                subtitle: "Inverter, Split & Window ACs",
                slug: "/category/air-conditioner",
                url: "/category/air-conditioner",
                isActive: true,
                order: 0,
              },
              {
                image: "/uploads/circle-image-carousel/1795169955612-Modern_Stainless_Steel_Refrigerator_Advertisement.webp",
                badgeText: "Up to 55% Off",
                badgeColor: "black",
                title: "Refrigerators",
                subtitle: "Single, Double & Side-by-Side",
                slug: "/category/refrigerator",
                url: "/category/refrigerator",
                isActive: true,
                order: 1,
              },
              {
                image: "/uploads/circle-image-carousel/1795169955617-Lavender_Smartphones_on_Peach_Waves.webp",
                badgeText: "From ₹6,999",
                badgeColor: "red",
                title: "Mobiles & Tablets",
                subtitle: "Smartphones, iPads & Covers",
                slug: "/category/mobiles",
                url: "/category/mobiles",
                isActive: true,
                order: 2,
              },
              {
                image: "/uploads/circle-image-carousel/1795169955624-Modern_Silver_Top-Load_Washing_Machine.webp",
                badgeText: "Flat 40% Off",
                badgeColor: "pink",
                title: "Washing Machines",
                subtitle: "Front Load, Top Load & Semi",
                slug: "/category/washing-machine",
                url: "/category/washing-machine",
                isActive: true,
                order: 3,
              },
              {
                image: "/uploads/circle-image-carousel/1795169955628-Modern_TV_with_Alpine_Lake_Display.webp",
                badgeText: "Starting ₹8,999",
                badgeColor: "yellow",
                title: "LED TVs & Audio",
                subtitle: "4K OLED, QLED & Soundbars",
                slug: "/category/televisions",
                url: "/category/televisions",
                isActive: true,
                order: 4,
              },
              {
                image: "/uploads/circle-image-carousel/1795169955632-Vibrant_Laptop_on_Peach_Waves_(1).webp",
                badgeText: "Free Bag + Mouse",
                badgeColor: "gray",
                title: "Laptops & PCs",
                subtitle: "Gaming, Business & Student",
                slug: "/category/laptops",
                url: "/category/laptops",
                isActive: true,
                order: 5,
              },
            ];
          }
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
        } else if (type === COMPONENT_TYPES.DEAL_OF_THE_DAY) {
          defaults.productId = null;
          defaults.startAt = null;
          defaults.endAt = null;
          defaults.eyebrow = "DEAL OF THE DAY";
          defaults.badgeLabel = "Spotlight 24H";
          defaults.highlightSpecs = [
            { label: "Display", value: "" },
            { label: "Sound", value: "" },
            { label: "Warranty", value: "" },
          ];
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
