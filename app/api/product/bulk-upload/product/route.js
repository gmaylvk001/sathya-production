import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import { NextResponse } from "next/server";

// add slugify helper
const slugify = (s) => s.toString().toLowerCase().replace(/\s+/g, "-");

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const excelFile = formData.get("excel");
    const uploadType = (formData.get("uploadType") || "").toString();

    // ------------------- BULK UPLOAD (Excel/CSV) -------------------
    if (excelFile && uploadType === "map_product_categories") {
      const XLSX = await import("xlsx");
      const name = excelFile.name ? excelFile.name.toLowerCase() : "";
      const arrayBuffer = await excelFile.arrayBuffer();
      let rows = [];

      // Parse Excel or CSV file
      if (name.endsWith(".csv")) {
        const csvText = new TextDecoder("utf-8").decode(arrayBuffer);
        const workbook = XLSX.read(csvText, { type: "string" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      } else {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      }

      // Prepare result object
      const results = { updatedCount: 0, skipped: 0, errors: [] };

      // Collect all unique category slugs and all item_codes up front
      const uniqueCategorySlugs = new Set();
      const parsedRows = []; // keep parsed mapping rows with original idx and slugs
      for (const [idx, row] of rows.entries()) {
        const item_code = (
          row.ItemCode ||
          row.itemno ||
          row.item_no ||
          row.ItemCode ||
          row.itemcode ||
          ""
        )
          .toString()
          .trim();

        const MappingCategory = (
          row.MappingCategory ||
          row.mappingcategory ||
          row.mapping_category ||
          ""
        )
          .toString()
          .trim();

        if (!item_code) {
          results.errors.push({ row: idx + 2, error: "Missing ItemCode" });
          continue;
        }
        if (!MappingCategory) {
          results.errors.push({ row: idx + 2, error: "Missing MappingCategory" });
          continue;
        }

        const parts = MappingCategory.split(">").map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) {
          results.errors.push({ row: idx + 2, error: "Invalid MappingCategory format" });
          continue;
        }

        // create slugified parts for DB lookup
        const partsSlugs = parts.map(p => slugify(p));
        partsSlugs.forEach(s => uniqueCategorySlugs.add(s));
        parsedRows.push({ idx, item_code, parts, partsSlugs });
      }

      // If no valid parsed rows
      if (parsedRows.length === 0) {
        const status = results.errors.length ? 400 : 200;
        return NextResponse.json(results, { status });
      }

      // Fetch all categories in a single query (by slug)
      const categorySlugsArray = Array.from(uniqueCategorySlugs);
      const categories = await Category.find({ category_slug: { $in: categorySlugsArray } }).lean();
      const catMap = new Map(categories.map(c => [c.category_slug, c]));

      // Build update operations after mapping categories using cached catMap
      const ops = [];
      const itemCodesToUpdate = [];
      for (const parsed of parsedRows) {
        const { idx, item_code, parts, partsSlugs } = parsed;
        // Build md5/name lists and find ids using catMap
        let category = null;
        let sub_category = null;
        let category_new = "";
        const subCategoryMd5List = [];
        const subCategoryNameList = [];

        for (let i = 0; i < partsSlugs.length; i++) {
          const catInfo = catMap.get(partsSlugs[i]);
          if (!catInfo) continue;
          if (i === 0 && catInfo.md5_cat_name) category_new = catInfo.md5_cat_name;
          if (catInfo.md5_cat_name) subCategoryMd5List.push(catInfo.md5_cat_name);
          if (catInfo.category_name) subCategoryNameList.push(catInfo.category_name);
        }

        const sub_category_new = subCategoryMd5List.join("##");
        const sub_category_new_name = subCategoryNameList.join("##");

        // reversed parts to find sub_category (leaf) and category (parent)
        const reversedPartsSlugs = [...partsSlugs].reverse();
        for (let i = 0; i < reversedPartsSlugs.length; i++) {
          const catInfo = catMap.get(reversedPartsSlugs[i]);
          if (!catInfo) continue;
          if (i === 0) sub_category = catInfo._id;
          else if (i === 1) category = catInfo._id;
        }

        // Validation
        if (!category || !sub_category || !category_new || !sub_category_new || !sub_category_new_name) {
          results.errors.push({ row: idx + 2, error: "Failed to map category/sub-category (not found)" });
          continue;
        }

        // Queue for existence check and bulk update
        itemCodesToUpdate.push(item_code);
        ops.push({
          item_code,
          update: {
            category,
            sub_category,
            category_new,
            sub_category_new,
            sub_category_new_name,
          },
          row: idx + 2, // preserve row for possible error reporting
        });
      }

      // If no ops to run
      if (ops.length === 0) {
        const status = results.errors.length ? 400 : 200;
        return NextResponse.json(results, { status });
      }

      // Find which item_codes actually exist (single query)
      const existingProducts = await Product.find({ item_code: { $in: itemCodesToUpdate } }, { item_code: 1 }).lean();
      const existingSet = new Set(existingProducts.map(p => p.item_code));

      // Prepare bulkWrite operations only for existing products, mark skipped for missing
      const bulkOps = [];
      for (const op of ops) {
        if (!existingSet.has(op.item_code)) {
          results.errors.push({ row: op.row, error: "Product not found with the given ItemCode" });
          results.skipped++;
          continue;
        }
        bulkOps.push({
          updateOne: {
            filter: { item_code: op.item_code },
            update: { $set: op.update },
            // no upsert: don't create new products
          }
        });
      }

      // Execute bulkWrite in chunks to avoid too-large batches
      const CHUNK_SIZE = 500;
      let updatedCount = 0;
      for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
        const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
        try {
          const res = await Product.bulkWrite(chunk, { ordered: false });
          // Support different result fields across driver/mongoose versions
          const chunkUpdated = (res.modifiedCount || res.nModified || res.modified || 0);
          updatedCount += chunkUpdated;
        } catch (err) {
          // Collect error message; continue with next chunk
          results.errors.push({ row: null, error: `Bulk update chunk error: ${err.message || err}` });
        }
      }

      results.updatedCount = updatedCount;

      const status = results.errors.length && results.updatedCount === 0 ? 400 : 200;
      return NextResponse.json(results, { status });
    }

    // ------------------- SINGLE PRODUCT MAPPING -------------------
    const item_code = (formData.get("item_code") || "").trim();
    const MappingCategory = (formData.get("MappingCategory") || "").trim();

    if (!item_code) {
      return NextResponse.json({ error: "Item code is required." }, { status: 400 });
    }

    if (!MappingCategory) {
      return NextResponse.json({ error: "Mapping category is required." }, { status: 400 });
    }

    const parts = MappingCategory.split(">")
      .map((p) => p.trim())
      .filter(Boolean);
    const partsSlugs = parts.map(p => slugify(p));

    if (parts.length === 0) {
      return NextResponse.json({ error: "Invalid category mapping format." }, { status: 400 });
    }

    let category = null;
    let sub_category = null;
    let category_new = "";
    const subCategoryMd5List = [];
    const subCategoryNameList = [];

    for (let i = 0; i < partsSlugs.length; i++) {
      const catInfo = await Category.findOne({ category_slug: partsSlugs[i] });
      if (!catInfo) continue;
      if (i === 0 && catInfo.md5_cat_name) category_new = catInfo.md5_cat_name;
      if (catInfo.md5_cat_name) subCategoryMd5List.push(catInfo.md5_cat_name);
      if (catInfo.category_name) subCategoryNameList.push(catInfo.category_name);
    }

    const sub_category_new = subCategoryMd5List.join("##");
    const sub_category_new_name = subCategoryNameList.join("##");

    const reversedPartsSlugs = [...partsSlugs].reverse();
    for (let i = 0; i < reversedPartsSlugs.length; i++) {
      const catInfo = await Category.findOne({ category_slug: reversedPartsSlugs[i] });
      if (!catInfo) continue;
      if (i === 0) sub_category = catInfo._id;
      else if (i === 1) category = catInfo._id;
    }

    if (!category || !sub_category || !category_new || !sub_category_new || !sub_category_new_name) {
      return NextResponse.json(
        { error: "Failed to map category. Category or Sub-category not found." },
        { status: 400 }
      );
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { item_code },
      {
        category,
        sub_category,
        category_new,
        sub_category_new,
        sub_category_new_name,
      },
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
        message: "Product category mapping updated successfully.",
        data: updatedProduct,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating product category:", error);
    return NextResponse.json(
      { error: "Failed to update product category.", details: error.message },
      { status: 500 }
    );
  }
}
