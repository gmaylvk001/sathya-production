import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import OwnerProduct from "@/models/OwnerProduct";
import { normalizeRegion } from "@/lib/regionHelper";
import {
  isKarnatakaPincode,
  isUniletProduct,
  isProductDeliverableToPincode,
  getWarehouseByRegion,
  UNILET_RESTRICTION_MESSAGE,
} from "@/lib/productDeliveryHelper";

export const dynamic = "force-dynamic";

function buildOwnerProductQuery(product) {
  return {
    owner_id: "unilet",
    is_active: true,
    $or: [
      ...(product._id ? [{ product_id: product._id }] : []),
      ...(product.item_code
        ? [
            { product_item_code: product.item_code },
            { vendor_item_code: product.item_code },
          ]
        : []),
      ...(product.sku
        ? [
            { product_item_code: product.sku },
            { vendor_item_code: product.sku },
          ]
        : []),
    ],
  };
}

function resolveOwnerStock(ownerProduct) {
  const ownerStock = Number(ownerProduct?.stock ?? ownerProduct?.quantity ?? 0);
  const ownerStatus = String(
    ownerProduct?.stock_status || (ownerStock > 0 ? "In Stock" : "")
  )
    .trim()
    .toLowerCase();
  const inStock = Boolean(
    ownerProduct &&
      ownerStock > 0 &&
      ownerStatus !== "out of stock" &&
      ownerStatus !== "outofstock"
  );
  return { ownerStock, inStock };
}

function isKarnatakaRequest({ pincode, userState, region }) {
  if (isKarnatakaPincode(pincode)) return true;
  if (normalizeRegion(region) === "karnataka") return true;
  if (/karnataka/i.test(String(userState || ""))) return true;
  if (normalizeRegion(String(userState || "")) === "karnataka") return true;
  return false;
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));

    const {
      productId,
      item_code,
      itemCode,
      slug,
      pincode,
      userState,
      state,
      region,
      quantity = 1,
      isQuery = false,
      queryOnly = false,
    } = body;

    const queryMode = Boolean(isQuery || queryOnly);
    const rawCode = item_code || itemCode || slug || "";
    let product = null;

    if (productId) {
      try {
        product = await Product.findById(productId).lean();
      } catch {}
    }
    if (!product && rawCode) {
      product = await Product.findOne({
        $or: [
          { item_code: rawCode },
          { slug: rawCode },
          { sku: rawCode },
        ],
      }).lean();
      if (!product) {
        product = await Product.findOne({
          item_code: new RegExp(
            `^${rawCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
        }).lean();
      }
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const effectivePincode = String(pincode || "").replace(/\D/g, "").trim();
    const effectiveState = userState || state || "";
    const effectiveRegion = region || "";
    const isUnilet = isUniletProduct(product);
    const isKarnataka = isKarnatakaRequest({
      pincode: effectivePincode,
      userState: effectiveState,
      region: effectiveRegion,
    });
    const warehouseInfo = getWarehouseByRegion(
      effectivePincode,
      isUnilet || isKarnataka ? "unilet" : product.vendor
    );

    // Unilet SKUs are only deliverable inside Karnataka
    if (isUnilet) {
      const isDeliverable = isProductDeliverableToPincode(
        product,
        effectivePincode,
        effectiveState
      );
      if (!isDeliverable) {
        return NextResponse.json(
          {
            success: queryMode ? true : false,
            inStock: false,
            availableQuantity: 0,
            stock: 0,
            isDeliverable: false,
            isUnilet: true,
            warehouse: warehouseInfo.warehouseId,
            error: UNILET_RESTRICTION_MESSAGE,
            message: "Out of Stock",
          },
          { status: queryMode ? 200 : 400 }
        );
      }
    }

    // Karnataka (any product): stock from OwnerProduct only — never products.quantity
    if (isKarnataka || isUnilet) {
      const ownerProduct = await OwnerProduct.findOne(
        buildOwnerProductQuery(product)
      ).lean();
      const { ownerStock, inStock } = resolveOwnerStock(ownerProduct);

      if (!inStock) {
        return NextResponse.json(
          {
            success: queryMode ? true : false,
            inStock: false,
            availableQuantity: 0,
            stock: ownerStock,
            isDeliverable: Boolean(isKarnataka || isUnilet),
            isUnilet,
            warehouse: "unilet",
            error: "This product is currently out of stock.",
            message: "Out of Stock",
          },
          { status: queryMode ? 200 : 400 }
        );
      }

      if (ownerStock < Number(quantity) && !queryMode) {
        return NextResponse.json(
          {
            success: false,
            inStock: true,
            availableQuantity: ownerStock,
            stock: ownerStock,
            isDeliverable: true,
            isUnilet,
            warehouse: "unilet",
            error: "Requested quantity exceeds available stock.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        inStock: true,
        availableQuantity: ownerStock,
        stock: ownerStock,
        isDeliverable: true,
        isUnilet,
        warehouse: "unilet",
        message: "In Stock",
      });
    }

    // Standard Sathya (non-Karnataka) stock from products collection
    const prodQty = Number(product.quantity ?? product.stock ?? 0);
    const prodStatus = String(
      product.stock_status || (prodQty > 0 ? "In Stock" : "")
    )
      .trim()
      .toLowerCase();
    const inStock =
      prodQty > 0 &&
      prodStatus !== "out of stock" &&
      prodStatus !== "outofstock";

    if (!inStock) {
      return NextResponse.json(
        {
          success: queryMode ? true : false,
          inStock: false,
          availableQuantity: prodQty,
          stock: prodQty,
          isDeliverable: true,
          isUnilet: false,
          warehouse: "sathya_default",
          error: "This product is currently out of stock.",
          message: "Out of Stock",
        },
        { status: queryMode ? 200 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      inStock: true,
      availableQuantity: prodQty,
      stock: prodQty,
      isDeliverable: true,
      isUnilet: false,
      warehouse: "sathya_default",
      message: "In Stock",
    });
  } catch (err) {
    console.error("validateStock error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const item_code =
      searchParams.get("item_code") || searchParams.get("itemCode");
    const slug = searchParams.get("slug");
    const pincode = searchParams.get("pincode");
    const userState =
      searchParams.get("userState") || searchParams.get("state");
    const region = searchParams.get("region");
    const quantity = Number(searchParams.get("quantity") || 1);

    const syntheticReq = {
      json: async () => ({
        productId,
        item_code,
        slug,
        pincode,
        userState,
        region,
        quantity,
        isQuery: true,
        queryOnly: true,
      }),
    };
    return POST(syntheticReq);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
