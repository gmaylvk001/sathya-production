import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import OwnerProduct from "@/models/OwnerProduct";

function itemCodeVariants(raw) {
  const code = String(raw || "").trim();
  if (!code) return [];
  const withItem = /^ITEM/i.test(code) ? code : `ITEM${code}`;
  const bare = code.replace(/^ITEM/i, "");
  return [...new Set([code, withItem, bare].filter(Boolean))];
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ success: true, allExist: true, items: [] });
    }

    const productIds = [];
    const codes = new Set();

    const normalized = items.map((item) => {
      const rawId = item?.productId || item?.id || item?._id || item?.product_id || "";
      const productId = rawId && typeof rawId === "object" ? rawId._id || rawId.id || "" : rawId;
      const codesForItem = itemCodeVariants(item?.item_code || item?.itemCode || "");
      codesForItem.forEach((code) => codes.add(code));
      if (productId && mongoose.isValidObjectId(String(productId))) {
        productIds.push(new mongoose.Types.ObjectId(String(productId)));
      }
      return {
        name: String(item?.name || item?.product_name || "Product").trim(),
        productId: String(productId || ""),
        codes: codesForItem,
      };
    });

    const or = [];
    if (productIds.length) or.push({ product_id: { $in: productIds } });
    if (codes.size) {
      const codeList = [...codes];
      or.push({ product_item_code: { $in: codeList } });
      or.push({ vendor_item_code: { $in: codeList } });
    }

    const owners = or.length
      ? await OwnerProduct.find({
          $and: [
            {
              $or: [
                { owner_id: { $regex: /^unilet$/i } },
                { store_owner: { $regex: /^unilet$/i } },
                { region: "karnataka" },
              ],
            },
            { is_active: true },
            { $or: or },
          ],
        })
          .select("product_id product_item_code vendor_item_code stock stock_status")
          .lean()
      : [];

    const idSet = new Set(owners.map((row) => String(row.product_id || "")));
    const codeSet = new Set();
    owners.forEach((row) => {
      if (row.product_item_code) codeSet.add(String(row.product_item_code));
      if (row.vendor_item_code) codeSet.add(String(row.vendor_item_code));
    });

    const results = normalized.map((item) => {
      const exists =
        (item.productId && idSet.has(item.productId)) ||
        item.codes.some((code) => codeSet.has(code));
      return {
        name: item.name,
        productId: item.productId,
        exists,
      };
    });

    return NextResponse.json({
      success: true,
      allExist: results.every((item) => item.exists),
      items: results,
    });
  } catch (error) {
    console.error("POST /api/owner-product/check error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to check Karnataka product availability" },
      { status: 500 }
    );
  }
}
