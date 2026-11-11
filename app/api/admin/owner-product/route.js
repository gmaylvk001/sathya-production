import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import Product from "@/models/product";
import { requireAdmin } from "@/lib/adminRequest";

async function verifyAdminRequest(req) {
  return await requireAdmin(req);
}

import { normalizeRegion, SUPPORTED_REGIONS } from "@/lib/regionHelper";
import mongoose from "mongoose";

/**
 * GET /api/admin/owner-product
 * Fetch Unilet pricing & stock records or specific product record
 */
export async function GET(req) {
  try {
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || searchParams.get("product_id");
    const itemCode = searchParams.get("itemCode") || searchParams.get("product_item_code");
    const reqRegion = searchParams.get("region") || searchParams.get("state");
    const searchQuery = (searchParams.get("search") || searchParams.get("q") || "").trim();

    if (productId || (itemCode && !searchQuery)) {
      const region = normalizeRegion(reqRegion || "karnataka");
      const query = { owner_id: "unilet", region };
      if (productId) {
        if (mongoose.Types.ObjectId.isValid(productId)) {
          query.product_id = productId;
        } else {
          return NextResponse.json({ success: false, message: "Invalid product_id format" }, { status: 400 });
        }
      } else if (itemCode) {
        query.product_item_code = itemCode;
      }

      let doc = await OwnerProduct.findOne(query).populate("product_id", "name slug price special_price quantity item_code images").lean();
      if (!doc && region === "karnataka" && productId) {
        doc = await OwnerProduct.findOne({ owner_id: "unilet", product_id: productId }).populate("product_id", "name slug price special_price quantity item_code images").lean();
      }

      return NextResponse.json({ success: true, data: doc || null, region });
    }

    // List Unilet products
    const listQuery = { owner_id: "unilet" };
    if (reqRegion && reqRegion !== "all") {
      listQuery.region = normalizeRegion(reqRegion);
    }

    // Paginated list for Unilet Products admin page (?page=&limit=)
    // Without page/limit, keep full list for other callers (e.g. Product List flags).
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const wantsPagination = pageRaw != null || limitRaw != null;

    if (wantsPagination) {
      const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(limitRaw || "25", 10) || 25));
      const skip = (page - 1) * limit;
      const LIST_POPULATE = "name slug price special_price quantity item_code";

      if (searchQuery) {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        const matchingProducts = await Product.find({
          $or: [{ name: regex }, { item_code: regex }],
        })
          .select("_id")
          .lean()
          .limit(500);
        const productIds = matchingProducts.map((p) => p._id);
        listQuery.$or = [
          { product_item_code: regex },
          { vendor_item_code: regex },
          { vendor_product_name: regex },
          ...(productIds.length ? [{ product_id: { $in: productIds } }] : []),
        ];
      }

      const [list, count] = await Promise.all([
        OwnerProduct.find(listQuery)
          .populate("product_id", LIST_POPULATE)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OwnerProduct.countDocuments(listQuery),
      ]);

      return NextResponse.json({
        success: true,
        count,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        data: list,
      });
    }

    let list = await OwnerProduct.find(listQuery)
      .populate("product_id", "name slug price special_price quantity item_code images")
      .sort({ updatedAt: -1 })
      .lean();

    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const pName = (item.product_id?.name || item.vendor_product_name || "").toLowerCase();
        const pItemCode = (item.product_item_code || item.product_id?.item_code || "").toLowerCase();
        const vItemCode = (item.vendor_item_code || "").toLowerCase();
        const prodId = (item.product_id?._id?.toString() || item.product_id?.item_code || "").toLowerCase();
        return (
          pName.includes(s) ||
          pItemCode.includes(s) ||
          vItemCode.includes(s) ||
          prodId.includes(s)
        );
      });
    }

    return NextResponse.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("GET /api/admin/owner-product error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/owner-product
 * Create or update Unilet owner product record
 */
export async function POST(req) {
  try {
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      product_id,
      product_item_code,
      vendor_item_code,
      vendor_product_name,
      price,
      offer_price = 0,
      stock = 0,
      stock_status = "In Stock",
      is_active = true,
      delivery_days = 1,
      region: reqRegion = "karnataka",
    } = body;

    if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
      return NextResponse.json(
        { success: false, message: "Valid product_id is required" },
        { status: 400 }
      );
    }

    const region = normalizeRegion(reqRegion);
    if (!SUPPORTED_REGIONS.includes(region)) {
      return NextResponse.json(
        { success: false, message: "Invalid region specified" },
        { status: 400 }
      );
    }

    const numPrice = Number(price);
    const numOfferPrice = Number(offer_price);
    const numStock = Number(stock);

    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { success: false, message: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(numOfferPrice) || numOfferPrice < 0) {
      return NextResponse.json(
        { success: false, message: "Offer price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(numStock) || numStock < 0) {
      return NextResponse.json(
        { success: false, message: "Stock must be a non-negative number" },
        { status: 400 }
      );
    }

    if (numOfferPrice > 0 && numOfferPrice > numPrice) {
      return NextResponse.json(
        { success: false, message: "Offer price cannot exceed standard price" },
        { status: 400 }
      );
    }

    // Verify parent product exists
    const parentProduct = await Product.findById(product_id).lean();
    if (!parentProduct) {
      return NextResponse.json(
        { success: false, message: "Referenced Product does not exist" },
        { status: 404 }
      );
    }

    const itemCodeToSave = product_item_code || parentProduct.item_code || "";
    const vendorCodeToSave = vendor_item_code || (itemCodeToSave ? `${itemCodeToSave}_U` : "");
    const vendorNameToSave = vendor_product_name || parentProduct.name || "";

    const payload = {
      owner_id: "unilet",
      product_id,
      product_item_code: itemCodeToSave,
      vendor_item_code: vendorCodeToSave,
      vendor_product_name: vendorNameToSave,
      price: numPrice,
      offer_price: numOfferPrice,
      stock: numStock,
      stock_status: numStock > 0 ? stock_status : "Out of Stock",
      is_active: Boolean(is_active),
      delivery_days: Number(delivery_days) || 1,
      region,
    };

    const doc = await OwnerProduct.findOneAndUpdate(
      { owner_id: "unilet", product_id, region },
      { $set: payload },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: doc }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/owner-product error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/owner-product
 * Update existing Unilet owner product record
 */
export async function PUT(req) {
  return POST(req);
}

/**
 * DELETE /api/admin/owner-product
 * Delete or deactivate Unilet owner product record
 */
export async function DELETE(req) {
  try {
    await dbConnect();
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const productId = searchParams.get("productId") || searchParams.get("product_id");
    const reqRegion = searchParams.get("region") || searchParams.get("state") || "karnataka";
    const region = normalizeRegion(reqRegion);

    if (!id && !productId) {
      return NextResponse.json(
        { success: false, message: "id or productId is required for deletion" },
        { status: 400 }
      );
    }

    let query;
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, message: "Invalid id format" }, { status: 400 });
      }
      query = { _id: id };
    } else {
      query = { owner_id: "unilet", product_id: productId };
    }

    await OwnerProduct.deleteOne(query);

    return NextResponse.json({ success: true, message: "Region pricing record deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/owner-product error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
