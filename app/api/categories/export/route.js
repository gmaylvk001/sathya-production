import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

import Category from "@/models/ecom_category_info";
import CategoryFilter from "@/models/ecom_categoryfilters_infos";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

import * as XLSX from "xlsx";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const startDate = searchParams.get("startDate")?.trim() || "";
    const endDate = searchParams.get("endDate")?.trim() || "";

    // 1. Fetch all categories for lookup and hierarchy reconstruction
    const allCategories = await Category.find({}).lean();
    if (!allCategories || allCategories.length === 0) {
      throw new Error("No categories found in database");
    }

    const allCategoryMap = {};
    const byId = new Map();
    const byMd5 = new Map();
    const byName = new Map();

    for (const cat of allCategories) {
      const idStr = cat._id ? String(cat._id) : "";
      if (idStr) {
        byId.set(idStr, cat);
        allCategoryMap[idStr] = cat;
      }
      if (cat.md5_cat_name) byMd5.set(String(cat.md5_cat_name), cat);
      if (cat.category_name) byName.set(cat.category_name.trim().toLowerCase(), cat);
    }

    const findParent = (cat) => {
      if (!cat) return null;
      const pid = cat.parentid ? String(cat.parentid).trim() : "";
      if (!pid || pid === "none" || pid === "0" || pid === "null" || pid === "undefined") {
        return null;
      }

      // 1. Direct _id match
      if (byId.has(pid)) {
        const p = byId.get(pid);
        if (String(p._id) !== String(cat._id)) return p;
      }

      // 2. parentid_new (md5) match
      const pidNew = cat.parentid_new ? String(cat.parentid_new).trim() : "";
      if (pidNew && pidNew !== "none" && byMd5.has(pidNew)) {
        const p = byMd5.get(pidNew);
        if (String(p._id) !== String(cat._id)) return p;
      }

      // 3. md5 match on parentid itself
      if (byMd5.has(pid)) {
        const p = byMd5.get(pid);
        if (String(p._id) !== String(cat._id)) return p;
      }

      // 4. Case-insensitive category_name match fallback
      const lowerPid = pid.toLowerCase();
      if (byName.has(lowerPid)) {
        const p = byName.get(lowerPid);
        if (String(p._id) !== String(cat._id)) return p;
      }

      return null;
    };

    const getAncestors = (cat) => {
      const chain = [];
      let current = cat;
      const visited = new Set([String(cat._id)]);

      while (current) {
        const parent = findParent(current);
        if (!parent) break;
        const pIdStr = String(parent._id);
        if (visited.has(pIdStr)) break; // avoid loops
        visited.add(pIdStr);
        chain.unshift(parent); // oldest ancestor first: [Parent, Sub, ...]
        current = parent;
      }
      return chain;
    };

    // Helper filter functions
    const matchesStatus = (cat) => {
      if (!status) return true;
      if (!cat?.status) return false;
      return cat.status.toLowerCase() === status.toLowerCase();
    };

    const matchesDate = (cat) => {
      if (!startDate || !endDate) return true;
      if (!cat?.createdAt) return false;
      const catDate = new Date(cat.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return catDate >= start && catDate <= end;
    };

    const matchesSearch = (names) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return names.some((name) => name && name.toLowerCase().includes(s));
    };

    // Collect categories hierarchy:
    // 1st column: Child Category
    // 2nd column: Sub Category
    // 3rd column: Parent Category
    // Export every category whether it has children or not into corresponding columns
    const hierarchyRows = [];
    const coveredSubCategoryIds = new Set();
    const coveredParentCategoryIds = new Set();

    // 1. Level 2+ child categories (Main -> Sub -> Child)
    for (const cat of allCategories) {
      const chain = getAncestors(cat);

      if (chain.length >= 2) {
        const parentCategory = chain[0];
        const subCategory = chain[1] || chain[chain.length - 1];

        if (!matchesStatus(cat)) continue;
        if (!matchesDate(cat)) continue;
        if (
          !matchesSearch([
            cat.category_name,
            subCategory.category_name,
            parentCategory.category_name,
          ])
        ) {
          continue;
        }

        coveredSubCategoryIds.add(String(subCategory._id));
        coveredParentCategoryIds.add(String(parentCategory._id));

        hierarchyRows.push({
          "Child Category": cat.category_name || "-",
          "Sub Category": subCategory.category_name || "-",
          "Parent Category": parentCategory.category_name || "-",
        });
      }
    }

    // 2. Level 1 subcategories that were not covered by child categories
    // (e.g. subcategory has no child, or all its children were filtered out)
    for (const cat of allCategories) {
      const chain = getAncestors(cat);

      if (chain.length === 1) {
        const catIdStr = String(cat._id);
        if (coveredSubCategoryIds.has(catIdStr)) {
          continue;
        }

        const parentCategory = chain[0];

        if (!matchesStatus(cat)) continue;
        if (!matchesDate(cat)) continue;
        if (
          !matchesSearch([
            cat.category_name,
            parentCategory.category_name,
          ])
        ) {
          continue;
        }

        coveredParentCategoryIds.add(String(parentCategory._id));

        hierarchyRows.push({
          "Child Category": "-",
          "Sub Category": cat.category_name || "-",
          "Parent Category": parentCategory.category_name || "-",
        });
      }
    }

    // 3. Level 0 main categories that were not covered by any subcategory or child category
    // (e.g. main category has no subcategories, or all were filtered out)
    for (const cat of allCategories) {
      const chain = getAncestors(cat);

      if (chain.length === 0) {
        const catIdStr = String(cat._id);
        if (coveredParentCategoryIds.has(catIdStr)) {
          continue;
        }

        if (!matchesStatus(cat)) continue;
        if (!matchesDate(cat)) continue;
        if (!matchesSearch([cat.category_name])) {
          continue;
        }

        hierarchyRows.push({
          "Child Category": "-",
          "Sub Category": "-",
          "Parent Category": cat.category_name || "-",
        });
      }
    }

    // Sort hierarchy rows alphabetically: Parent Category -> Sub Category -> Child Category
    hierarchyRows.sort((a, b) => {
      const p = (a["Parent Category"] || "").localeCompare(b["Parent Category"] || "");
      if (p !== 0) return p;
      const s = (a["Sub Category"] || "").localeCompare(b["Sub Category"] || "");
      if (s !== 0) return s;
      return (a["Child Category"] || "").localeCompare(b["Child Category"] || "");
    });

    // 2. Fetch Category Filters for detailed sheet
    const categoryIds = allCategories.map((c) => String(c._id));
    const categoryFilters =
      categoryIds.length > 0
        ? await CategoryFilter.find({
            category_id: { $in: categoryIds },
          }).lean()
        : [];

    const filterIds = [
      ...new Set(categoryFilters.map((cf) => cf.filter_id).filter(Boolean)),
    ];
    const filters =
      filterIds.length > 0
        ? await Filter.find({ _id: { $in: filterIds } }).lean()
        : [];
    const filterMap = {};
    filters.forEach((f) => {
      filterMap[f._id.toString()] = f;
    });

    const filterGroupIds = [
      ...new Set(filters.map((f) => f.filter_group).filter(Boolean)),
    ];
    const filterGroups =
      filterGroupIds.length > 0
        ? await FilterGroup.find({ _id: { $in: filterGroupIds } }).lean()
        : [];
    const filterGroupMap = {};
    filterGroups.forEach((g) => {
      filterGroupMap[g._id.toString()] = g.filtergroup_name || "";
    });

    // Group assigned filters per category
    const categoryAssignedFilters = {};
    categoryFilters.forEach((cf) => {
      const filter = filterMap[cf.filter_id];
      if (!filter) return;
      const groupName = filterGroupMap[filter.filter_group] || "Filter";
      if (!categoryAssignedFilters[cf.category_id]) {
        categoryAssignedFilters[cf.category_id] = [];
      }
      categoryAssignedFilters[cf.category_id].push(
        `${groupName}: ${filter.filter_name}`
      );
    });

    // Build filter query for Category list
    const query = {};
    if (search) {
      query.$or = [
        { category_name: { $regex: search, $options: "i" } },
        { category_slug: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = { $regex: `^${status}$`, $options: "i" };
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const filteredCategories = await Category.find(query)
      .sort({ position: 1, createdAt: -1 })
      .lean();

    const categoryRows = filteredCategories.map((cat) => {
      let parentName = "None";
      let categoryType = "Main Category";

      const parent = findParent(cat);
      if (parent) {
        parentName = parent.category_name || "None";
      }

      const chain = getAncestors(cat);
      if (chain.length === 0) {
        categoryType = "Main Category";
      } else if (chain.length === 1) {
        categoryType = "Sub Category";
      } else {
        categoryType = "Child Category";
      }

      const assignedFilters = (
        categoryAssignedFilters[cat._id.toString()] || []
      ).join(" | ");

      return {
        "Category Name": cat.category_name || "",
        "Category Slug": cat.category_slug || "",
        "Parent Category": parentName,
        "Type": categoryType,
        "Status": cat.status || "Active",
        "Position": cat.position ?? 0,
        "Image": cat.image || "",
        "Nav Image": cat.navImage || "",
        "Icon Image": cat.icon_url || "",
        "Meta Title":
          cat.meta_title && cat.meta_title !== "none" ? cat.meta_title : "",
        "Meta Description":
          cat.meta_description && cat.meta_description !== "none"
            ? cat.meta_description
            : "",
        "Meta Keyword":
          cat.meta_keyword && cat.meta_keyword !== "none"
            ? cat.meta_keyword
            : "",
        "Content": cat.content || "",
        "Assigned Filters": assignedFilters,
        "Created Date": cat.createdAt
          ? new Date(cat.createdAt).toISOString().split("T")[0]
          : "",
      };
    });

    const filterRows = [];
    categoryFilters.forEach((cf) => {
      const category = allCategoryMap[cf.category_id];
      const filter = filterMap[cf.filter_id];
      if (!category || !filter) return;

      const chain = getAncestors(category);
      let categoryName = "-";
      let subCategoryName = "-";

      if (chain.length >= 2) {
        categoryName = chain[0].category_name || "-";
        subCategoryName = chain[1]?.category_name || chain[chain.length - 1]?.category_name || "-";
      } else if (chain.length === 1) {
        categoryName = chain[0].category_name || "-";
        subCategoryName = category.category_name || "-";
      } else {
        categoryName = category.category_name || "-";
        subCategoryName = "-";
      }

      filterRows.push({
        "Category": categoryName,
        "Sub Category": subCategoryName,
        "Filter Group": filterGroupMap[filter.filter_group] || "-",
        "Filter Value": filter.filter_name || "-",
      });
    });

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Child Categories (1st col: Child, 2nd col: Sub, 3rd col: Parent)
    const excelHierarchyData = hierarchyRows.length > 0 ? hierarchyRows : [
      {
        "Child Category": "No categories found",
        "Sub Category": "",
        "Parent Category": "",
      }
    ];
    const hierarchySheet = XLSX.utils.json_to_sheet(excelHierarchyData);
    hierarchySheet["!cols"] = [
      { wch: 35 }, // Child Category
      { wch: 30 }, // Sub Category
      { wch: 30 }, // Parent Category
    ];
    XLSX.utils.book_append_sheet(workbook, hierarchySheet, "Child Categories");

    // Sheet 2: All Categories
    if (categoryRows.length > 0) {
      const categorySheet = XLSX.utils.json_to_sheet(categoryRows);
      XLSX.utils.book_append_sheet(workbook, categorySheet, "All Categories");
    }

    // Sheet 3: Category Filters
    if (filterRows.length > 0) {
      const filterSheet = XLSX.utils.json_to_sheet(filterRows);
      XLSX.utils.book_append_sheet(workbook, filterSheet, "Category Filters");
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="categories_export_${today}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, message: `Export failed: ${error.message}` },
      { status: 500 }
    );
  }
}
