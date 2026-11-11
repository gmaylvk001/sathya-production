import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import Product from "@/models/product";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /apis/unilet_stock_price_update
 * Inbound API endpoint for Unilet ERP to push pricing updates.
 * Updates OwnerProduct.price and OwnerProduct.offer_price mapped by vendor_item_code or product_item_code.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const expectedToken =
      process.env.UNILET_API_TOKEN || process.env.MY_SECRET_TOKEN || "";

    // Fail closed: require env token and body.api_token; reject mismatch
    if (!expectedToken || !body.api_token || body.api_token !== expectedToken) {
      return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
    }

    // Save audit log to public/uploads/unilet_price
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "unilet_price");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `price_${Date.now()}.json`;
      fs.writeFileSync(path.join(uploadDir, filename), JSON.stringify(body, null, 2));
    } catch (logErr) {
      console.warn("[unilet_stock_price_update] Could not save upload log:", logErr.message);
    }

    const items =
      body.sku ||
      body.data ||
      body.products ||
      body.items ||
      (Array.isArray(body) ? body : null);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload format. Expected array of items in 'sku' or 'data'." },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let createdCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        const vendorCode = String(
          item.vendor_item_code ||
          item.VendorItemCode ||
          item.item_code ||
          item.ItemCode ||
          item.sku ||
          ""
        ).trim();

        const sathyaCode = String(
          item.product_item_code ||
          item.sathya_item_code ||
          item.ProductItemCode ||
          ""
        ).trim();

        if (!vendorCode && !sathyaCode) {
          continue;
        }

        const rawPrice = item.price ?? item.mrp ?? item.branch_price;
        const rawOfferPrice =
          item.offer_price ??
          item.spl_price ??
          item.special_price ??
          item.final_price;

        const price = rawPrice != null ? parseFloat(rawPrice) : null;
        const offerPrice = rawOfferPrice != null ? parseFloat(rawOfferPrice) : null;
        const status = item.status || item.Status;
        const vendorName = item.vendor_product_name || item.item_description || item.name;

        // 1. Try finding existing OwnerProduct by vendor_item_code
        let ownerProduct = null;
        if (vendorCode) {
          ownerProduct = await OwnerProduct.findOne({
            owner_id: "unilet",
            vendor_item_code: vendorCode,
          });
        }

        // 2. Try by product_item_code
        if (!ownerProduct && sathyaCode) {
          ownerProduct = await OwnerProduct.findOne({
            owner_id: "unilet",
            product_item_code: sathyaCode,
          });
        }

        // 3. Fallback: try vendorCode matching product_item_code
        if (!ownerProduct && vendorCode) {
          ownerProduct = await OwnerProduct.findOne({
            owner_id: "unilet",
            product_item_code: vendorCode,
          });
        }

        if (ownerProduct) {
          if (price != null && !isNaN(price)) {
            ownerProduct.price = price;
          }
          if (offerPrice != null && !isNaN(offerPrice)) {
            ownerProduct.offer_price = offerPrice;
          }
          if (status !== undefined) {
            ownerProduct.is_active =
              status !== "InActive" &&
              status !== "inactive" &&
              status !== false &&
              status !== "0";
          }
          if (vendorName) {
            ownerProduct.vendor_product_name = vendorName;
          }
          if (vendorCode && !ownerProduct.vendor_item_code) {
            ownerProduct.vendor_item_code = vendorCode;
          }
          await ownerProduct.save();
          updatedCount++;
        } else {
          // Check if corresponding Sathya Product exists to establish mapping
          const product = await Product.findOne({
            item_code: sathyaCode || vendorCode,
          });

          if (product) {
            const newPrice = price != null && !isNaN(price) ? price : (product.price || 0);
            const newOfferPrice =
              offerPrice != null && !isNaN(offerPrice)
                ? offerPrice
                : (product.special_price || 0);

            const isActive =
              status !== undefined
                ? status !== "InActive" && status !== "inactive" && status !== false
                : true;

            await OwnerProduct.create({
              owner_id: "unilet",
              product_id: product._id,
              product_item_code: product.item_code,
              vendor_item_code: vendorCode || `${product.item_code}_U`,
              vendor_product_name: vendorName || product.name,
              price: newPrice,
              offer_price: newOfferPrice,
              stock: 0,
              stock_status: "Out of Stock",
              region: "karnataka",
              is_active: isActive,
              delivery_days: 1,
            });
            createdCount++;
          }
        }
      } catch (itemErr) {
        errors.push({ item, error: itemErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Unilet price update processed successfully",
      updated: updatedCount,
      created: createdCount,
      total_received: items.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("[unilet_stock_price_update] Error:", error);
    return NextResponse.json(
      { error: "Failed to process Unilet price update: " + error.message },
      { status: 500 }
    );
  }
}
