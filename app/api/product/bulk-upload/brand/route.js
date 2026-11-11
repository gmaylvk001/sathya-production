import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import { NextResponse } from "next/server";

// 🔧 Helper to decode Excel/CSV
const parseExcelOrCsv = async (excelFile) => {
  const XLSX = await import("xlsx");
  const name = excelFile.name ? excelFile.name.toLowerCase() : "";
  const arrayBuffer = await excelFile.arrayBuffer();
  let rows = [];

  if (name.endsWith(".csv")) {
    const csvText = new TextDecoder("utf-8").decode(arrayBuffer);
    const workbook = XLSX.read(csvText, { type: "string" });
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  } else {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  }

  return rows;
};

// 🔧 Helper to slugify brand names (lowercase + hyphen)
const slugify = (text) =>
  text.toString().toLowerCase().trim().replace(/\s+/g, "-");

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const excelFile = formData.get("excel");
    const uploadType = (formData.get("uploadType") || "").toString();

    // ------------------- BULK UPLOAD (Excel/CSV) -------------------
    if (excelFile && uploadType === "map_product_categories") {
      const rows = await parseExcelOrCsv(excelFile);

      const results = {
        updatedCount: 0,
        skipped: 0,
        errors: [],
      };

      for (const [idx, row] of rows.entries()) {
        try {
          const item_code = (
            row.ItemNo ||
            row.itemno ||
            row.item_no ||
            row.ItemCode ||
            row.itemcode ||
            ""
          )
            .toString()
            .trim();

          const brandValue = (
            row.BrandCode ||
            row.brandcode ||
            row.brand_code ||
            ""
          )
            .toString()
            .trim();

          if (!item_code) {
            results.errors.push({ row: idx + 2, error: "Missing ItemCode" });
            continue;
          }

          if (!brandValue) {
            results.errors.push({ row: idx + 2, error: "Missing BrandCode" });
            continue;
          }

          const brandSlug = slugify(brandValue);
          const brandInfo = await Brand.findOne({ brand_slug: brandSlug });

          if (!brandInfo) {
            results.errors.push({
              row: idx + 2,
              error: `Brand not found for BrandCode: ${brandSlug}`,
            });
            continue;
          }

          const updatedProduct = await Product.findOneAndUpdate(
            { item_code },
            { brand: brandInfo._id },
            { new: true }
          );

          if (!updatedProduct) {
            results.errors.push({
              row: idx + 2,
              error: `Product not found for ItemCode: ${item_code}`,
            });
            results.skipped++;
            continue;
          }

          results.updatedCount++;
        } catch (err) {
          results.errors.push({
            row: idx + 2,
            error: err.message || "Unknown error",
          });
        }
      }

      const status = results.errors.length && results.updatedCount === 0 ? 400 : 200;

      return NextResponse.json(
        {
          message:
            results.updatedCount > 0
              ? `${results.updatedCount} products updated successfully.`
              : "No products were updated.",
          ...results,
        },
        { status }
      );
    }

    // ------------------- SINGLE PRODUCT UPDATE -------------------
    const item_code = (formData.get("item_code") || "").trim();
    const brandValue = (formData.get("BrandCode") || "").trim();

    if (!item_code) {
      return NextResponse.json({ error: "Item code is required." }, { status: 400 });
    }

    if (!brandValue) {
      return NextResponse.json({ error: "Brand is required." }, { status: 400 });
    }

    const brandSlug = slugify(brandValue);
    const brandInfo = await Brand.findOne({ brand_slug: brandSlug });

    if (!brandInfo) {
      return NextResponse.json(
        { error: `Brand not found for BrandCode: ${brandSlug}` },
        { status: 404 }
      );
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { item_code },
      { brand: brandInfo._id },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Product not found with the given item code." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Product brand updated successfully.",
        data: updatedProduct,
        resetForm: true, 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating product brand:", error);
    return NextResponse.json(
      { error: "Failed to update product brand.", details: error.message },
      { status: 500 }
    );
  }
}
