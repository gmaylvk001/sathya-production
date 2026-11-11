import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import * as XLSX from "xlsx";

import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import crypto from "crypto";
import mongoose from "mongoose";

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
    const rawRows = XLSX.utils.sheet_to_json(sheet);

    const rows = rawRows.map((row) => {
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[key.trim()] = value;
      }
      return normalizedRow;
    });

    console.log("[particularDataBulkupload] Sheet:", workbook.SheetNames[0]);
    console.log("[particularDataBulkupload] Total rows:", rows.length);
    if (rows.length > 0) {
      console.log(
        "[particularDataBulkupload] Column headers:",
        Object.keys(rows[0])
      );
      console.log("[particularDataBulkupload] First row:", rows[0]);
    }

    let updated = 0;
    let skipped = 0;
    const skipDetails = [];

    /* ---------- HELPERS ---------- */

    const normalize = (val) => {
      if (val === undefined || val === null) return "";
      return val.toString().trim().replace(/\s+/g, " ");
    };

    const isPlaceholderCategory = (val) =>
      !val ||
      ["no category", "no subcategory", "no childcategory", "-", "n/a"].includes(
        val.toLowerCase()
      );

    const getRowValue = (row, keys) => {
      for (const key of keys) {
        const value = normalize(row[key]);
        if (value) return value;
      }
      return "";
    };

    const escapeRegex = (str) =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const isValidObjectId = (id) =>
      mongoose.Types.ObjectId.isValid(id);

    /* ---------- LOOP ---------- */

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 2; // Excel row number (header is row 1)

      const itemCode = getRowValue(row, [
        "Item No.",
        "Item No",
        "ITEM NO.",
        "Item Code",
        "item_code",
        "item code",
      ]);

      const mainCategoryName = getRowValue(row, ["Category", "category"]);
      const subCategoryName = getRowValue(row, [
        "Subcategory",
        "Sub Category",
        "sub_category",
        "sub category",
      ]);
      const childCategoryName = getRowValue(row, [
        "Childcategory",
        "Child Category",
        "childcategory",
        "child category",
      ]);

      const childName = [
        childCategoryName,
        subCategoryName,
        mainCategoryName,
      ].find((name) => !isPlaceholderCategory(name));
      const productName = getRowValue(row, ["Product Name", "product name"]);
      const size = getRowValue(row, ["Size", "size"]);
      const brand = getRowValue(row, ["Brand", "brand"]);
      const star = getRowValue(row, ["Star", "star"]);
      const description = getRowValue(row, ["Description", "description"]);
      const keyFeatures = getRowValue(row, ["Key Features", "key features"]);

      if (!itemCode || !childName) {
        const reason = !itemCode
          ? "Missing item code (expected column: Item No.)"
          : "Missing category (expected: Childcategory, Subcategory, or Category)";

        console.log(
          `[particularDataBulkupload] SKIPPED row ${rowNumber}:`,
          reason,
          { itemCode, mainCategoryName, subCategoryName, childCategoryName, row }
        );

        skipDetails.push({ row: rowNumber, itemCode: itemCode || null, reason });
        skipped++;
        continue;
      }

      console.log(
        "[particularDataBulkupload] Processing row",
        rowNumber,
        ":",
        itemCode,
        childName
      );

      /* =========================================================
         FIND CATEGORY
         ========================================================= */

      const childCategory = await Category.findOne({
        category_name: {
          $regex: escapeRegex(childName),
          $options: "i",
        },
      });

      if (!childCategory) {
        const reason = `Category not found in DB: "${childName}"`;

        console.log(
          `[particularDataBulkupload] SKIPPED row ${rowNumber}:`,
          reason,
          { itemCode, mainCategoryName, subCategoryName, childCategoryName }
        );

        skipDetails.push({ row: rowNumber, itemCode, reason });
        skipped++;
        continue;
      }

      /*
        CASE 1:
        Main Category -> Subcategory -> Child Category
      */

      let mainCategory = null;
      let subCategory = null;

      // child category has valid parent
      if (
        childCategory.parentid &&
        childCategory.parentid !== "none" &&
        isValidObjectId(childCategory.parentid)
      ) {
        subCategory = await Category.findById(childCategory.parentid);

        if (subCategory) {
          /*
            sub category has valid parent
            => full 3 level category
          */
          if (
            subCategory.parentid &&
            subCategory.parentid !== "none" &&
            isValidObjectId(subCategory.parentid)
          ) {
            mainCategory = await Category.findById(subCategory.parentid);
          }

          /*
            CASE 2:
            Main Category -> Subcategory only

            subCategory parent invalid/none
            => childCategory itself is subcategory
          */
          if (!mainCategory) {
            mainCategory = subCategory;
            subCategory = childCategory;
          }
        }
      }

      /*
        CASE 3:
        Only Main Category
      */
      if (!subCategory && !mainCategory) {
        mainCategory = childCategory;
      }

      if (!mainCategory) {
        const reason = "Main category could not be resolved from hierarchy";

        console.log(
          `[particularDataBulkupload] SKIPPED row ${rowNumber}:`,
          reason,
          { itemCode, childName }
        );

        skipDetails.push({ row: rowNumber, itemCode, reason });
        skipped++;
        continue;
      }

      /* =========================================================
         BUILD CATEGORY CHAINS
         ========================================================= */

      let subCategoryNew = mainCategory.md5_cat_name;
      let subCategoryNameFull = mainCategory.category_name;
      let subCategoryId = mainCategory._id;

      // if subcategory available
      if (subCategory) {
        subCategoryNew = [
          mainCategory.md5_cat_name,
          subCategory.md5_cat_name,
        ].join("##");

        subCategoryNameFull = [
          mainCategory.category_name,
          subCategory.category_name,
        ].join("##");

        subCategoryId = subCategory._id;
      }

      // if child category available (3 level)
      if (
        childCategory &&
        subCategory &&
        childCategory._id.toString() !== subCategory._id.toString()
      ) {
        subCategoryNew = [
          mainCategory.md5_cat_name,
          subCategory.md5_cat_name,
          childCategory.md5_cat_name,
        ].join("##");

        subCategoryNameFull = [
          mainCategory.category_name,
          subCategory.category_name,
          childCategory.category_name,
        ].join("##");

        subCategoryId = childCategory._id;
      }

      /* =========================================================
         KEY FEATURES
         ========================================================= */

      const keySpecsArray = keyFeatures
        ? keyFeatures.split(",").map((x) => x.trim())
        : [];

      let brandId = null;

      if (brand) {
        const brandDoc = await Brand.findOne({
          brand_name: {
            $regex: `^${escapeRegex(brand)}$`,
            $options: "i",
          },
        });

        if (!brandDoc) {
          console.log("❌ Brand not found:", brand);
        } else {
          brandId = brandDoc._id;
        }
      }

      /* =========================================================
         UPDATE DATA
         ========================================================= */

      const updateData = {
        category_new: mainCategory.md5_cat_name,
        sub_category_new: subCategoryNew,
        sub_category_new_name: subCategoryNameFull,
        sub_category: subCategoryId,
      };

      if (brandId) {
        updateData.brand = brandId;
      }

      /*
        PRODUCT NAME + SLUG + MD5
      */

      if (productName) {
        const name = productName.trim();

        updateData.name = name;

        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

        updateData.slug = slug;

        const md5Name = crypto
          .createHash("md5")
          .update(slug)
          .digest("hex");

        updateData.md5_name = md5Name;
      }

      if (size) updateData.size = size;
      if (star) updateData.star = star;
      if (description) updateData.description = description;

      if (keySpecsArray.length > 0) {
        updateData.key_specifications = keySpecsArray;
      }

      console.log(
        `[particularDataBulkupload] Row ${rowNumber} update data:`,
        updateData
      );

      /* =========================================================
         UPDATE PRODUCT
         ========================================================= */

      const result = await Product.updateOne(
        { item_code: itemCode },
        {
          $set: {
            ...updateData,
            item_code: itemCode,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(
          `[particularDataBulkupload] Created new product row ${rowNumber}:`,
          itemCode
        );
        updated++;
      } else if (result.matchedCount > 0) {
        console.log(
          `[particularDataBulkupload] Updated product row ${rowNumber}:`,
          itemCode
        );
        updated++;
      } else {
        const reason = "Product update did not match or create any record";

        console.log(
          `[particularDataBulkupload] SKIPPED row ${rowNumber}:`,
          reason,
          { itemCode, result }
        );

        skipDetails.push({ row: rowNumber, itemCode, reason });
        skipped++;
      }
    }

    console.log("[particularDataBulkupload] Result:", {
      total: rows.length,
      updated,
      skipped,
      skipDetails,
    });

    return NextResponse.json({
      success: true,
      total: rows.length,
      updated,
      skipped,
      skipDetails,
      detectedHeaders: rows.length > 0 ? Object.keys(rows[0]) : [],
    });
  } catch (error) {
    console.error("❌ Upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}