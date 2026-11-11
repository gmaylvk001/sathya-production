import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryTopBanner, {
  ensureCategoryTopBannerIndexes,
} from "@/models/categoryTopbanner";
import CategoryPage from "@/models/categoryPage";
import ecom_category_info from "@/models/ecom_category_info";
import ecom_brand_info from "@/models/ecom_brand_info";
import { saveCategoryTopBannerImage } from "@/lib/categoryTopbannerUpload";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

/**
 * GET /api/category-topbanner
 * ?categoryId= | ?slug= | all list for admin
 * ?activeOnly=1 for storefront
 */
export async function GET(req) {
  try {
    await dbConnect();
    await ensureCategoryTopBannerIndexes();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const pageId = searchParams.get("pageId");
    const slug = searchParams.get("slug");
    const activeOnly = searchParams.get("activeOnly") === "1";
    const targetRegion = (searchParams.get("region") || searchParams.get("state") || "all").toLowerCase();

    if (pageId || categoryId || slug) {
      const filter = pageId
        ? { pageId }
        : categoryId
          ? {
              categoryId,
              $or: [{ pageId: { $exists: false } }, { pageId: null }],
            }
          : {
              categorySlug: slug,
              $or: [{ pageId: { $exists: false } }, { pageId: null }],
            };

      const doc = await CategoryTopBanner.findOne(filter).lean();
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
          banners = banners.filter((b) => b.isActive !== false);
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

    const list = await CategoryTopBanner.find()
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, list });
  } catch (err) {
    console.error("GET category-topbanner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/category-topbanner
 * Create or replace banner set for a category.
 * multipart: categoryId, pageType, status, banners JSON metadata + files desktopImage_0, mobileImage_0, ...
 * OR JSON: { categoryId, pageType, status, banners: [{ url, isActive, state, desktopImage?, mobileImage? }] }
 */
export async function POST(req) {
  try {
    await dbConnect();
    await ensureCategoryTopBannerIndexes();
    const contentType = req.headers.get("content-type") || "";

    let categoryId;
    let pageId;
    let pageType = "category";
    let status = "active";
    let banners = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      categoryId = formData.get("categoryId");
      pageId = formData.get("pageId") || null;
      pageType = formData.get("pageType") || "category";
      status = formData.get("status") || "active";

      const metaRaw = formData.get("bannersMeta");
      const meta = metaRaw ? JSON.parse(String(metaRaw)) : [];

      for (let i = 0; i < meta.length; i++) {
        const item = meta[i] || {};
        let desktopImage = item.desktopImage || "";
        let mobileImage = item.mobileImage || "";

        const deskFile = formData.get(`desktopImage_${i}`);
        const mobFile = formData.get(`mobileImage_${i}`);

        if (deskFile && typeof deskFile === "object" && deskFile.size > 0) {
          desktopImage = await saveCategoryTopBannerImage(deskFile);
        }
        if (mobFile && typeof mobFile === "object" && mobFile.size > 0) {
          mobileImage = await saveCategoryTopBannerImage(mobFile);
        }

        banners.push({
          desktopImage,
          mobileImage,
          url: item.url || "",
          state: item.state || "all",
          isActive: item.isActive !== false,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
          order: typeof item.order === "number" ? item.order : i,
        });
      }
    } else {
      const body = await req.json();
      categoryId = body.categoryId;
      pageId = body.pageId || null;
      pageType = body.pageType || "category";
      status = body.status || "active";
      banners = (body.banners || []).map((b, i) => ({
        desktopImage: b.desktopImage || "",
        mobileImage: b.mobileImage || "",
        url: b.url || "",
        state: b.state || "all",
        isActive: b.isActive !== false,
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        order: typeof b.order === "number" ? b.order : i,
      }));
    }

    let categoryName = "";
    let categorySlug = "";

    if (pageType === PAGE_TYPES.CATEGORY_BRAND && pageId) {
      const page = await CategoryPage.findById(pageId).lean();
      if (!page) {
        return NextResponse.json(
          { success: false, message: "Page not found" },
          { status: 404 }
        );
      }
      categoryId = page.categoryId;
      categoryName = page.categoryName || "";
      categorySlug = page.categorySlug || "";
    } else if (!categoryId && pageId) {
      const page = await CategoryPage.findById(pageId).lean();
      if (page) {
        categoryId = page.categoryId || page._id;
        categoryName = page.categoryName || "";
        categorySlug = page.categorySlug || "";
      } else {
        return NextResponse.json(
          { success: false, message: "categoryId is required" },
          { status: 400 }
        );
      }
    } else if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "categoryId is required" },
        { status: 400 }
      );
    } else if (pageType === "brand") {
      let brand = await ecom_brand_info.findById(categoryId).lean();
      if (!brand) {
        const page =
          (await CategoryPage.findById(categoryId).lean()) ||
          (await CategoryPage.findOne({ categoryId }).lean());
        if (page) {
          categoryName = page.categoryName || page.brandName || "";
          categorySlug = page.categorySlug || page.brandSlug || "";
          brand = page;
        }
      } else {
        categoryName = brand.brand_name;
        categorySlug = brand.brand_slug;
      }
      if (!brand) {
        return NextResponse.json(
          { success: false, message: "Brand not found" },
          { status: 404 }
        );
      }
    } else {
      let category = await ecom_category_info.findById(categoryId).lean();
      if (!category) {
        // Fallback 1: Check if categoryId is a CategoryPage ID
        const page = await CategoryPage.findById(categoryId).lean();
        if (page) {
          categoryName = page.categoryName || "";
          categorySlug = page.categorySlug || "";
          if (page.categorySlug) {
            const catBySlug = await ecom_category_info
              .findOne({ category_slug: page.categorySlug })
              .lean();
            if (catBySlug) {
              categoryId = catBySlug._id;
              categoryName = catBySlug.category_name;
              categorySlug = catBySlug.category_slug;
            }
          }
          category = page;
        } else {
          // Fallback 2: Check if CategoryPage exists with this categoryId
          const pageByCat = await CategoryPage.findOne({ categoryId }).lean();
          if (pageByCat) {
            categoryName = pageByCat.categoryName || "";
            categorySlug = pageByCat.categorySlug || "";
            if (pageByCat.categorySlug) {
              const catBySlug = await ecom_category_info
                .findOne({ category_slug: pageByCat.categorySlug })
                .lean();
              if (catBySlug) {
                categoryId = catBySlug._id;
                categoryName = catBySlug.category_name;
                categorySlug = catBySlug.category_slug;
              }
            }
            category = pageByCat;
          } else if (pageId) {
            const pageById = await CategoryPage.findById(pageId).lean();
            if (pageById) {
              categoryName = pageById.categoryName || "";
              categorySlug = pageById.categorySlug || "";
              category = pageById;
            }
          }
        }
      } else {
        categoryName = category.category_name;
        categorySlug = category.category_slug;
      }

      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category not found" },
          { status: 404 }
        );
      }
    }

    const payload = {
      categoryId,
      categoryName,
      categorySlug,
      pageType,
      status,
      banners,
    };

    const query =
      pageType === PAGE_TYPES.CATEGORY_BRAND && pageId
        ? { pageId }
        : {
            categoryId,
            $or: [{ pageId: { $exists: false } }, { pageId: null }],
          };

    if (pageType === PAGE_TYPES.CATEGORY_BRAND && pageId) {
      payload.pageId = pageId;
    }

    const doc = await CategoryTopBanner.findOneAndUpdate(
      query,
      { $set: payload },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error("POST category-topbanner", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/category-topbanner?id=
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
    await CategoryTopBanner.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
