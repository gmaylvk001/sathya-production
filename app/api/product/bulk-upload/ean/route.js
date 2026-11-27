import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db";
import Product from "@/models/product";

function getCellString(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) {
      const val =
        typeof row[key] === "number"
          ? String(row[key]).trim()
          : String(row[key]).trim();
      if (val !== "") return val;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("excel") || formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "Excel or CSV file is required." },
        { status: 400 }
      );
    }

    const fileName = (file.name || "").toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rows = [];
    if (fileName.endsWith(".csv")) {
      const csvText = buffer.toString("utf-8");
      const workbook = XLSX.read(csvText, { type: "string", raw: true });
      rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        { defval: "", raw: true }
      );
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        { defval: "", raw: true }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Uploaded file contains no data rows." },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const item_code = getCellString(row, [
          "item_code",
          "Item Code",
          "Item_Code",
          "item code",
          "ItemCode",
          "product_item_code",
          "product item_code",
        ]);

        if (!item_code) {
          skippedCount++;
          continue;
        }

        const update = {};

        const ean = getCellString(row, ["ean", "EAN", "Ean"]);
        if (ean !== null) {
          update.ean = ean;
        }

        const indoorEan = getCellString(row, [
          "indoor_ean",
          "Indoor EAN",
          "indoor ean",
          "Indoor_EAN",
          "indoorEan",
        ]);
        if (indoorEan !== null) {
          update.indoor_ean = indoorEan;
        }

        const outdoorEan = getCellString(row, [
          "outdoor_ean",
          "Outdoor EAN",
          "outdoor ean",
          "Outdoor_EAN",
          "outdoorEan",
        ]);
        if (outdoorEan !== null) {
          update.outdoor_ean = outdoorEan;
        }

        if (Object.keys(update).length === 0) {
          skippedCount++;
          continue;
        }

        const product = await Product.findOne({ item_code }).select(
          "_id item_code"
        );

        if (!product) {
          skippedCount++;
          errors.push({
            row: index + 2,
            item_code,
            error: `Product with item_code '${item_code}' not found`,
          });
          continue;
        }

        update.updatedAt = new Date();

        await Product.updateOne({ _id: product._id }, { $set: update });

        updatedCount++;
      } catch (err) {
        errors.push({
          row: index + 2,
          error: err.message,
        });
      }
    }

    return NextResponse.json(
      {
        message: `Completed: ${updatedCount} updated, ${skippedCount} skipped`,
        updatedCount,
        skippedCount,
        errors,
      },
      { status: errors.length > 0 && updatedCount === 0 ? 400 : 200 }
    );
  } catch (error) {
    console.error("EAN bulk upload error:", error);
    return NextResponse.json(
      { error: "EAN bulk upload error: " + (error.message || error) },
      { status: 500 }
    );
  }
}
