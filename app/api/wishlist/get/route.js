// app/api/wishlist/get/route.js
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/verifyToken";
import connectDB from "@/lib/db";
import Wishlist from "@/models/ecom_wishlist_info";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info"; 
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ items: [], relatedProducts: [] });

    const { userId } = verifyToken(token);
    await connectDB();

    const wishlist = await Wishlist.find({ userId }).populate("productId");

    // ── Fetch all brands once ──────────────────────────────────────────────
    const allBrands = await Brand.find({}).lean();
    const brandMap = {};
    allBrands.forEach((b) => {
      // brand_code or _id — whichever product.brand matches
      brandMap[b._id.toString()] = b;
      if (b.brand_code) brandMap[b.brand_code] = b;
      if (b.brand_name) brandMap[b.brand_name.toLowerCase()] = b;
    });

    const items = wishlist.filter((entry) => entry.productId).map((entry) => {
      const product = entry.productId;

      const originalPrice = product.price || 0;
      const specialPrice = product.special_price > 0 ? product.special_price : originalPrice;
      const discountPercent = originalPrice > specialPrice
        ? Math.round(((originalPrice - specialPrice) / originalPrice) * 100)
        : 0;
      const savings = originalPrice - specialPrice;

      // ── Brand lookup ──────────────────────────────────────────────────────
      const brandRaw = product.brand || "";
      const brandData =
        brandMap[brandRaw] ||
        brandMap[brandRaw.toLowerCase()] ||
        null;

      return {
        id: entry._id,
        productId: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0]
          ? product.images[0].startsWith("http")
            ? product.images[0]
            : `/uploads/products/${product.images[0]}`
          : "",
        brand: brandData?.brand_name || brandRaw,           // ← brand name
        brandImage: brandData?.image                        // ← brand image
          ? `/uploads/Brands/${brandData.image}`
          : null,
        brandCode: brandRaw,
        model_number: product.model_number || product.item_code || "",
        price: specialPrice,
        original_price: originalPrice,
        special_price: product.special_price,
        discount_percent: discountPercent,
        savings_amount: savings,
        rating: product.star || 4.5,
        reviews: 50,
        specs: product.key_specifications?.slice(0, 3) || [],
        badge: product.featured_products ? "Best Seller" : "",
        stockStatus: product.stock_status,
        quantity: product.quantity || 0,
        related_product_ids: product.related_products || [],
      };
    });

    // ── Related Products ───────────────────────────────────────────────────
    const wishlistProductIds = new Set(
      items.map((i) => i.productId?.toString()).filter(Boolean)
    );
    const allRelatedIds = [
      ...new Set(
        items
          .flatMap((i) => (i.related_product_ids || []).map((id) => id?.toString()))
          .filter((id) => id && !wishlistProductIds.has(id))
      ),
    ];

    const mapProductData = (product) => {
      const originalPrice = product.price || 0;
      const specialPrice =
        product.special_price > 0 ? product.special_price : originalPrice;
      const discountPercent =
        originalPrice > specialPrice
          ? Math.round(((originalPrice - specialPrice) / originalPrice) * 100)
          : 0;

      const brandRaw = product.brand || "";
      const brandData =
        brandMap[brandRaw] || brandMap[brandRaw.toLowerCase()] || null;

      const rawImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (product.image ? [product.image] : []);

      const primaryImg = rawImages[0] || product.image || "";
      const resolvedImg = primaryImg
        ? (primaryImg.startsWith("http")
            ? primaryImg
            : `/uploads/products/${primaryImg.replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "")}`)
        : "";

      return {
        _id: product._id,
        slug: product.slug,
        name: product.name,
        brand: brandData?.brand_name || brandRaw,
        brand_name: brandData?.brand_name || brandRaw,
        brandName: brandData?.brand_name || brandRaw,
        brandImage: brandData?.image
          ? `/uploads/Brands/${brandData.image}`
          : null,
        images: rawImages,
        image: resolvedImg,
        imgSrc: resolvedImg,
        price: originalPrice,
        special_price: product.special_price || specialPrice,
        currentPrice: specialPrice,
        originalPrice: originalPrice,
        original_price: originalPrice,
        discount_percent: discountPercent,
        discountPercent: discountPercent,
        hasDiscount: originalPrice > specialPrice,
        stockStatus: product.stock_status,
        inStock:
          (product.stock_status === "In Stock" ||
            product.stock_status === "instock") &&
          Number(product.quantity) > 0,
        quantity: product.quantity || 0,
      };
    };

    let relatedProducts = [];
    if (allRelatedIds.length > 0) {
      const relatedDocs = await Product.find({
        _id: { $in: allRelatedIds },
        quantity: { $gt: 0 },
        status: "Active",
      }).lean();

      relatedProducts = relatedDocs.map(mapProductData);
    }

    // Fallback: If no related products found, load top active in-stock products
    // Exclude product IDs already in the user's wishlist ($nin)
    if (relatedProducts.length === 0) {
      const excludedObjectIds = Array.from(wishlistProductIds)
        .map((id) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const fallbackQuery = {
        status: "Active",
        quantity: { $gt: 0 },
      };
      if (excludedObjectIds.length > 0) {
        fallbackQuery._id = { $nin: excludedObjectIds };
      }

      const fallbackDocs = await Product.find(fallbackQuery)
        .sort({ featured_products: -1, createdAt: -1 })
        .limit(10)
        .lean();

      relatedProducts = fallbackDocs.map(mapProductData);
    }

    return NextResponse.json({ items, relatedProducts });
  } catch (err) {
    console.error("Wishlist fetch error", err);
    return NextResponse.json({ items: [], relatedProducts: [] }, { status: 500 });
  }
}