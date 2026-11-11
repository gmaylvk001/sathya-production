import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { normalizeRegion } from "@/lib/regionHelper";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminRequest";

// ✅ GET all brands with banners (filtered by target region with slot fallback)
export async function GET(req) {
  try {
    await dbConnect();
    const url = req?.url ? new URL(req.url) : null;
    const targetRegion = url ? normalizeRegion(url.searchParams.get("region") || url.searchParams.get("state") || "all") : "all";

    const brands = await Brand.find().sort({ createdAt: -1 }).lean();

    if (targetRegion && targetRegion !== "all") {
      const processedBrands = brands.map((b) => {
        if (!b.banners || b.banners.length === 0) return b;

        const slotMap = new Map();
        b.banners.forEach((banner) => {
          const bannerState = banner.state || "all";
          const bannerSlot = banner.slot || 1;

          if (banner.banner_status === "Active") {
            if (bannerState === targetRegion) {
              slotMap.set(bannerSlot, banner);
            } else if (bannerState === "all" && !slotMap.has(bannerSlot)) {
              slotMap.set(bannerSlot, banner);
            }
          }
        });

        return {
          ...b,
          banners: Array.from(slotMap.values()),
        };
      });

      return NextResponse.json({ success: true, brands: processedBrands });
    }

    return NextResponse.json({ success: true, brands });
  } catch (error) {
    console.error("GET Brand Banners error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ✅ POST: Add/Edit brand or add/edit banner
export async function POST(req) {
  try {
    await dbConnect();
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const formData = await req.formData();

    const brandId = formData.get("brandId");
    const bannerId = formData.get("bannerId");
    const brand_name = formData.get("brand_name");
    const brand_slug = formData.get("brand_slug");
    const status = formData.get("status") || "Active";
    const banner_name = formData.get("banner_name");
    const redirect_url = formData.get("redirect_url");
    const banner_status = formData.get("banner_status") || "Active";
    const state = normalizeRegion(formData.get("state") || "all");
    const slot = Number(formData.get("slot")) || 1;

    if (brandId && !mongoose.Types.ObjectId.isValid(brandId)) {
      return NextResponse.json({ success: false, error: "Invalid brandId format" }, { status: 400 });
    }

    // Brand Image upload
    let brandImagePath = null;
    const brandImage = formData.get("brandImage");
    if (brandImage && typeof brandImage === "object" && brandImage.size > 0) {
      const buffer = Buffer.from(await brandImage.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public/uploads/brands");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${Date.now()}_${brandImage.name.replace(/\s/g, "_")}`;
      brandImagePath = `/uploads/brands/${filename}`;
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
    }

    // Banner Image upload
    let bannerImagePath = null;
    const bannerImage = formData.get("bannerImage");
    if (bannerImage && typeof bannerImage === "object" && bannerImage.size > 0) {
      const buffer = Buffer.from(await bannerImage.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public/uploads/banners");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${Date.now()}_${bannerImage.name.replace(/\s/g, "_")}`;
      bannerImagePath = `/uploads/banners/${filename}`;
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
    }

    let brand;

    if (brandId) {
      const updateData = { brand_name, brand_slug, status, updatedAt: new Date() };
      if (brandImagePath) updateData.image = brandImagePath;

      brand = await Brand.findById(brandId);
      if (!brand) return NextResponse.json({ success: false, error: "Brand not found" }, { status: 404 });

      if (brand_name) {
        brand.brand_name = brand_name;
        if (brand_slug) brand.brand_slug = brand_slug;
        if (status) brand.status = status;
        if (brandImagePath) brand.image = brandImagePath;
      }

      if (banner_name || bannerImagePath) {
        const isDuplicate = brand.banners.some((b) => {
          if (bannerId && b._id.toString() === bannerId) return false;
          return (b.state || "all") === state && (b.slot || 1) === slot && b.banner_status === "Active";
        });

        if (isDuplicate) {
          return NextResponse.json(
            { success: false, error: `A banner for region '${state}' and slot ${slot} already exists for this brand.` },
            { status: 400 }
          );
        }

        if (bannerId) {
          const bannerIndex = brand.banners.findIndex(b => b._id.toString() === bannerId);
          if (bannerIndex !== -1) {
            brand.banners[bannerIndex].banner_name = banner_name || brand.banners[bannerIndex].banner_name;
            if (bannerImagePath) brand.banners[bannerIndex].banner_image = bannerImagePath;
            brand.banners[bannerIndex].redirect_url = redirect_url;
            brand.banners[bannerIndex].banner_status = banner_status;
            brand.banners[bannerIndex].state = state;
            brand.banners[bannerIndex].slot = slot;
          }
        } else {
          if (!bannerImagePath) {
            return NextResponse.json({ success: false, error: "Banner image required" }, { status: 400 });
          }
          brand.banners.push({
            banner_name,
            banner_image: bannerImagePath,
            redirect_url,
            banner_status,
            state,
            slot,
          });
        }
      }
      await brand.save();
    } else {
      const banners = (banner_name && bannerImagePath) ? [{
        banner_name,
        banner_image: bannerImagePath,
        redirect_url,
        banner_status,
        state,
        slot,
      }] : [];

      brand = await Brand.create({
        brand_name,
        brand_slug,
        status,
        image: brandImagePath,
        banners,
      });
    }

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    console.error("POST Brand Banner error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ DELETE brand or banner
export async function DELETE(req) {
  try {
    await dbConnect();
    const auth = await requireAdmin(req, "banners");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { brandId, bannerId } = await req.json();

    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return NextResponse.json({ success: false, error: "Valid brandId required" }, { status: 400 });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) return NextResponse.json({ success: false, error: "Brand not found" }, { status: 404 });

    if (bannerId) {
      brand.banners = brand.banners.filter(b => b._id.toString() !== bannerId);
      await brand.save();
      return NextResponse.json({ success: true, message: "Banner deleted", brand });
    }

    await Brand.findByIdAndDelete(brandId);
    return NextResponse.json({ success: true, message: "Brand deleted" });
  } catch (error) {
    console.error("DELETE Brand error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
