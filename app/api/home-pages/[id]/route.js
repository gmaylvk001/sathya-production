import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomePage from "@/models/homePage";
import HomeTopBanner from "@/models/homeTopBanner";
import HomeImageCarousel from "@/models/homeImageCarousel";
import HomeProductCarousel from "@/models/homeProductCarousel";
import HomeBannerSideProducts from "@/models/homeBannerSideProducts";
import HomeBannerFourProducts from "@/models/homeBannerFourProducts";
import HomeBannerGrid from "@/models/homeBannerGrid";
import HomeImageColumns from "@/models/homeImageColumns";
import HomeSingleBannerProducts from "@/models/homeSingleBannerProducts";
import HomeBrandCarousel from "@/models/homeBrandCarousel";
import HomeImageHotspotBanner from "@/models/homeImageHotspotBanner";
import HomeContent from "@/models/homeContent";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await HomePage.findById(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, page });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
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
    if (body.name) update.name = body.name;
    const page = await HomePage.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, page });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await HomePage.findById(id);
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
    }
    await HomeTopBanner.deleteMany({ pageId: page._id });
    await HomeImageCarousel.deleteMany({ pageId: page._id });
    await HomeProductCarousel.deleteMany({ pageId: page._id });
    await HomeBannerSideProducts.deleteMany({ pageId: page._id });
    await HomeBannerFourProducts.deleteMany({ pageId: page._id });
    await HomeBannerGrid.deleteMany({ pageId: page._id });
    await HomeImageColumns.deleteMany({ pageId: page._id });
    await HomeSingleBannerProducts.deleteMany({ pageId: page._id });
    await HomeBrandCarousel.deleteMany({ pageId: page._id });
    await HomeImageHotspotBanner.deleteMany({ pageId: page._id });
    await HomeContent.deleteMany({ pageId: page._id });
    await HomePage.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
