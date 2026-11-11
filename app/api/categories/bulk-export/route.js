import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

import Category from "@/models/ecom_category_info";
import CategoryFilter from "@/models/ecom_categoryfilters_infos";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

import * as XLSX from "xlsx";

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
      const categoryName = normalize(row["Category"]);
      const subCategoryName = normalize(row["Sub Category"]);
      const filterGroupName = normalize(row["Filter Group"]);
      const filterValue = normalize(row["Filter Value"]);

      if (!categoryName || !filterGroupName || !filterValue) {
        skipped++;
        continue;
      }

      /* ---------- FIND CATEGORY ---------- */
      let category = null;
      let parent = null;

      if (subCategoryName && subCategoryName !== "-") {
        parent = await Category.findOne({
          category_name: { $regex: `^${categoryName}$`, $options: "i" },
        });

        if (!parent) {
          skipped++;
          continue;
        }

        category = await Category.findOne({
          category_name: { $regex: `^${subCategoryName}$`, $options: "i" },
          parentid: parent._id,
        });
      } else {
        category = await Category.findOne({
          category_name: { $regex: `^${categoryName}$`, $options: "i" },
        });
      }

      if (!category) {
        skipped++;
        continue;
      }

      /* ---------- FIND FILTER GROUP ---------- */
      const filterGroup = await FilterGroup.findOne({
        filtergroup_name: { $regex: `^${filterGroupName}$`, $options: "i" },
      });

      if (!filterGroup) {
        skipped++;
        continue;
      }

      /* ---------- FIND FILTER ---------- */
      const filter = await Filter.findOne({
        filter_group: filterGroup._id,
        filter_name: { $regex: `^${filterValue}$`, $options: "i" },
      });

      if (!filter) {
        skipped++;
        continue;
      }

      /* ---------- BUILD CATEGORY LIST ---------- */
      const categoriesToUpdate = [];

      categoriesToUpdate.push(category); // sub or main

      if (parent) {
        categoriesToUpdate.push(parent); // parent also
      }

      // remove duplicates
      const uniqueCategories = [
        ...new Map(
          categoriesToUpdate.map((c) => [c._id.toString(), c])
        ).values(),
      ];

      /* ---------- INSERT CATEGORY FILTERS ---------- */
      for (const cat of uniqueCategories) {
        const exists = await CategoryFilter.findOne({
          category_id: cat._id,
          filter_id: filter._id,
        });

        if (exists) {
          skipped++;
          continue;
        }

        await CategoryFilter.create({
          category_id: cat._id,
          filter_id: filter._id,
        });

        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bulk upload completed",
      updated,
      skipped,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 }
    );
  }
}
