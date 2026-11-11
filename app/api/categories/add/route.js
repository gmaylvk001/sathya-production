import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import CategoryFilter from "@/models/ecom_categoryfilters_infos"; // Import the filter model
import { NextResponse } from "next/server";
import md5 from "md5";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminRequest";

function convertSlug(slug) {
  let result = slug.replace(/ /g, "-");
  result = result.replace(/[^A-Za-z0-9\-]/g, "");
  result = result.replace(/-+/g, "-");
  result = result.toLowerCase();
  return result;
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "categories");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const formData = await req.formData();
    const category_name = formData.get("category_name");
    // let parentid = formData.get("parentid") || "none";
    // let parentid_new = "none";
    /* const parent_name = formData.get("parent_name") || "none";
    let parentid = "none";
    let parentid_new = "none";

    if (parent_name !== "none") {
      const parentCategory = await Category.findOne({
        category_name: parent_name,
      });

      if (parentCategory) {
        parentid = parentCategory._id;
        parentid_new = parentCategory.md5_cat_name;
      }
    } */
    const parentid = formData.get("parentid") || "none";
    let parentid_new = "none";

    if (parentid === "none") {
      parentid_new = "none";
    } else {
      const objectId = new mongoose.Types.ObjectId(parentid);
      const getParentCategory = await Category.findOne({ _id: objectId });
      parentid_new = getParentCategory.md5_cat_name;
    }

    const meta_title = formData.get("meta_title");
    const meta_description = formData.get("meta_description");
    const meta_keyword = formData.get("meta_keyword");
    const status = formData.get("status") || "Active";
    const show_on_home = formData.get("show_on_home") || "No";
    const content = formData.get("content") || ""; // ✅ Add content field
    const file = formData.get("image");
    const selectedFilters = formData.get("selectedFilters"); // Get selected filters

    if (!category_name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    let category_slug = convertSlug(category_name);

    if (parentid !== "none") {
      // category_slug = `${category_slug}-${Date.now()}`;
      category_slug = `${category_slug}`;
    }

    let md5_cat_name = md5(category_slug);

    if (parentid === "none") {
      parentid_new = "none";
    } else {
      const objectId = new mongoose.Types.ObjectId(parentid);
      const getParentCategory = await Category.findOne({ _id: objectId });
      parentid_new = getParentCategory.md5_cat_name;
    }

    /*

    if (parentid === "none") {
      const getParentCategory = await Category.findOne({ category_name: parentid });
      parentid = getParentCategory ? getParentCategory._id : "none";
    } else {
      if (parentid.includes(">")) {
        // Example: "Electronics>Mobiles>Samsung"
        const parts = parentid.split(">").map(p => p.trim()).filter(Boolean);
        let foundParent = null;

        for (let i = 0; i < parts.length; i++) {
          const query = i === 0
            ? { category_name: parts[i] }
            : { category_name: parts[i], parentid: foundParent?._id };

          const categoryLevel = await Category.findOne(query);

          if (!categoryLevel) {
            // Stop search if not found
            foundParent = null;
            break;
          }

          foundParent = categoryLevel; // Keep last valid match
        }

        parentid = foundParent ? foundParent._id : md5_cat_name;
      } else {
        // Single level
        const getParentCategory = await Category.findOne({ category_name: parentid });
        parentid = getParentCategory ? getParentCategory._id : md5_cat_name;
      }
    }
    
    */

    /*

    if (parentid_new === "none") {
      const getParentCategory = await Category.findOne({ category_name: parentid_new });
      parentid_new = getParentCategory ? getParentCategory.md5_cat_name : "none";
    } else {
      if (parentid_new.includes(">")) {
        // Example: "Gadgets>Item1>Subitem"
        const parts = parentid_new.split(">").map(p => p.trim()).filter(Boolean);
        let foundParent = null;

        for (let i = 0; i < parts.length; i++) {
          const query = i === 0
            ? { category_name: parts[i] }
            : { category_name: parts[i], parentid_new: foundParent?.md5_cat_name };

          const categoryLevel = await Category.findOne(query);

          if (!categoryLevel) {
            foundParent = null;
            break;
          }

          foundParent = categoryLevel;
        }

        parentid_new = foundParent ? foundParent.md5_cat_name : md5_cat_name;
      } else {
        // Single-level category name
        const getParentCategory = await Category.findOne({ category_name: parentid_new });
        parentid_new = getParentCategory ? getParentCategory.md5_cat_name : md5_cat_name;
      }
    }
    
    */

    // Check if category already exists
    // let existingCategory = await Category.findOne({
    //   category_slug: category_slug,
    //   parentid: parentid,
    //parentid_new: parentid_new
    // });

    let existingCategory = await Category.findOne({
      category_slug,
      parentid_new,
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with the same slug and parent already exists" },
        { status: 400 },
      );
    }

    // Safe file processing - check if file exists and has data
    let image_url = "";
    if (file && typeof file !== "string" && file.name && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public/uploads/categories");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${file.name}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        image_url = `/uploads/categories/${filename}`; // Use relative path instead of localhost
      } catch (fileError) {
        console.error("Error processing image file:", fileError);
      }
    }

    // Handle navImage upload
    let nav_image_url = "";
    const navFile = formData.get("navImage");
    if (
      navFile &&
      typeof navFile !== "string" &&
      navFile.name &&
      navFile.size > 0
    ) {
      try {
        const bytes = await navFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public/uploads/categories");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-nav-${navFile.name}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        nav_image_url = `/uploads/categories/${filename}`;
      } catch (fileError) {
        console.error("Error processing nav image file:", fileError);
      }
    }

    // Handle icon image upload
    let icon_url = "";
    const iconFile = formData.get("icon_image");
    if (iconFile && typeof iconFile !== "string" && iconFile.name && iconFile.size > 0) {
      try {
        const bytes = await iconFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public/uploads/categories");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-icon-${iconFile.name}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        icon_url = `/uploads/categories/${filename}`;
      } catch (fileError) {
        console.error("Error processing icon image file:", fileError);
      }
    }

    // ✅ Create category with content field
    const newCategory = new Category({
      category_name,
      category_slug,
      md5_cat_name,
      parentid,
      parentid_new,
      meta_title,
      meta_description,
      meta_keyword,
      status,
      show_on_home,
      content, // ✅ Add content field here
      image: image_url,
      navImage: nav_image_url,
      icon_url: icon_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("newCat", newCategory);

    await newCategory.save();

    // HANDLE FILTERS FOR NEW CATEGORY
    let filterIds = [];
    if (selectedFilters) {
      try {
        filterIds = JSON.parse(selectedFilters);
        console.log(
          `Adding ${filterIds.length} filters for new category ${newCategory._id}:`,
          filterIds,
        );

        if (filterIds.length > 0) {
          const filterPromises = filterIds.map((filterId) =>
            CategoryFilter.create({
              filter_id: filterId,
              category_id: newCategory._id,
            }),
          );
          await Promise.all(filterPromises);
          console.log(
            `Successfully added ${filterIds.length} filters for category ${newCategory._id}`,
          );
        }
      } catch (error) {
        console.error("Error adding filters:", error);
        // Don't fail the entire creation if filters fail, just log it
      }
    } else {
      console.log("No filters selected for new category");
    }

    if (globalThis.__sathyaCategoriesCache) {
      globalThis.__sathyaCategoriesCache.data = null;
      globalThis.__sathyaCategoriesCache.at = 0;
    }

    return NextResponse.json(
      {
        message: "Category added successfully",
        category: newCategory,
        filtersAdded: filterIds.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding category:", error);
    return NextResponse.json(
      {
        error: "Failed to add category",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
