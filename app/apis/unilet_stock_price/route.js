import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";
import ProductAllU from "@/models/product_all_u";

export const dynamic = "force-dynamic";

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Private copy of every push (not under public/), like Laravel Storage::put("unilet_product_all/...").
function saveRequestCopy(data) {
  try {
    const dir = path.join(process.cwd(), "storage", "unilet_product_all");
    fs.mkdirSync(dir, { recursive: true });
    const randNo = Math.floor(1234 + Math.random() * (9876 - 1234 + 1));
    fs.writeFileSync(path.join(dir, `product_${todayInKolkata()}_${randNo}.json`), JSON.stringify(data));
  } catch (err) {
    console.warn("[unilet_stock_price] Could not save request copy:", err.message);
  }
}

// Laravel onPriceUniletStore(): .env on_unilet_price_update=on/off (missing = off, key is case-insensitive).
function onPriceUniletStore() {
  const key = Object.keys(process.env).find((k) => k.toLowerCase() === "on_unilet_price_update");
  const value = String((key && process.env[key]) || "").trim().replace(/^["']|["']$/g, "").toLowerCase();
  return ["on", "1", "true", "yes"].includes(value);
}

// PHP `$value != null` is false for null, "", 0, "0" and false.
function isPhpNull(value) {
  return value === null || value === undefined || value === "" || value === 0 || value === "0" || value === false;
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStr(value) {
  return value === null || value === undefined ? null : String(value);
}

// product_all_u only: spl_price >= price → price = spl_price, spl_price = 0; otherwise both as sent.
function resolvePrices(item) {
  const price = toNum(item.price);
  const splPrice = toNum(item.spl_price);
  return splPrice >= price ? { price: splPrice, splPrice: 0 } : { price, splPrice };
}

// OwnerProduct: price = sent price, offer_price = sent spl_price (no swap).
function sentPrices(item) {
  return { price: toNum(item.price), offerPrice: toNum(item.spl_price) };
}

function productAllUData(item, price, splPrice) {
  const isCommonType = item.Common_Type === "No" ? 0 : 1;
  const commonItemCode = isCommonType === 1 && !isPhpNull(item.Common_Model) ? String(item.Common_Model) : null;

  return {
    quantity: toNumOrNull(item.quantity),
    price,
    spl_price: splPrice,
    final_price: toNumOrNull(item.final_price),
    brand_code: toStr(item.brand_code),
    movement: toStr(item.movement),
    rank: toNumOrNull(item.rank),
    item_description: toStr(item.item_description),
    brand: toStr(item.brand),
    group_property: toStr(item.group_property),
    brand_id: toStr(item.brand_id),
    bfl_id: toStr(item.bfl_id),
    status: toStr(item.Status),
    ean: toStr(item.EANCode),
    is_common_type: isCommonType,
    common_item_code: commonItemCode,
  };
}

/**
 * POST /apis/unilet_stock_price
 * Exist Laravel stockPriceUnilet
 * Body: { api_token, sku: [{ item_code, quantity, price, spl_price, final_price, branch_price, brand_code,
 *   movement, rank, item_description, brand, group_property, brand_id, bfl_id, Status, EANCode,
 *   Common_Type ("No" | "In-Door" | "Out-Door"), Common_Model, Common_EANCode }] }
 */
export async function POST(req) {
  const body = await req.json().catch(() => null);
  const expectedToken = process.env.UNILET_STOCK_API_TOKEN;

  if (!body || !expectedToken || body.api_token !== expectedToken) {
    return NextResponse.json({ error: "400 - API Token Required" }, { status: 400 });
  }

  saveRequestCopy(body);

  try {
    if (!Array.isArray(body.sku)) {
      throw new Error("sku must be an array");
    }

    await dbConnect();
    const priceOnStore = onPriceUniletStore();

    // Pass 1: Out-Door units keyed by Common_Model, merged into their In-Door unit in pass 2.
    const outDoorByCommonModel = new Map();
    for (const item of body.sku) {
      if (!item || isPhpNull(item.Common_Model) || item.Common_Type !== "Out-Door") continue;
      const { price, offerPrice } = sentPrices(item);
      outDoorByCommonModel.set(String(item.Common_Model), {
        outdoor_item_code: toStr(item.item_code),
        outdoor_ean: toStr(item.Common_EANCode),
        price,
        spl_price: offerPrice,
        final_price: toNum(item.final_price),
        store_price: toNum(item.branch_price),
        od_price: price,
        od_spl_price: offerPrice,
        od_final_price: toNum(item.final_price),
        od_store_price: toNum(item.branch_price),
      });
    }

    let updateResult = null;
    let updateMessage = "Default_message_success";

    // Pass 2: product_all_u upsert, then the linked Unilet OwnerProduct.
    for (const item of body.sku) {
      const itemCode = String(item?.item_code ?? "").trim();
      if (!itemCode) continue;

      const allUPrices = resolvePrices(item);
      const allUData = productAllUData(item, allUPrices.price, allUPrices.splPrice);

      if (await ProductAllU.exists({ item_code: itemCode })) {
        await ProductAllU.updateMany({ item_code: itemCode }, { $set: allUData });
      } else {
        await ProductAllU.create({ item_code: itemCode, ...allUData });
      }

      const ownerProduct = await OwnerProduct.findOne({ vendor_item_code: itemCode }).lean();
      if (!ownerProduct) continue;

      const { price, offerPrice } = sentPrices(item);
      const status = toStr(item.Status);
      const isActive = item.Status === "Active";

      if (!priceOnStore) {
        await OwnerProduct.updateMany(
          { vendor_item_code: itemCode },
          { $set: { stock: toNum(item.quantity), status, is_active: isActive } }
        );
        updateResult = "quantity";
        updateMessage = "Succesfully Update Unilet Quantity Inventory";
        continue;
      }

      if (item.brand === "GIFT") {
        await OwnerProduct.updateMany(
          { vendor_item_code: ownerProduct.vendor_item_code },
          {
            $set: {
              stock: toNum(item.quantity),
              price,
              offer_price: offerPrice,
              final_price: toNum(item.final_price),
              store_price: toNum(item.branch_price),
              movement: toStr(item.movement),
              rank: toNumOrNull(item.rank),
              ean: toStr(item.EANCode),
            },
          }
        );
      } else {
        const update = {
          stock: toNum(item.quantity),
          store_price: toNum(item.branch_price),
          movement: toStr(item.movement),
          rank: toNumOrNull(item.rank),
          ean: toStr(item.EANCode),
          price,
        };

        const isInDoorCommon = toNum(ownerProduct.is_common_type) === 1 && item.Common_Type === "In-Door";
        let outDoorSpecialPrice = 0;
        let outDoorFinalPrice = 0;

        if (isInDoorCommon) {
          update.indoor_ean = toStr(item.Common_EANCode);
          update.common_item_code = toStr(item.Common_Model);
          update.id_spl_price = offerPrice;
          update.id_final_price = toNum(item.final_price);
          update.id_price = price;
          update.id_store_price = toNum(item.branch_price);

          const outDoor = !isPhpNull(item.Common_Model) ? outDoorByCommonModel.get(String(item.Common_Model)) : null;
          if (outDoor) {
            update.outdoor_item_code = outDoor.outdoor_item_code;
            update.outdoor_ean = outDoor.outdoor_ean;
            update.od_price = outDoor.od_price;
            update.od_spl_price = outDoor.od_spl_price;
            update.od_final_price = outDoor.od_final_price;
            update.od_store_price = outDoor.od_store_price;
            update.store_price = toNum(item.branch_price) + outDoor.store_price;
            update.price = price + outDoor.price;
            outDoorSpecialPrice = outDoor.spl_price;
            outDoorFinalPrice = outDoor.final_price;
          }
        }

        if (toNum(ownerProduct.is_sync_status) === 0) {
          update.status = status;
          update.is_active = isActive;
          update.stock_status = isActive ? "In Stock" : "Out of Stock";

          // Combo AC without an In-Door or Out-Door offer price is switched off.
          if (isInDoorCommon && (offerPrice <= 0 || outDoorSpecialPrice <= 0)) {
            update.status = "InActive";
            update.is_active = false;
            update.stock_status = "Out of Stock";
          }
        }

        if (toNum(ownerProduct.is_manual_price) === 0) {
          update.offer_price = offerPrice + outDoorSpecialPrice;
          update.final_price = toNum(item.final_price) + outDoorFinalPrice;
        }

        await OwnerProduct.updateMany({ vendor_item_code: ownerProduct.vendor_item_code }, { $set: update });
      }

      updateResult = "quantity_price";
      updateMessage = "Succesfully Inventory Update Unilet Quantity And Price";
    }

    if (updateResult !== null) {
      return NextResponse.json({ message: updateMessage }, { status: 201 });
    }
    return NextResponse.json({ message: "Succesfully Try Block Update Unilet Inventory" }, { status: 201 });
  } catch (error) {
    console.error("[unilet_stock_price] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 402 });
  }
}
