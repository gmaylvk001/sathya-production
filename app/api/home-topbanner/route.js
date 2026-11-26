import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeTopBanner from "@/models/homeTopBanner";
import HomePage from "@/models/homePage";
import { saveCategoryTopBannerImage } from "@/lib/categoryTopbannerUpload";

const ALLOWED_MODES = new Set(["single", "big-left", "big-right"]);
const ALLOWED_ALIGNMENTS = new Set(["bottom-left", "center-left", "bottom-center"]);

function parseScheduleDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  // If datetime-local without timezone offset (e.g. YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const isoString = (trimmed.length === 16 ? trimmed + ":00" : trimmed) + "+05:30";
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function withBannerId(item, row) {
  const id = item?._id ? String(item._id) : "";
  if (/^[a-f\d]{24}$/i.test(id)) row._id = id;
  return row;
}

function hasOwn(obj, key) {
  return Boolean(obj && Object.prototype.hasOwnProperty.call(obj, key));
}

async function resolveUploadSlot(formData, fileKey, fallbackValue) {
  if (formData) {
    const file = formData.get(fileKey);
    if (file && typeof file === "object" && file.size > 0) {
      return await saveCategoryTopBannerImage(file);
    }
  }
  return String(fallbackValue || "").trim();
}

function isSlideRenderable(banner) {
  const mode = ALLOWED_MODES.has(banner?.mode) ? banner.mode : "single";
  const mainImg = Boolean(banner?.desktopImage || banner?.mobileImage);
  if (mode === "single") return mainImg;
  const small1Img = Boolean(banner?.smallBanner1?.desktopImage || banner?.smallBanner1?.mobileImage);
  const small2Img = Boolean(banner?.smallBanner2?.desktopImage || banner?.smallBanner2?.mobileImage);
  return mainImg && small1Img && small2Img;
}

function normalizeOverlayFields(source, existing) {
  const rawAlign = hasOwn(source, "overlayAlign")
    ? source?.overlayAlign
    : existing?.overlayAlign;
  const overlayAlign = ALLOWED_ALIGNMENTS.has(rawAlign) ? rawAlign : "bottom-left";

  const rawColor = hasOwn(source, "textColor")
    ? source?.textColor
    : existing?.textColor;
  const textColor = String(rawColor || "").trim() || "#ffffff";

  const showGradientOverlay = hasOwn(source, "showGradientOverlay")
    ? source?.showGradientOverlay !== false
    : existing?.showGradientOverlay !== false;

  return {
    heading: String(
      (hasOwn(source, "heading") ? source?.heading : existing?.heading) || ""
    ).trim(),
    description: String(
      (hasOwn(source, "description") ? source?.description : existing?.description) || ""
    ).trim(),
    buttonText: String(
      (hasOwn(source, "buttonText") ? source?.buttonText : existing?.buttonText) || ""
    ).trim(),
    buttonUrl: String(
      (hasOwn(source, "buttonUrl") ? source?.buttonUrl : existing?.buttonUrl) || ""
    ).trim(),
    overlayAlign,
    textColor,
    showGradientOverlay,
  };
}

async function normalizeSmallBannerSlot(source, existing, formData, filePrefix, index) {
  return {
    desktopImage: await resolveUploadSlot(
      formData,
      `${filePrefix}DesktopImage_${index}`,
      hasOwn(source, "desktopImage") ? source?.desktopImage : existing?.desktopImage
    ),
    mobileImage: await resolveUploadSlot(
      formData,
      `${filePrefix}MobileImage_${index}`,
      hasOwn(source, "mobileImage") ? source?.mobileImage : existing?.mobileImage
    ),
    url: String((hasOwn(source, "url") ? source?.url : existing?.url) || "").trim(),
    ...normalizeOverlayFields(source, existing),
  };
}

async function normalizeSlidePayload(item, index, formData, existingSlide) {
  const rawMode = hasOwn(item, "mode") ? item.mode : existingSlide?.mode;
  const mode = ALLOWED_MODES.has(rawMode) ? rawMode : "single";

  const desktopImage = await resolveUploadSlot(formData, `desktopImage_${index}`, item?.desktopImage);
  const mobileImage = await resolveUploadSlot(formData, `mobileImage_${index}`, item?.mobileImage);

  const s1Source = hasOwn(item, "smallBanner1") ? item.smallBanner1 || {} : existingSlide?.smallBanner1 || {};
  const s2Source = hasOwn(item, "smallBanner2") ? item.smallBanner2 || {} : existingSlide?.smallBanner2 || {};

  const smallBanner1 = await normalizeSmallBannerSlot(
    s1Source,
    existingSlide?.smallBanner1,
    formData,
    "small1",
    index
  );
  const smallBanner2 = await normalizeSmallBannerSlot(
    s2Source,
    existingSlide?.smallBanner2,
    formData,
    "small2",
    index
  );

  return withBannerId(item, {
    mode,
    desktopImage,
    mobileImage,
    url: String((hasOwn(item, "url") ? item?.url : existingSlide?.url) || "").trim(),
    ...normalizeOverlayFields(item, existingSlide),
    smallBanner1,
    smallBanner2,
    state: item?.state || "all",
    isActive: item?.isActive !== false,
    startDate: parseScheduleDate(item?.startDate),
    endDate: parseScheduleDate(item?.endDate),
    order: typeof item?.order === "number" ? item.order : index,
  });
}

/**
 * GET /api/home-topbanner
 * ?pageId= | all list for admin
 * ?activeOnly=1 for storefront
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");
    const activeOnly = searchParams.get("activeOnly") === "1";
    const targetRegion = (
      searchParams.get("region") ||
      searchParams.get("state") ||
      "all"
    ).toLowerCase();

    if (pageId) {
      const doc = await HomeTopBanner.findOne({ pageId }).lean();
      if (!doc) {
        return NextResponse.json({ success: true, data: null, banners: [] });
      }

      let banners = [...(doc.banners || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );

      if (activeOnly || doc.status !== "active") {
        if (doc.status !== "active" && activeOnly) {
          return NextResponse.json({
            success: true,
            data: doc,
            banners: [],
          });
        }
        if (activeOnly) {
          const now = new Date();
          banners = banners.filter((b) => {
            if (b.isActive === false) return false;
            if (b.startDate && new Date(b.startDate) > now) return false;
            if (b.endDate && new Date(b.endDate) < now) return false;
            return isSlideRenderable(b);
          });
        }
      }

      // Region/State Filtering with Fallback: 1. Target region match, 2. 'all' fallback
      if (targetRegion && targetRegion !== "all") {
        const regionBanners = banners.filter(
          (b) => (b.state || "all").toLowerCase() === targetRegion
        );
        if (regionBanners.length > 0) {
          banners = regionBanners;
        } else {
          banners = banners.filter(
            (b) => !b.state || b.state === "all"
          );
        }
      }

      return NextResponse.json({ success: true, data: doc, banners });
    }

    const list = await HomeTopBanner.find()
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, list });
  } catch (err) {
    console.error("GET home-topbanner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/home-topbanner
 * multipart/json: pageId, status, bannersMeta + files
 */
export async function POST(req) {
  try {
    await dbConnect();
    const contentType = req.headers.get("content-type") || "";

    let pageId;
    let status = "active";
    let formData = null;
    let rawItems = [];

    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      pageId = formData.get("pageId");
      status = formData.get("status") || "active";
      const metaRaw = formData.get("bannersMeta");
      rawItems = metaRaw ? JSON.parse(String(metaRaw)) : [];
    } else {
      const body = await req.json();
      pageId = body.pageId;
      status = body.status || "active";
      rawItems = Array.isArray(body.banners) ? body.banners : [];
    }

    if (!pageId) {
      return NextResponse.json(
        { success: false, message: "pageId is required" },
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

    const existingDoc = await HomeTopBanner.findOne({ pageId: page._id }).lean();
    const existingById = new Map(
      (existingDoc?.banners || [])
        .filter((b) => b?._id)
        .map((b) => [String(b._id), b])
    );

    const banners = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i] || {};
      const existingSlide = item._id ? existingById.get(String(item._id)) : null;
      banners.push(await normalizeSlidePayload(item, i, formData, existingSlide));
    }

    const payload = {
      pageId: page._id,
      name: page.name || "Home Page",
      pageType: "home",
      status,
      banners,
    };

    const doc = await HomeTopBanner.findOneAndUpdate(
      { pageId: page._id },
      { $set: payload },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error("POST home-topbanner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/home-topbanner?id=
 */
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "id required" },
        { status: 400 }
      );
    }
    await HomeTopBanner.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
