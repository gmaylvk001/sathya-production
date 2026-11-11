import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryPage from "@/models/categoryPage";
import CategoryTopBanner from "@/models/categoryTopbanner";
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
import { PAGE_TYPE_LABELS } from "@/lib/categoryPageComponents/registry";

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
    return NextResponse.json({
      success: true,
      page: {
        ...page,
        pageTypeLabel: PAGE_TYPE_LABELS[page.pageType] || page.pageType,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const update = {};
    if (body.status && ["active", "inactive"].includes(body.status)) {
      update.status = body.status;
    }
    const page = await CategoryPage.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, page });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await CategoryPage.findById(id);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }
    if (page.pageType === "category_brand") {
      await CategoryTopBanner.deleteMany({ pageId: page._id });
    } else {
      await CategoryTopBanner.deleteOne({
        $or: [
          { pageId: page._id },
          {
            categoryId: page.categoryId,
            $or: [{ pageId: { $exists: false } }, { pageId: null }],
          },
        ],
      });
    }
    await CategoryImageCarousel.deleteMany({ pageId: page._id });
    await CategoryProductCarousel.deleteMany({ pageId: page._id });
    await CategoryBannerSideProducts.deleteMany({ pageId: page._id });
    await CategoryBannerFourProducts.deleteMany({ pageId: page._id });
    await CategoryBannerGrid.deleteMany({ pageId: page._id });
    await CategoryImageColumns.deleteMany({ pageId: page._id });
    await CategorySingleBannerProducts.deleteMany({ pageId: page._id });
    await CategoryBrandCarousel.deleteMany({ pageId: page._id });
    await CategoryImageHotspotBanner.deleteMany({ pageId: page._id });
    await CategoryContent.deleteMany({ pageId: page._id });
    await CategorySplitBanner.deleteMany({ pageId: page._id });
    await CategoryPage.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
