/* // app/api/products/related/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db"; // your DB connection
import Product from "@/models/product";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category"); // category ID
    const excludeId = searchParams.get("exclude"); // optional product to exclude
    const limit = parseInt(searchParams.get("limit")) || 5; // default 5

    if (!categoryId) {
      return NextResponse.json({ error: "Category ID is requiredd" }, { status: 400 });
    }

    const query = { category: categoryId };
    if (excludeId) query._id = { $ne: excludeId }; // exclude current product

    const relatedProducts = await Product.find(query)
      .limit(limit)
      .sort({ createdAt: -1 }); // latest products first

    return NextResponse.json({
  success: true,
  products: relatedProducts, // ✅ match frontend expectation
});

  } catch (error) {
    console.error("Error fetching related products:", error);
    return NextResponse.json({ error: "Failed to fetch related products" }, { status: 500 });
  }
}
 */


// app/api/products/related/route.js

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import OwnerProduct from "@/models/OwnerProduct";
import mongoose from "mongoose";
import { normalizeRegion } from "@/lib/regionHelper";
import { resolveProductPrice } from "@/lib/priceResolver";

const MIN_RELATED = 4;
const OUT_OF_STOCK_STATUSES = ["out of stock", "outofstock"];

// Product cards: 10+ units can be bought online. Related products should push those.
const ONLINE_IN_STOCK_FILTER = {
  status: "Active",
  stock_status: { $nin: ["Out of Stock", "outofstock"] },
  quantity: { $gte: 10 },
};

function parseObjectId(id) {
  if (!id) return null;
  const value = typeof id === "object" ? id._id || id.id || id.$oid : id;
  const str = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(str)) return null;
  return new mongoose.Types.ObjectId(str);
}

function hasDisplayImage(product) {
  return (Array.isArray(product?.images) ? product.images : []).some(
    (img) => img && typeof img === "string" && img.trim() && img.trim().toLowerCase() !== "null"
  );
}

function isOnlineBuyable(product) {
  const status = String(product?.stock_status || "").trim().toLowerCase();
  if (OUT_OF_STOCK_STATUSES.includes(status)) return false;
  const qty = Number(product?.quantity ?? product?.stock ?? 0);
  return qty >= 10 && hasDisplayImage(product);
}

function uniqueById(products) {
  const seen = new Set();
  return products.filter((p) => {
    const id = String(p?._id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function resolveRequestRegion(req, searchParams) {
  const raw =
    searchParams.get("region") ||
    searchParams.get("state") ||
    req.cookies?.get("sathya_location")?.value ||
    "";
  try {
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      return normalizeRegion(parsed.region || parsed.state || parsed.stateName);
    }
  } catch {
    // fall through
  }
  return normalizeRegion(raw) || "tamilnadu";
}

async function applyRegionStock(products, region) {
  if (!products.length) return products;
  if (region !== "karnataka") return products;

  const ids = products.map((p) => p._id).filter(Boolean);
  const codes = products.map((p) => p.item_code).filter(Boolean);
  const owners = await OwnerProduct.find({
    is_active: true,
    $or: [
      { product_id: { $in: ids } },
      ...(codes.length ? [{ product_item_code: { $in: codes } }] : []),
    ],
  }).lean();

  const byProductId = new Map();
  const byCode = new Map();
  for (const owner of owners) {
    if (owner.product_id) byProductId.set(String(owner.product_id), owner);
    if (owner.product_item_code) byCode.set(String(owner.product_item_code), owner);
  }

  return products.map((product) => {
    const owner =
      byProductId.get(String(product._id)) ||
      (product.item_code ? byCode.get(String(product.item_code)) : null);
    const priceInfo = resolveProductPrice(product, owner, region);
    return {
      ...product,
      price: priceInfo.price,
      special_price: priceInfo.special_price,
      quantity: priceInfo.stock,
      stock_status: priceInfo.inStock ? "In Stock" : "Out of Stock",
      isUnilet: priceInfo.isUnilet,
      usingLsp: priceInfo.usingLsp,
    };
  });
}

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");
    const categoryId = searchParams.get("category");
    const brandId = searchParams.get("brand");
    const excludeId = searchParams.get("exclude");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit"), 10) || 10, 1), 20);
    const region = resolveRequestRegion(req, searchParams);

    const seenIds = new Set(
      [excludeId, ...(ids ? ids.split(",") : [])]
        .map((id) => parseObjectId(id))
        .filter(Boolean)
        .map((id) => String(id))
    );
    if (excludeId) {
      const parsed = parseObjectId(excludeId);
      if (parsed) seenIds.add(String(parsed));
    }

    let products = [];

    if (ids) {
      const productIds = ids.split(",").map(parseObjectId).filter(Boolean);
      if (productIds.length) {
        const idDocs = await Product.find({
          _id: { $in: productIds },
          status: "Active",
        }).lean();
        const byId = new Map(idDocs.map((p) => [String(p._id), p]));
        const ordered = productIds.map((id) => byId.get(String(id))).filter(Boolean);
        products = (await applyRegionStock(ordered, region)).filter(isOnlineBuyable);
        products.forEach((p) => seenIds.add(String(p._id)));
      }
    }

    const findMore = async (extraQuery, count) => {
      if (count <= 0 || !categoryId) return [];
      const excludeObjectIds = [...seenIds]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (region === "karnataka") {
        const candidates = await Product.find({
          category: categoryId,
          status: "Active",
          _id: { $nin: excludeObjectIds },
          ...extraQuery,
        })
          .sort({ createdAt: -1 })
          .limit(Math.max(count * 6, 24))
          .lean();
        const priced = (await applyRegionStock(candidates, region)).filter(isOnlineBuyable);
        const picked = priced.slice(0, count);
        picked.forEach((p) => seenIds.add(String(p._id)));
        return picked;
      }

      const found = await Product.find({
        category: categoryId,
        ...ONLINE_IN_STOCK_FILTER,
        _id: { $nin: excludeObjectIds },
        ...extraQuery,
      })
        .limit(Math.max(count * 3, 12))
        .sort({ createdAt: -1 })
        .lean();
      const picked = found.filter(hasDisplayImage).slice(0, count);
      picked.forEach((p) => seenIds.add(String(p._id)));
      return picked;
    };

    if (products.length < limit && categoryId) {
      if (brandId) {
        products = [...products, ...(await findMore({ brand: brandId }, limit - products.length))];
      }
      if (products.length < Math.max(MIN_RELATED, limit)) {
        products = [...products, ...(await findMore({}, limit - products.length))];
      }
    }

    products = uniqueById(products).slice(0, limit);

    if (!ids && !categoryId) {
      return NextResponse.json(
        {
          success: false,
          products: [],
          error: "Related product IDs or category are required",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Related products fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        products: [],
      },
      { status: 500 }
    );
  }
}