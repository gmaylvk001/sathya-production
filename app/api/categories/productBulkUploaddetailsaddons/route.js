import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import * as XLSX from "xlsx";
import Product from "@/models/product";

/* ---------- HELPERS ---------- */
const normalize = (val) =>
  val?.toString().trim().replace(/\s+/g, " ");

/* 🔹 featured → _id as STRING[] */
const getStringIdsFromItemCodes = async (codesString) => {
  if (!codesString) return [];

  const codes = codesString
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (codes.length === 0) return [];

  const products = await Product.find(
    { item_code: { $in: codes } },
    { _id: 1, item_code: 1 }
  );

  const idMap = {};
  products.forEach((p) => {
    idMap[p.item_code] = p._id.toString(); // 🔥 முக்கியம்
  });

  return codes.map((c) => idMap[c]).filter(Boolean);
};

/* 🔹 related & add_ons → ObjectId[] */
const getObjectIdsFromItemCodes = async (codesString) => {
  if (!codesString) return [];

  const codes = codesString
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (codes.length === 0) return [];

  const products = await Product.find(
    { item_code: { $in: codes } },
    { _id: 1, item_code: 1 }
  );

  const idMap = {};
  products.forEach((p) => {
    idMap[p.item_code] = p._id;
  });

  return codes.map((c) => idMap[c]).filter(Boolean);
};

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const itemCode = normalize(
        row["item_code"] || row["Item Code"]
      );

      const featuredStr = normalize(row["featured_products"]);
      const relatedStr = normalize(row["related_products"]);
      const addonsStr = normalize(row["add_ons"]);

      if (!itemCode) {
        skipped++;
        continue;
      }

      /* 🔥 IF featured_products IS {} → CONVERT TO [] */
      await Product.updateOne(
        {
          item_code: itemCode,
          featured_products: { $type: "object" },
        },
        {
          $set: {
            featured_products: [],
          },
        }
      );


      /* 🔄 Convert */
      const featuredIds = await getStringIdsFromItemCodes(featuredStr); // string[]
      const relatedIds = await getObjectIdsFromItemCodes(relatedStr);   // ObjectId[]
      const addonIds = await getObjectIdsFromItemCodes(addonsStr);     // ObjectId[]

      const updateQuery = {};

      /* 🔥 APPEND WITHOUT DUPLICATES */
      if (featuredIds.length > 0) {
        updateQuery.$addToSet = {
          ...updateQuery.$addToSet,
          featured_products: { $each: featuredIds },
        };
      }

      if (relatedIds.length > 0) {
        updateQuery.$addToSet = {
          ...updateQuery.$addToSet,
          related_products: { $each: relatedIds },
        };
      }

      if (addonIds.length > 0) {
        updateQuery.$addToSet = {
          ...updateQuery.$addToSet,
          add_ons: { $each: addonIds },
        };
      }

      if (!updateQuery.$addToSet) {
        skipped++;
        continue;
      }

      const result = await Product.updateOne(
        { item_code: itemCode },
        updateQuery
      );

      if (result.matchedCount > 0) {
        updated++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      updated,
      skipped,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}