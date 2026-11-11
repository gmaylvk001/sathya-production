import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { normalizeRegion } from "@/lib/regionHelper";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminRequest";

export async function GET(req) {
  await dbConnect();
  const url = req?.url ? new URL(req.url) : null;
  const targetRegion = url ? normalizeRegion(url.searchParams.get("region") || url.searchParams.get("state") || "all") : "all";
  
  const categories = await Category.find({ status: "Active" }).sort({ createdAt: -1 }).lean();

  if (targetRegion && targetRegion !== "all") {
    const processedCategories = categories.map((cat) => {
      if (!cat.banners || cat.banners.length === 0) return cat;

      const slotMap = new Map();
      cat.banners.forEach((b) => {
        const bannerState = b.state || "all";
        const bannerSlot = b.slot || 1;

        if (b.banner_status === "Active") {
          if (bannerState === targetRegion) {
            slotMap.set(bannerSlot, b);
          } else if (bannerState === "all" && !slotMap.has(bannerSlot)) {
            slotMap.set(bannerSlot, b);
          }
        }
      });

      return {
        ...cat,
        banners: Array.from(slotMap.values()),
      };
    });

    return NextResponse.json({ success: true, categories: processedCategories });
  }

  return NextResponse.json({ success: true, categories });
}

export async function POST(req) {
  await dbConnect();
  const auth = await requireAdmin(req, "banners");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const formData = await req.formData();

    const categoryId = formData.get("categoryId");
    const bannerId = formData.get("bannerId");
    const category_name = formData.get("category_name");
    const category_slug = formData.get("category_slug");
    const md5_cat_name = formData.get("md5_cat_name");
    const status = formData.get("status") || "Active";
    const banner_name = formData.get("banner_name");
    const redirect_url = formData.get("redirect_url");
    const banner_status = formData.get("banner_status") || "Active";
    const bannerFile = formData.get("bannerImage");
    const state = normalizeRegion(formData.get("state") || "all");
    const slot = Number(formData.get("slot")) || 1;

    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: "Invalid categoryId format" }, { status: 400 });
    }

    let bannerImagePath = null;
    if (bannerFile && typeof bannerFile === "object" && bannerFile.size > 0) {
      const buffer = Buffer.from(await bannerFile.arrayBuffer());
      const filename = `${Date.now()}-${bannerFile.name.replace(/\s/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      bannerImagePath = "/uploads/" + filename;
    }

    let category;

    if (categoryId) {
      category = await Category.findById(categoryId);
      if (!category) return NextResponse.json({ success: false, error: "Category not found" });

      if (banner_name) {
        const isDuplicate = category.banners.some((b) => {
          if (bannerId && b._id.toString() === bannerId) return false;
          return (b.state || "all") === state && (b.slot || 1) === slot && b.banner_status === "Active";
        });

        if (isDuplicate) {
          return NextResponse.json(
            { success: false, error: `A banner for region '${state}' and slot ${slot} already exists in this category.` },
            { status: 400 }
          );
        }
      }

      if (bannerId) {
        const banner = category.banners.id(bannerId);
        if (!banner) return NextResponse.json({ success: false, error: "Banner not found" });
        banner.banner_name = banner_name;
        banner.redirect_url = redirect_url;
        banner.banner_status = banner_status;
        banner.state = state;
        banner.slot = slot;
        if (bannerImagePath) banner.banner_image = bannerImagePath;
      } else {
        if (!bannerImagePath) {
          return NextResponse.json({ success: false, error: "Banner image required" });
        }
        if (!category.banners) category.banners = [];
        category.banners.push({
          banner_name,
          banner_image: bannerImagePath,
          redirect_url,
          banner_status,
          state,
          slot,
        });
      }

      await category.save();
    } else {
      category = new Category({
        category_name,
        category_slug,
        md5_cat_name,
        status,
        banners: [],
      });

      if (banner_name && bannerImagePath) {
        category.banners.push({
          banner_name,
          banner_image: bannerImagePath,
          redirect_url,
          banner_status,
          state,
          slot,
        });
      }

      await category.save();
    }

    return NextResponse.json({ success: true, category });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const auth = await requireAdmin(req, "banners");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await req.json();
    const { categoryId, bannerId } = body;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: "Valid categoryId required" }, { status: 400 });
    }

    const category = await Category.findById(categoryId);
    if (!category) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

    if (bannerId) {
      const banner = category.banners.id(bannerId);
      if (!banner) return NextResponse.json({ success: false, error: "Banner not found" }, { status: 404 });
      banner.deleteOne();
      await category.save();
    } else {
      await Category.findByIdAndDelete(categoryId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
