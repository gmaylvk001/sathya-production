import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import * as XLSX from "xlsx";

import Product from "@/models/product";
import Category from "@/models/ecom_category_info";

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

    const normalize = (val) =>
      val?.toString().trim().replace(/\s+/g, " ");

for (const row of rows) {
  const itemCode = normalize(
    row["item_code"] || row["Item Code"] || row["item code"]
  );

  const subCategoryName = normalize(
    row["category"] || row["Category"]
  ); // Air Conditioner

  const childName = normalize(
    row["sub_category"] || row["Sub Category"]
  ); // Split AC

  if (!itemCode || !subCategoryName || !childName) {
    skipped++;
    continue;
  }

  /* ---------- FIND PRODUCT ---------- */
  const product = await Product.findOne({ item_code: itemCode });

  if (!product) {
    skipped++;
    continue;
  }

/* ---------- FIND CATEGORY ---------- */
const selectedCategory = await Category.findOne({
  category_name: { $regex: `^${childName}$`, $options: "i" },
});

if (!selectedCategory) {
  skipped++;
  continue;
}

let mainCategory = null;
let subCategory = null;
let childCategory = null;

const inputCategory = subCategoryName.toLowerCase();

/* =========================================================
   CASE 1:
   SMALL APPLIANCE -> FABRIC CARE
========================================================= */

if (
  selectedCategory.parentid &&
  selectedCategory.parentid !== "none"
) {
  const parentCategory = await Category.findById(
    selectedCategory.parentid
  );

  if (!parentCategory) {
    skipped++;
    continue;
  }

  // parent is main category
  if (
    parentCategory.category_name.toLowerCase() === inputCategory
  ) {
    mainCategory = parentCategory;
    subCategory = selectedCategory;
  }

  // parent is sub category
  else {
    const grandParent =
      parentCategory.parentid &&
      parentCategory.parentid !== "none"
        ? await Category.findById(parentCategory.parentid)
        : null;

    if (
      grandParent &&
      grandParent.category_name.toLowerCase() === inputCategory
    ) {
      mainCategory = grandParent;
      subCategory = parentCategory;
      childCategory = selectedCategory;
    }
  }
}

if (!mainCategory || !subCategory) {
  skipped++;
  continue;
}

/* ---------- BUILD MD5 CHAIN ---------- */
const md5Parts = [
  mainCategory.md5_cat_name,
  subCategory.md5_cat_name,
];

if (childCategory) {
  md5Parts.push(childCategory.md5_cat_name);
}

const subCategoryNew = md5Parts.join("##");

/* ---------- BUILD NAME CHAIN ---------- */
const nameParts = [
  mainCategory.category_name,
  subCategory.category_name,
];

if (childCategory) {
  nameParts.push(childCategory.category_name);
}

const subCategoryNameFull = nameParts.join("##");

  /* ---------- UPDATE ---------- */
  await Product.updateMany(
    { _id: product._id },
    {
      category_new: mainCategory.md5_cat_name,     // ✅ MAIN
      sub_category_new: subCategoryNew,            // ✅ MD5 chain
      sub_category_new_name: subCategoryNameFull,      // ✅ NAME chain
      // sub_category: childCategory._id,             // ✅ CHILD ID
      sub_category: childCategory
  ? childCategory._id
  : subCategory._id,
    }
  );

  updated++;
}
    return NextResponse.json({
      success: true,
      message: "Bulk upload completed",
      updated,
      skipped,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}