import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import ProductStore from "@/models/product_store";
import ZTrackApi from "@/models/z_track_api";

export const dynamic = "force-dynamic";

const RESERVED_STORE_KEYS = new Set(["_id", "__v", "item_code"]);

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Private copy of the pushed data (not under public/), one file per day like exist storage.
function saveStockLog(data) {
  try {
    const dir = path.join(process.cwd(), "storage", "stock_update");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `stock_${todayInKolkata()}.json`), JSON.stringify(data));
  } catch (err) {
    console.warn("[stock_update] Could not save stock log:", err.message);
  }
}

function toQty(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * POST /apis/stock_update
 * Exist HomeController::stockUpdate
 * Body: { api_token, data: [{ ItemCode, totalQty, sku: [{ store, quantity }] }] }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const expectedToken = process.env.STOCK_UPDATE_API_TOKEN;

    if (!body || !expectedToken || body.api_token !== expectedToken) {
      return NextResponse.json({ status: "Unauthorized" }, { status: 401 });
    }
    if (!Array.isArray(body.data)) {
      return NextResponse.json({ status: "Error", message: "data must be an array" }, { status: 400 });
    }

    await dbConnect();
    saveStockLog(body.data);

    for (const da of body.data) {
      const itemCode = String(da?.ItemCode ?? "").trim();
      if (!itemCode) continue;

      await Product.updateMany({ item_code: itemCode }, { $set: { quantity: toQty(da.totalQty) } });

      // Every store field on this item starts at 0, then the pushed store quantities are applied.
      const existing = await ProductStore.findOne({ item_code: itemCode }).lean();
      const storeStock = {};
      if (existing) {
        for (const key of Object.keys(existing)) {
          if (!RESERVED_STORE_KEYS.has(key)) storeStock[key] = 0;
        }
      }

      const pushed = {};
      for (const db of Array.isArray(da.sku) ? da.sku : []) {
        const store = String(db?.store ?? "").trim();
        if (!store || RESERVED_STORE_KEYS.has(store) || store.startsWith("$") || store.includes(".")) continue;
        if (!(store in storeStock)) storeStock[store] = 0;
        const qty = toQty(db.quantity);
        if (qty) pushed[store] = qty;
      }

      if (existing) {
        await ProductStore.updateOne(
          { _id: existing._id },
          { $set: { ...storeStock, ...pushed } },
          { strict: false }
        );
      } else if (Object.keys(pushed).length) {
        await ProductStore.collection.insertOne({ item_code: itemCode, ...storeStock, ...pushed });
      }
    }

    await ZTrackApi.create({ type: "Delta_updtae" });

    return NextResponse.json({ status: "Success" }, { status: 201 });
  } catch (error) {
    console.error("[stock_update] Error:", error);
    return NextResponse.json({ status: "Error", message: error.message }, { status: 500 });
  }
}
