import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import CategoryFilter from "@/models/ecom_categoryfilters_infos"; // Import the new model
import { NextResponse } from "next/server";
import md5 from "md5";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminRequest";

function convertSlug(slug) {
  let result = slug.replace(/ /g, "-"); // replace spaces with hyphens
  result = result.replace(/[^A-Za-z0-9\-]/g, ""); // remove special chars
  result = result.replace(/-+/g, "-"); // collapse multiple hyphens
  result = result.toLowerCase();
  return result;
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req, "categories");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    // Parse formData
    const formData = await req.formData();
    const _id = formData.get("_id");
    const category_name = formData.get("category_name");
    const meta_title = formData.get("meta_title");
    const meta_description = formData.get("meta_description");
    const meta_keyword = formData.get("meta_keyword");
    let parentid = formData.get("parentid") || "none";
    let parentid_new = "none";
    const status = formData.get("status") || "Active";
    const content = formData.get("content") || ""; // ✅ Add content field
    const file = formData.get("image");
    const existingImage = formData.get("existingImage")?.replace(/^https?:\/\/[^/]+/, "") || null;
     const navFile = formData.get("navImage");
     const existingNavImage = formData.get("existingNavImage")?.replace(/^https?:\/\/[^/]+/, "") || null;
     const iconFile = formData.get("icon_image");
    const existingIconImage = formData.get("existingIconImage") || null;
    const selectedFilters = formData.get("selectedFilters"); // Get selected filters

    if (!_id || !category_name) {
      return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 });
    }

    // Find the existing category  
    
    const existingCategory = await Category.findById(_id);
    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if new category name already exists (excluding current category)
    let category_slug = convertSlug(category_name);
    const md5_cat_name = md5(category_slug);
    
    if (parentid === "none") {
        parentid_new = "none";
    }
    else
    {
        const objectId = new mongoose.Types.ObjectId(parentid);
        const getParentCategory = await Category.findOne({ _id: objectId });
        parentid_new = getParentCategory.md5_cat_name;
    }

    const duplicateCategory = await Category.findOne({
      category_slug,
      _id: { $ne: _id } // Exclude current category from check
    });

    if (duplicateCategory) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
    }

    // Handle image upload/update
    let image_url = existingImage;

    if (file) {
      // Delete old image if it exists
      if (existingImage) {
        try {
          const oldImagePath = path.join(
            process.cwd(),
            "public",
            existingImage.replace("http://localhost:3000", "")
          );
          await unlink(oldImagePath);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }

      // Save new image
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public/uploads/categories");
      await mkdir(uploadDir, { recursive: true });
      const fileName = `category_${Date.now()}${path.extname(file.name)}`;
      await writeFile(path.join(uploadDir, fileName), buffer);
      image_url = `/uploads/categories/${fileName}`;
    }
    // Handle navImage upload/update BEFORE updating category
    // const existingNavImage = formData.get("existingNavImage");
    let nav_image_url = existingNavImage;
    //  const navFile = formData.get("navImage");
    if (navFile) {
      if (nav_image_url) {
        try {
          const oldNavImagePath = path.join(
            process.cwd(),
            "public",
            nav_image_url.replace("http://localhost:3000","")
          );
          await unlink(oldNavImagePath);
        } catch (err) {
          console.error("Error deleting old navImage:", err);
        }
      }
      const buffer = Buffer.from(await navFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public/uploads/categories");
      await mkdir(uploadDir, { recursive: true });
      const fileName = `category_nav_${Date.now()}${path.extname(navFile.name)}`;
      await writeFile(path.join(uploadDir, fileName), buffer);
      nav_image_url = `/uploads/categories/${fileName}`;
      console.log('nav_image_url:',nav_image_url);
    }
       // Handle icon image upload/update
let icon_url = existingIconImage;
if (iconFile && typeof iconFile !== "string" && iconFile.name && iconFile.size > 0) {
  if (existingIconImage) {
    try {
      const oldIconPath = path.join(process.cwd(), "public", existingIconImage);
      await unlink(oldIconPath);
    } catch (err) {
      console.error("Error deleting old icon image:", err);
    }
  }
  const buffer = Buffer.from(await iconFile.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public/uploads/categories");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `category_icon_${Date.now()}${path.extname(iconFile.name)}`;
  await writeFile(path.join(uploadDir, fileName), buffer);
  icon_url = `/uploads/categories/${fileName}`;
}
    // UPDATE FILTERS LOGIC - Same as product filters
    let filterIds = [];
    if (selectedFilters) {
      try {
        filterIds = JSON.parse(selectedFilters);
        
        // Remove existing filters for this category
        await CategoryFilter.deleteMany({ category_id: _id });
        
        // Add new filters if any are selected
        if (filterIds.length > 0) {
          const filterPromises = filterIds.map(filterId => 
            CategoryFilter.create({
              filter_id: filterId,
              category_id: _id
            })
          );
          await Promise.all(filterPromises);
          console.log(`Updated ${filterIds.length} filters for category ${_id}`);
        }
      } catch (error) {
        console.error("Error updating filters:", error);
        // Don't fail the entire update if filters fail, just log it
      }
    } else {
      // If no filters are provided, remove all existing filters
      await CategoryFilter.deleteMany({ category_id: _id });
      console.log(`Removed all filters for category ${_id}`);
    }

    // ✅ Update category with content and other fields
    const updatedCategory = await Category.findByIdAndUpdate(
      _id,
      {
        category_name,
        category_slug,
        // md5_cat_name,
        meta_title,
      meta_description,
      meta_keyword,
        parentid,
        parentid_new,
        status,
        content, // ✅ Add content field here
        image: image_url,
        navImage: nav_image_url,
        icon_url: icon_url,
        updatedAt: new Date(),
      },
      { new: true }
    ); 

    if (!updatedCategory) {
      return NextResponse.json({ error: "Failed to update category" }, { status: 400 });
    }

    if (globalThis.__sathyaCategoriesCache) {
      globalThis.__sathyaCategoriesCache.data = null;
      globalThis.__sathyaCategoriesCache.at = 0;
    }

    return NextResponse.json(
      {
        message: "Category updated successfully",
        category: updatedCategory
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category", details: error.message },
      { status: 500 }
    );
  }
}